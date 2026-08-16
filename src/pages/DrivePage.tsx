import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { RobotModel } from "../components/RobotModel";
import { World } from "../components/World";

export function DrivePage() {
    return (
        <section style={{ height: 'calc(100vh - 64px)' }}>
            <Canvas camera={{ position: [5, 4.2, -6], fov: 42 }}>
                <Suspense fallback={null}>
                    <World>
                        <RobotModel />
                    </World>
                </Suspense>
            </Canvas>
        </section>
    )
}