# Ridgeback–Franka Lab — Handbook tiếng Việt

Tài liệu này giải thích toàn bộ quá trình phát triển của dự án từ commit đầu tiên đến trạng thái hiện tại, đồng thời mô tả kiến trúc, component, hook, function và các quyết định kỹ thuật quan trọng.

> Phạm vi được đối chiếu theo lịch sử Git đến commit `7897d53`, gồm tổng cộng 20 commit. Phần giải thích component/function được đối chiếu thêm với source hiện tại.

## 1. Dự án này làm gì?

Ridgeback–Franka Lab là một mô phỏng robot chạy trên trình duyệt gồm hai chế độ:

1. **Drive**: điều khiển mobile base bằng phím mũi tên, mô phỏng vận tốc tuyến tính, vận tốc góc, gia tốc và vận tốc hai bánh.
2. **Manipulator**: điều khiển sáu khớp của cánh tay robot, quan sát forward kinematics và vị trí TCP trong không gian 3D.

Dự án dùng:

- React + TypeScript cho UI và state;
- Three.js làm engine 3D;
- React Three Fiber (R3F) để biểu diễn scene Three.js bằng React component;
- Drei cung cấp helper như `OrbitControls`, `Grid`, `Line`, `Html` và `useGLTF`;
- React Router để chuyển giữa hai trang;
- Vitest để kiểm thử phần toán học của hệ truyền động;
- Vite để chạy development server và build production.

Đây là **mô phỏng học tập**, không phải bộ điều khiển robot thật và không phải hệ thống an toàn đạt chứng nhận.

## 2. Bản đồ source hiện tại

```text
src/
├── main.tsx                   điểm khởi động React
├── App.tsx                    router, navigation, lazy loading
├── components/
│   ├── World.tsx              môi trường 3D dùng chung
│   ├── RobotModel.tsx         tải GLB và xoay các link robot
│   └── Metric.tsx             ô hiển thị một telemetry value
├── config/
│   └── joints.ts              tên, trục và giới hạn sáu khớp
├── hooks/
│   └── useKeyboardDrive.ts    theo dõi trạng thái phím
├── lib/
│   ├── drive.ts               mô hình differential drive thuần
│   └── drive.test.ts          unit test cho drive.ts
├── pages/
│   ├── DrivePage.tsx          simulation loop và dashboard lái
│   └── ManipulatorPage.tsx    slider khớp và TCP
└── styles.css                 layout và responsive styling
```

Luồng tổng quát:

```text
main.tsx
  └─ BrowserRouter
      └─ App
          ├─ /drive ────────── DrivePage
          │                     └─ Canvas → World → DriveSimulation → RobotModel
          └─ /manipulator ──── ManipulatorPage
                                └─ Canvas → World → ManipulatorScene → RobotModel
```

`RobotModel` và `World` được dùng lại ở cả hai trang. Phần toán drive được tách khỏi React nên có thể kiểm thử mà không cần render WebGL.

## 3. Lịch sử 20 commit

### Commit 01 — `8725640`: scaffold Vite + React + TypeScript

Commit đầu tạo bộ khung tiêu chuẩn của Vite:

- `index.html` chứa DOM root;
- `src/main.tsx` mount React vào root;
- `src/App.tsx` là component mẫu ban đầu;
- TypeScript, ESLint và Vite config;
- các script `dev`, `build`, `lint`.

Ý nghĩa chính là thiết lập toolchain. Ở giai đoạn này chưa có robot, router hay Three.js.

### Commit 02 — `a309224`: app shell và hai route

Template mặc định được thay bằng cấu trúc ứng dụng thật:

- thêm `BrowserRouter`, `Routes`, `Route`, `NavLink`;
- tạo route `/drive` và `/manipulator`;
- thêm top navigation và layout chung;
- cài React Three Fiber, Drei, Three.js và React Router;
- dùng `React.lazy()` và `<Suspense>` để chia bundle theo trang.

Tại sao dùng lazy loading? Người vào `/drive` chưa cần tải code riêng của trang manipulator. `Suspense` hiển thị fallback trong thời gian chunk được tải:

```tsx
const DrivePage = lazy(() =>
  import('./pages/DrivePage').then((module) => ({ default: module.DrivePage })),
)
```

Do page được export theo tên, `.then(...)` chuyển named export thành dạng `{ default: ... }` mà `lazy()` yêu cầu.

### Commit 03 — `7f292a0`: scene 3D và GLB robot

Commit này đưa robot vào browser:

