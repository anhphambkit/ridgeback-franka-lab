# Video demonstration checklist

Record a 60–90 second walkthrough after `npm test`, `npm run lint`, and `npm run build` pass. Use a browser window that only contains the local application so no unrelated tabs, notifications, or personal information appear in the recording.

## Preparation

1. Run `npm run dev -- --host 127.0.0.1 --port 5173`.
2. Open `http://127.0.0.1:5173/drive` in a clean browser window.
3. Hide bookmarks and unrelated browser UI, or enter full-screen mode.
4. Confirm the robot model, telemetry panel, and renderer panel are visible.
5. Close developer tools unless you explicitly want to show a clean console at the end.

## Recommended shot list

| Time | Visual action | Suggested narration |
| --- | --- | --- |
| 0:00–0:08 | Show the top navigation and Mobile Base page. | “This React and Three.js application contains separate mobile-base and manipulator simulations using the supplied GLB.” |
| 0:08–0:22 | Hold Up, release it, then hold Down. | “The differential-drive base follows acceleration ramps and never exceeds the configured linear and angular limits.” |
| 0:22–0:32 | Hold Left and Right; point out heading and wheel velocities. | “Rotation is driven by opposite wheel-speed contributions, while pose and velocity telemetry update at 10 hertz.” |
| 0:32–0:40 | Show the trajectory, renderer panel, and press Reset. | “The trail is distance- and time-sampled, and the renderer panel reports draw calls, geometries, triangles, frame time, FPS, and browser heap usage.” |
| 0:40–0:55 | Navigate to Manipulator; adjust two or three sliders. | “Six configured local joints drive forward kinematics through the preserved GLB parent-child hierarchy.” |
| 0:55–1:05 | Press Demo pose, then Home pose; point out TCP changes. | “The TCP is read from the Hand node in world space after all upstream transforms are applied.” |
| 1:05–1:15 | Briefly show the README links to E-stop, instancing, and performance docs. | “The repository also documents collision-safe emergency stopping, articulated-model instancing, and measured optimization decisions.” |

## Recording on Windows

You can use Xbox Game Bar (`Win + Alt + R`) or OBS Studio. Start recording only after the clean localhost window is focused. Stop recording after returning to the Mobile Base overview.

Before submission, watch the exported file once and verify:

- Text and telemetry are readable at 1080p or better.
- Up/Down and Left/Right behavior are visibly demonstrated, not only described.
- The trail and Reset action are visible.
- At least one manual joint-slider change is visible.
- Demo/Home pose changes and TCP values are visible.
- No private email, token, desktop notification, or unrelated browser tab appears.
- The audio is understandable, or captions explain every required feature.

Upload the final video as an unlisted/private-access link appropriate for the reviewers, then add that link to the README or submission message.
