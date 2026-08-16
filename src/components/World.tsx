import { Grid, OrbitControls } from '@react-three/drei'
import type { PropsWithChildren } from 'react'

export function World({ children }: PropsWithChildren) {
    return (
        <>
            <color attach="background" args={['#091310']} />
            <fog attach="fog" args={['#091310', 14, 34]} />
            <hemisphereLight args={['#d8f538', '#10221c', 1.25]} />
            <directionalLight position={[5, 9, 4]} intensity={2.4} />
            <Grid
                position={[0, -0.02, 0]} args={[40, 40]}
                cellSize={0.5} sectionSize={2}
                fadeDistance={28} infiniteGrid
            />
            {children}
            <OrbitControls
                makeDefault minDistance={2} maxDistance={18}
                maxPolarAngle={Math.PI / 2.05} target={[0, 0.7, 0]}
            />
        </>
    )
}