- thêm file GLB;
- tạo `World` với ánh sáng, grid, fog và camera controls;
- tạo `RobotModel` dùng `useGLTF()`;
- render `<Canvas>` trong hai page.

Phân chia trách nhiệm rất quan trọng:

- `Canvas` tạo renderer, scene và camera;
- `World` tạo môi trường dùng chung;
- `RobotModel` chỉ chịu trách nhiệm model robot.

### Commit 04 — `525ae5f`: mô hình vận tốc differential drive

Thêm `src/lib/drive.ts` và unit tests đầu tiên. Phần toán được viết dưới dạng pure functions:

- đổi linear/angular velocity thành tốc độ bánh trái/phải;
- đổi ngược wheel speed về linear/angular velocity;
- clamp vận tốc theo giới hạn;
- cập nhật pose `x`, `z`, `yaw` theo thời gian.

Tách logic này khỏi component mang lại ba lợi ích: dễ test, không phụ thuộc FPS/UI và có thể tái sử dụng cho nguồn input khác.

### Commit 05 — `8229af6`: acceleration ramp

Nếu vận tốc nhảy ngay từ 0 lên tối đa, robot nhìn không tự nhiên. Commit này thêm hàm `approach()` để vận tốc tiến dần tới target theo gia tốc giới hạn.

Ví dụ:

```text
current = 0.00 m/s
target  = 1.50 m/s
max acceleration = 0.90 m/s²
dt = 0.10 s
next = 0.09 m/s
```

Khi nhả phím, cùng cơ chế đó làm robot giảm tốc thay vì dừng tức thời.

### Commit 06 — `f82b98a`: keyboard drive và simulation loop

Commit nối input, physics và hình ảnh:

- `useKeyboardDrive()` theo dõi Arrow keys;
- `useFrame()` chạy mỗi frame trong Canvas;
- `stepDrive()` tạo state mới;
- group chứa robot được cập nhật `position` và `rotation.y`.

Mapping input:

```text
throttle = ArrowUp - ArrowDown
steering = ArrowLeft - ArrowRight
```

Boolean được đổi thành `0` hoặc `1`, nên nhấn hai phím đối nhau cho kết quả 0.

### Commit 07 — `6b7e3b0`: pin dependency versions

Các package trong Three.js runtime stack được đưa về bộ phiên bản tương thích và khóa chính xác: Drei `10.7.6`, R3F `9.3.0`, Three.js `0.179.1` và `@types/three` `0.179.0`. Những package khác như React/Vite vẫn có version range. Việc pin nhóm 3D ngăn package manager tự phối các phiên bản Three/R3F/Drei chưa được kiểm chứng cùng nhau.

Đây không phải feature mới, nhưng quan trọng với khả năng tái lập build.

### Commit 08 — `53141e3`: trail và reset

Thêm đường đi bằng Drei `<Line>` và nút Reset.

Trail chỉ thêm điểm khi:

- đã qua ít nhất khoảng `0.08 s`; và
- robot cách điểm cuối hơn `0.025` world unit.

Nhờ vậy không tạo một điểm ở mọi frame khi robot đứng yên. Danh sách được giới hạn tối đa 1.500 điểm để bộ nhớ và chi phí render không tăng vô hạn.

Reset dùng một token tăng dần. Simulation thấy token thay đổi thì reset pose, velocity và trail. Cách này không remount model GLB nên tránh tải/clone lại tài nguyên 3D.

### Commit 09 — `8dff2dc`: telemetry dashboard

State bên trong animation loop được gửi lên React UI khoảng 10 lần/giây, thay vì `setState` ở mọi frame.

Dashboard hiển thị:

- linear velocity;
- angular velocity;
- left/right wheel speed;
- pose `x`, `z`, `yaw`.

Physics vẫn chạy theo tốc độ render, còn UI được throttle để giảm số lần React render.

### Commit 10 — `a6da8c2`: renderer statistics

Thêm số liệu từ `gl.info` và frame timing:

- FPS;
- frame time;
- draw calls;
- geometry count;
- triangle count;
- JS heap nếu browser hỗ trợ.

Frame time được làm mượt bằng exponential moving average:

```text
smooth = 0.9 × previous + 0.1 × current
```

Một frame chậm bất thường vì thế không làm con số nhảy quá mạnh.

### Commit 11 — `45d21d4`: ignore build artifact bị khóa

Message của commit vẫn nhắc renderer statistics, nhưng diff thực tế chỉ thêm `.dist-locked-*/` vào `.gitignore`.

Thư mục này có thể xuất hiện khi Windows giữ lock trên build output. Nó không phải source và không nên được commit. Đây là ví dụ cho thấy khi phân tích lịch sử cần xem diff thật, không chỉ đọc commit message.

