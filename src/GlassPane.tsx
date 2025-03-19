import React from 'react';
import { MeshTransmissionMaterial } from '@react-three/drei';

export function GlassPane() {
    return (
        <mesh renderOrder={10}>
            <planeGeometry args={[1, 1, 64, 64]} />
            <MeshTransmissionMaterial
                samples={16}
                chromaticAberration={0.1}
                anisotropicBlur={0.1}
                thickness={0.1}
                roughness={0.5}
                toneMapped={true}
                transmissionSampler={false}
                backside={true}
                color="#ffffff"
                distortion={0.1}
                distortionScale={1}
                temporalDistortion={0.06}
                depthWrite={false}
            />
        </mesh>
    );
}