### Commit 12 — `fef293c`: tài liệu Emergency Stop

Thêm `docs/EMERGENCY_STOP.md`, mô tả kiến trúc E-stop cho robot thật:

- safety controller độc lập;
- redundant sensing;
- warning/protective zones;
- trạng thái stop được latch;
- chỉ reset thủ công sau khi nguyên nhân đã được xử lý.

Quan trọng: commit này **chỉ thêm thiết kế**, app hiện tại chưa có nút hoặc state machine E-stop. JavaScript trong browser không được coi là safety-rated controller.

### Commit 13 — `4e8c823`: điều khiển articulated joints

`RobotModel` bắt đầu tìm các node `Link1` đến `Link6` trong GLB và xoay chúng theo joint values.

Model được clone để mỗi nơi sử dụng có object hierarchy riêng. Quaternion nghỉ ban đầu của mỗi link được lưu lại, sau đó mỗi pose được tính theo:

```text
final local quaternion = rest quaternion × joint axis-angle quaternion
```

Luôn bắt đầu từ rest pose ngăn lỗi cộng dồn rotation qua nhiều lần render.

### Commit 14 — `3a926ee`: tách joint config khỏi component

Danh sách joint ban đầu đặt ngay trong `RobotModel.tsx`. ESLint/Fast Refresh yêu cầu file component chỉ export component để hot reload đáng tin cậy, nên config được chuyển sang `src/config/joints.ts`.

Kết quả:

- `RobotModel.tsx` tập trung vào render/transform;
- metadata joint có thể dùng lại trong `ManipulatorPage`;
- sửa lint mà không cần disable rule.

### Commit 15 — `0a40805`: six-DOF forward kinematics UI

Manipulator page được hoàn thiện với:

- sáu slider theo giới hạn từng joint;
- Home pose và Demo pose;
- model articulated theo từng link;
- đọc world position của node `Hand` làm TCP;
- hiển thị chuỗi joint và tọa độ TCP.

Forward kinematics không được viết thành một ma trận DH riêng. Three.js tự truyền transform từ parent xuống child trong hierarchy của GLB:

```text
Base → Link1 → Link2 → ... → Link6 → Hand
```

Khi Link2 xoay, toàn bộ descendants của Link2 di chuyển theo. `Hand.getWorldPosition()` cho kết quả tổng hợp cuối chuỗi.

### Commit 16 — `32418e0`: tài liệu instancing

Thêm đề xuất dùng `InstancedMesh` khi cần mô phỏng nhiều robot:

- gom cùng geometry/material vào một draw call;
- CPU tính forward kinematics cho từng robot;
- ghi matrix từng instance bằng `setMatrixAt()`;
- đặt `instanceMatrix.needsUpdate = true`.

Đây cũng là **tài liệu thiết kế**, chưa phải runtime feature hiện có. App hiện tại vẫn clone và render một robot cho mỗi scene.

### Commit 17 — `40fb486`: tối ưu GLB và renderer

Model được tối ưu bằng `gltf-transform` với Meshopt compression trong khi bảo toàn hierarchy articulated.

Các flag cố ý tắt:

- `flatten false`: không làm phẳng hierarchy;
- `join false`: không gộp mesh có thể phá link;
- `instance false`: chưa đổi sang instancing;
- `simplify false`: không giảm triangle;
- `texture-compress false`: không thay đổi texture pipeline.

Dung lượng GLB giảm từ khoảng 11.09 MB xuống 2.89 MB, gần 74%. Triangle count gần như giữ nguyên; lợi ích chính là download/parse size và geometry reuse, không phải giảm độ phức tạp hình học.

Canvas cũng giới hạn DPR ở `[1, 1.5]` và yêu cầu `powerPreference: 'high-performance'`. DPR thấp hơn giảm số pixel GPU phải vẽ trên màn hình mật độ cao.

### Commit 18 — `2e853a1`: responsive UI

Layout desktop hai cột chuyển thành dạng xếp dọc trên màn hình nhỏ. Navigation, sidebar, viewport, metric grid và joint controls được điều chỉnh ở các breakpoint.

Responsive ở đây không chỉ là thu nhỏ chữ: viewport 3D cần giữ chiều cao sử dụng được, control phải đủ rộng để chạm và dashboard không được tràn ngang.

### Commit 19 — `d2e4b4b`: README và performance report

README được hoàn thiện với feature list, lệnh chạy và cấu trúc dự án. `docs/PERFORMANCE.md` ghi baseline, kết quả sau tối ưu và cách benchmark.

Các số FPS/heap chỉ là snapshot trên một thiết bị/browser; không phải bảo đảm cho mọi máy. So sánh đúng phải giữ nguyên model, camera, resolution, browser và thao tác thử.

### Commit 20 — `7897d53`: sửa lint cho trail initializer

Commit message nói đến build failure, còn lỗi cụ thể liên quan rule React về đọc/ref trong render initializer. Trail state được đổi sang lazy initializer:

```tsx
const [trail, setTrail] = useState<Vector3Tuple[]>(() => [[0, 0.035, 0]])
```

Hàm initializer chỉ chạy ở lần mount đầu và không đọc mutable ref trong render. Giá trị ban đầu của state và ref vẫn độc lập, đúng với cách simulation quản lý dữ liệu mutable và UI snapshot.

## 4. Giải thích component và function

### 4.1 `main.tsx` — điểm khởi động

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- `createRoot()` tạo React root theo API hiện đại.
- `StrictMode` bật kiểm tra bổ sung trong development. Effect có thể chạy setup/cleanup thêm một vòng để phát hiện side effect không an toàn; production không render hai lần như vậy.
- `BrowserRouter` cung cấp routing context cho `NavLink`, `Routes` và `Navigate` bên dưới.
- Dấu `!` nói với TypeScript rằng element `root` chắc chắn tồn tại.

### 4.2 `App.tsx` — shell, route và code splitting

Các thành phần chính:

- `lazy()`: tải module khi route cần nó;
- `Suspense`: render fallback trong khi module lazy chưa sẵn sàng;
- `NavLink`: link biết route hiện tại để gắn active class;
- `Routes`/`Route`: ánh xạ URL sang page;
- `Navigate`: chuyển URL không hợp lệ về `/drive`.

`Suspense` ở đây chờ **JavaScript chunk của page**, không trực tiếp theo dõi mọi async request. `useGLTF` bên trong R3F cũng có thể suspend, và Canvas/R3F quản lý quá trình đó trong scene.

### 4.3 `World.tsx` — môi trường 3D dùng chung

`World` nhận `children` bằng `PropsWithChildren`, rồi đặt chúng vào cùng scene với:

- `<color attach="background">`: màu nền của scene;
- `<fog attach="fog">`: làm vật ở xa hòa dần vào nền;
- `<hemisphereLight>`: ánh sáng mềm từ trời và đất;
- `<directionalLight>`: nguồn sáng có hướng để thấy hình khối;
- `<Grid>`: mặt lưới tham chiếu kích thước/khoảng cách;
- `<OrbitControls>`: quay, zoom và orbit camera bằng chuột.

`OrbitControls` không di chuyển robot. Nó chỉ thay đổi camera quanh target `[0, 0.7, 0]`. `maxPolarAngle` ngăn camera orbit xuống dưới mặt sàn; `minDistance`/`maxDistance` giới hạn zoom.

`World` phải nằm bên trong `<Canvas>` vì các helper này cần R3F/Three context.

### 4.4 `RobotModel.tsx` — tải model và áp joint rotation

#### `useGLTF(url)`

Tải GLB và trả về scene. `useGLTF.preload(url)` bắt đầu tải sớm để giảm thời gian chờ khi component xuất hiện.

#### `useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene])`

Clone scene đúng một lần cho mỗi nguồn GLTF. `SkeletonUtils.clone` an toàn hơn `Object3D.clone()` với model có skeleton/skinned meshes.

#### `restQuaternions`

`useRef<Map<string, Quaternion>>` giữ quaternion gốc của từng link qua các render mà không làm UI render lại.

Effect đầu tìm `Link1`…`Link6` và lưu quaternion ban đầu. Effect sau áp pose:

1. đổi degree sang radian bằng `MathUtils.degToRad()`;
2. tạo quaternion axis-angle bằng `setFromAxisAngle()`;
3. copy rest quaternion;
4. nhân thêm joint rotation.

Trục trong config là **local axis của link**, không phải trục cố định của thế giới. Sau khi parent xoay, trục local của child cũng đổi theo hierarchy.

Quaternion được dùng thay vì cộng Euler angle để composition ổn định và phù hợp với rest orientation có sẵn trong GLB.

#### `<primitive object={scene} />`

Cho phép đưa một `THREE.Object3D` đã tồn tại vào cây R3F. Nó không phải HTML primitive.

### 4.5 `config/joints.ts` — metadata sáu khớp

| Link | Nhãn | Trục local | Min | Max |
|---|---|---:|---:|---:|
| Link1 | Base yaw | Y | -166° | 166° |
| Link2 | Shoulder | X | -101° | 101° |
| Link3 | Arm swivel | Y | -166° | 166° |
| Link4 | Elbow | X | -176° | -4° |
| Link5 | Wrist swivel | Y | -166° | 166° |
| Link6 | Wrist bend | X | -1° | 215° |

Các con số này phục vụ demo và khớp với hierarchy/trục quan sát được của asset. Vì GLB không cung cấp đầy đủ metadata kiểu URDF về joint limits/axes, chúng cần được xác minh lại trước khi dùng với robot vật lý.

`Vector3` trong config được tạo một lần và dùng làm axis cho quaternion. Nó không phải tọa độ XYZ của TCP.

### 4.6 `Metric.tsx` — display component nhỏ

Props:

- `label`: tên số liệu;
- `value`: số hoặc chuỗi đã format;
- `unit`: đơn vị tùy chọn.

Component không biết velocity hay FPS là gì; nó chỉ chuẩn hóa cách hiển thị. Đây là presentational component, không giữ state và không thực hiện tính toán nghiệp vụ.

### 4.7 `useKeyboardDrive.ts` — input không gây re-render

Hook đăng ký ba loại event:

- `keydown`: thêm key vào `Set`;
- `keyup`: xóa key;
- `blur`: xóa toàn bộ để tránh trạng thái “kẹt phím” khi cửa sổ mất focus.

Arrow keys gọi `preventDefault()` để trang không cuộn. Cleanup gỡ listener khi component unmount.

Tại sao dùng `useRef(new Set())` thay vì state?

- keydown/keyup có thể xảy ra nhanh;
- simulation đọc trực tiếp trong `useFrame()`;
- thay đổi phím không cần làm React DOM render lại.

Hook trả về một ref ổn định; `keys.current.has('ArrowUp')` luôn phản ánh input mới nhất.

### 4.8 `drive.ts` — lõi toán học

#### Kiểu dữ liệu

`DriveInput` chứa `throttle` và `steering`, đều được clamp về `[-1, 1]`.

`DriveState` chứa:

- pose: `x`, `z`, `yaw`;
- twist: `linear`, `angular`;
- wheel angular speed: `leftWheel`, `rightWheel`.

`DriveLimits` chứa vận tốc tối đa, gia tốc, bán kính bánh và khoảng cách hai bánh.

#### `clamp(value, min, max)`

Giữ một số trong khoảng an toàn. Đây là helper nội bộ.

#### `approach(current, target, maxDelta)`

Di chuyển `current` về phía `target` tối đa `maxDelta`, không vượt quá target. Nó tạo acceleration/deceleration ramp.

#### `twistToWheelSpeeds(linear, angular, limits)`

Với differential drive:

```text
vLeft  = linear - angular × axleTrack / 2
vRight = linear + angular × axleTrack / 2

ωLeft  = vLeft  / wheelRadius
ωRight = vRight / wheelRadius
```

`linear` dùng m/s, `angular` dùng rad/s, còn wheel speed dùng rad/s.

Khi `linear = 0`, hai bánh quay ngược chiều và robot xoay tại chỗ. Khi hai bánh bằng nhau, robot đi thẳng.

#### `wheelSpeedsToTwist(left, right, limits)`

Phép đổi ngược:

```text
linear  = wheelRadius × (right + left) / 2
angular = wheelRadius × (right - left) / axleTrack
```

Round-trip test xác nhận hai phép đổi tương thích trong sai số floating point.

#### `stepDrive(state, input, delta, limits)`

Đây là function trung tâm:

1. clamp `delta` vào `[0, 0.1]` để tab lag không tạo bước nhảy khổng lồ;
2. tính target velocity từ input;
3. dùng `approach()` áp acceleration limit;
4. đổi twist sang wheel speeds;
5. đổi ngược để lấy twist thực tế nhất quán;
6. cập nhật `yaw`;
7. cập nhật vị trí bằng `sin(yaw)` và `cos(yaw)`.

Quy ước scene:

```text
yaw = 0 → robot tiến về +Z
x tăng → sang một phía theo trục X của world
y là chiều cao, nên base luôn giữ y = 0
```

Vị trí dùng yaw mới của frame, một dạng tích phân đơn giản phù hợp với demo realtime. Đây chưa phải physics engine có collision, friction hay wheel slip.

### 4.9 `drive.test.ts` — test điều gì?

Sáu test hiện tại kiểm tra:

1. hai bánh ngược chiều khi xoay tại chỗ;
2. velocity không vượt giới hạn;
3. chuyển twist → wheels → twist giữ lại giá trị;
4. robot tiến theo +Z ở yaw 0;
5. `approach()` không vượt target;
6. robot giảm tốc đúng theo acceleration limit.

Test chỉ bảo vệ lõi toán học. Nó chưa kiểm tra keyboard event, Canvas, trail, routing hay manipulator UI.

### 4.10 `DrivePage.tsx` — ghép input, physics, 3D và dashboard

#### `DriveSimulation`

Đây là component nằm trong Canvas. Nó giữ dữ liệu realtime trong ref:

- `drive.current`: state vật lý mới nhất;
- `points.current`: toàn bộ trail;
- `lastTrail`, `lastUi`: timestamp throttle;
- `smoothFrameMs`: frame time EMA;
- `previousReset`: reset token đã xử lý.

Ref phù hợp với animation loop vì thay đổi ref không kích hoạt React reconciliation.

#### `useFrame((state, delta) => ...)`

R3F gọi callback trước mỗi frame render. Callback:

- đọc phím;
- gọi `stepDrive()`;
- cập nhật group transform trực tiếp;
- lấy thêm trail point khi đủ điều kiện;
- khoảng 100 ms gửi telemetry/stats lên React UI.

Không nên gọi nhiều `setState()` mỗi frame cho dashboard vì nó kết hợp hai vòng lặp tần suất khác nhau: render 3D khoảng 60 Hz và DOM dashboard chỉ cần khoảng 10 Hz.

#### `useThree()` và `gl.info`

`useThree()` lấy renderer hiện tại. `gl.info.render.calls`, `triangles` và `gl.info.memory.geometries` là thống kê Three.js renderer, hữu ích để phát hiện số draw call/geometry tăng ngoài ý muốn.

`performance.memory` nếu có chỉ phản ánh JavaScript heap và là API phụ thuộc browser; nó không phải GPU VRAM. Browser không hỗ trợ sẽ hiển thị `N/A`.

#### Trail `<Line>`

Trail đặt ở `y = 0.035` để nằm hơi cao hơn grid, hạn chế z-fighting. Mỗi lần thêm điểm tạo array mới cho React nhận ra prop đã đổi, nhưng array được chặn ở 1.500 điểm.

#### Canvas settings

- camera `[5, 4.2, -6]`, FOV 42;
- DPR `[1, 1.5]` để cân bằng độ nét và GPU cost;
- antialias bật;
- `powerPreference: 'high-performance'` là browser hint, không phải bảo đảm chọn GPU rời.

#### Những giới hạn hiện tại

- không collision hoặc terrain physics;
- bánh xe chưa xoay hình học theo wheel speed;
- camera orbit quanh target cố định, không follow robot;
- reset khi vẫn giữ Arrow key sẽ làm robot chạy lại ngay;
- badge “Simulation ready” là text tĩnh, chưa phải health check thật.

### 4.11 `ManipulatorPage.tsx` — joint control và TCP

#### `homePose`

Pose mặc định `[0, 0, 0, -45, 0, 90]` degree. Home button tạo bản copy để state nhận array mới.

#### `updateJoint(index, value)`

Dùng `setJoints(current => current.map(...))` để cập nhật bất biến. Không mutate array cũ, nên React nhận biết thay đổi.

Slider dùng `min`, `max` từ `JOINTS` và `step={1}`. Điều này giới hạn UI input, nhưng `RobotModel` tự thân chưa clamp values nếu được gọi từ nơi khác.

#### `ManipulatorScene`

Group ref cho phép tìm node `Hand` sau khi model được render. Effect phụ thuộc `joints.join(',')`, tạo một signature primitive để effect chạy lại khi bất kỳ joint value nào đổi.

`requestAnimationFrame()` trì hoãn việc đọc TCP một frame, cho effect của `RobotModel` có thời gian áp quaternion và cập nhật transform hierarchy.

```tsx
const hand = group.current?.getObjectByName('Hand')
hand?.getWorldPosition(worldPosition)
```

`getWorldPosition()` tổng hợp transform của tất cả parents. Kết quả là world origin của node `Hand`, không nhất thiết là tool-tip thật nếu tool có offset riêng.

#### `<Html>`

Drei `Html` render DOM nằm trong scene 3D. Label hiện đặt ở vị trí cố định `[0, 1.6, 0]`; nội dung là TCP động nhưng label chưa bám trực tiếp theo node `Hand`.

#### Forward kinematics trong hierarchy

Mỗi link có local transform tương đối với parent. World transform của TCP là tích của toàn bộ transform dọc chuỗi:

```text
T_world_hand = T_base × T_link1 × T_link2 × ... × T_link6 × T_hand
```

Three.js thực hiện phép nhân matrix này khi cập nhật scene graph. Vì vậy page không cần tự viết công thức DH để có kết quả trực quan.

#### Giới hạn hiện tại

- demo điều khiển sáu link dù Franka thực tế thường được mô tả là arm 7-DOF;
- joint axes/limits phụ thuộc asset và cần đối chiếu URDF/CAD chính thức;
- TCP là origin của `Hand`, chưa có calibrated tool transform;
- không inverse kinematics, self-collision hoặc torque/dynamics;
- `joints` dùng `number[]`, chưa phải tuple có đúng sáu phần tử ở compile time.

### 4.12 `styles.css` — visual system và responsive behavior

CSS định nghĩa:

- màu nền tối/xanh, glass panels và typography;
- topbar, navigation active state;
- layout sidebar + viewport;
- metric cards, sliders và action buttons;
- overlay trong Canvas;
- breakpoint tablet/mobile.

Google Font được tải từ mạng; fallback system font vẫn hoạt động nếu offline. Trên màn hình nhỏ, page grid chuyển một cột và viewport có chiều cao riêng để Canvas không bị co về 0.

## 5. React hooks được dùng và lý do

| Hook/API | Nơi dùng | Mục đích |
|---|---|---|
| `useState` | pages | UI snapshot, joint values, telemetry, stats |
| `useRef` | simulation/model | mutable realtime data và Three object refs |
| `useEffect` | keyboard/model/manipulator | event lifecycle, áp joints, đọc TCP |
| `useMemo` | RobotModel | clone GLB một lần khi source scene đổi |
| `useCallback` | DrivePage | giữ callback telemetry/stats ổn định |
| `lazy` | App | tách code theo route |
| `Suspense` | App | fallback khi lazy page đang tải |
| `useFrame` | DrivePage | animation/physics loop của R3F |
| `useThree` | DrivePage | truy cập renderer và statistics |

Nguyên tắc thiết kế đang được dùng:

```text
state  → dữ liệu cần làm React UI render lại
ref    → dữ liệu thay đổi liên tục nhưng không cần render DOM
effect → đồng bộ React với hệ thống bên ngoài hoặc object mutable
memo   → tránh tạo lại tài nguyên có chi phí cao
```

## 6. Khái niệm Three.js/robotics cần nhớ

### Scene graph và local/world coordinates

Một object lưu position/rotation tương đối với parent gọi là local transform. World transform là kết quả sau khi kết hợp mọi parent.

Vì vậy cùng một phép xoay quanh local X có thể nhìn như xoay quanh hướng khác trong world sau khi parent đã xoay.

### Euler và quaternion

`group.rotation.y = yaw` tiện cho một rotation đơn giản của mobile base. Arm dùng quaternion vì mỗi link đã có rest orientation và cần composition `rest × delta`.

Quaternion không phải bốn tọa độ không gian; nó là biểu diễn rotation. UI vẫn nhận degree để dễ hiểu, rồi đổi sang radian trước khi tạo quaternion.

### Link, joint và TCP

- **Link**: phần thân cứng của robot.
- **Joint**: khớp nối cho phép link chuyển động quanh một trục.
- **TCP**: Tool Center Point, điểm làm việc của end effector.
- **Forward kinematics**: biết joint angles → tính pose TCP.
- **Inverse kinematics**: biết TCP mong muốn → tìm joint angles; dự án chưa có phần này.

### Draw call, geometry và triangle

- draw call là một lần CPU yêu cầu GPU vẽ một batch;
- geometry là dữ liệu vertex/index;
- triangle là số tam giác thực tế được rasterize;
- instancing giảm draw calls khi nhiều object dùng cùng geometry/material;
- compression giảm kích thước file, không tự động giảm triangles.

## 7. Performance hiện tại

Theo benchmark đã ghi lại:

| Chỉ số | Trước | Sau tối ưu |
|---|---:|---:|
| GLB | 11.09 MB | 2.89 MB |
| Draw calls | 15 | 15 |
| Geometries | 26 | 15 |
| Triangles | 109,766 | 109,766 |
| FPS tham khảo | 60 | 60 |

Diễn giải:

- file nhỏ hơn đáng kể nhờ Meshopt;
- số geometry giảm nhờ tối ưu/reuse;
- triangle giữ nguyên vì cố ý không simplify;
- draw calls không đổi đáng kể vì chưa chuyển runtime sang instancing;
- FPS đã chạm mức refresh phổ biến, nên cải thiện download/memory có thể rõ hơn cải thiện FPS.

Xem chi tiết và cách đo tại [`PERFORMANCE.md`](./PERFORMANCE.md).

## 8. Phần nào đã chạy, phần nào mới là thiết kế?

| Hạng mục | Trạng thái |
|---|---|
| Hai route Drive/Manipulator | Đã chạy |
| Keyboard differential drive | Đã chạy |
| Acceleration ramp | Đã chạy |
| Trail, reset, telemetry | Đã chạy |
| Renderer metrics | Đã chạy |
| Sáu articulated joints | Đã chạy với asset hiện tại |
| TCP từ node `Hand` | Đã chạy, chưa calibrated tool offset |
| Responsive UI | Đã chạy |
| Optimized GLB | Đã dùng trong runtime |
| Emergency-stop architecture | Chỉ là thiết kế tài liệu |
| Fleet instancing | Chỉ là đề xuất tài liệu |
| Collision/dynamics/IK | Chưa có |
| Kết nối ROS/robot thật | Chưa có |

Tài liệu liên quan:

- [`EMERGENCY_STOP.md`](./EMERGENCY_STOP.md)
- [`INSTANCING.md`](./INSTANCING.md)
- [`PERFORMANCE.md`](./PERFORMANCE.md)

## 9. Cách chạy và kiểm tra

Từ thư mục repository trên Windows:

```powershell
npm.cmd install
npm.cmd run dev
```

Các quality gates:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Ý nghĩa:

- `test`: chạy unit tests trong `drive.test.ts`;
- `lint`: kiểm tra rule TypeScript/React/Fast Refresh;
- `build`: TypeScript project build rồi Vite production build.

Checklist thủ công:

1. `/drive` tải model và không có lỗi console.
2. Arrow Up/Down tăng giảm tốc mượt, Left/Right đổi yaw.
3. Trail xuất hiện, Reset đưa robot/trail về đầu.
4. Telemetry và renderer stats cập nhật.
5. `/manipulator` slider làm đúng link chuyển động.
6. Home/Demo pose hoạt động và TCP thay đổi.
7. Thu nhỏ browser để kiểm tra layout tablet/mobile.

## 10. Cách đọc source để học nhanh

Thứ tự khuyến nghị:

1. `main.tsx` và `App.tsx`: hiểu React root, router, lazy/Suspense.
2. `World.tsx`: hiểu Canvas context, light, grid, controls.
3. `RobotModel.tsx`: hiểu GLB, clone, scene graph và quaternion.
4. `drive.ts` + tests: hiểu phần toán độc lập.
5. `useKeyboardDrive.ts`: hiểu event lifecycle và ref.
6. `DrivePage.tsx`: xem cách ghép input → physics → transform → UI.
7. `joints.ts` + `ManipulatorPage.tsx`: hiểu FK qua hierarchy và TCP.
8. ba tài liệu kỹ thuật: hiểu performance và hướng mở rộng an toàn.

## 11. Hướng nâng cấp hợp lý tiếp theo

Theo mức độ từ gần đến xa:

1. sửa API joints thành tuple sáu phần tử và clamp trong `RobotModel`;
2. thêm component/integration tests cho keyboard, reset và page routing;
3. cho TCP label bám đúng vị trí `Hand` và thêm tool offset cấu hình được;
4. animation trực quan cho bánh xe và camera follow tùy chọn;
5. tải joint metadata từ URDF hoặc nguồn kỹ thuật chính thức;
6. thêm inverse kinematics và collision visualization;
7. chỉ triển khai instancing khi có use case nhiều robot và benchmark chứng minh cần thiết;
8. nếu kết nối phần cứng thật, đặt command validation và safety controller ngoài browser simulation.

## 12. Kết luận

20 commit tạo thành một lộ trình khá rõ:

```text
scaffold
→ app shell/router
→ scene + GLB
→ pure drive math + tests
→ acceleration + keyboard integration
→ trail/telemetry/performance metrics
→ articulated arm + forward kinematics/TCP
→ asset/render optimization
→ responsive UI + documentation + lint/build fixes
```

Điểm mạnh nhất của kiến trúc hiện tại là ranh giới tương đối rõ giữa UI React, animation loop R3F, model toán thuần và asset hierarchy. Các giới hạn lớn nhất là joint metadata chưa có nguồn robotics chính thức, physics còn kinematic đơn giản, TCP chưa calibrated và hai thiết kế E-stop/instancing chưa phải feature runtime.
