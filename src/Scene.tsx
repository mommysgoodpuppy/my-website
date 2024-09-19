// Scene.tsx
import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Stats, Grid, OrbitControls, Environment, MeshTransmissionMaterial } from '@react-three/drei';
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm';
import VRMModel from './VRM.tsx'; // Import the VRMModel component



// HUD Component 
function HUD() {
    const { camera, size } = useThree();
    const hudRef = useRef<THREE.Mesh>(null!);

    // Distance in front of the camera (positive value) 
    const distance = 0.6;

    useEffect(() => {
        if (hudRef.current) {
            // Ensure HUD is rendered on top by setting a high renderOrder 
            hudRef.current.renderOrder = 10;
            // Disable depth writing to prevent z-buffer conflicts
            hudRef.current.material.depthWrite = false;
        }
    }, []);

    useFrame(() => {
        if (hudRef.current) {
            // Calculate HUD size based on camera's FOV and aspect ratio 
            const fov = THREE.MathUtils.degToRad(camera.fov); // Convert FOV to radians 
            const aspect = size.width / size.height;

            const customScaleFactor = 0;

            // Calculate visible height and width at the specified distance 
            const visibleHeight = 2 * distance * Math.tan(fov / 2) + customScaleFactor;
            const visibleWidth = visibleHeight * aspect + customScaleFactor;

            // Set HUD's scale to cover 100% width and 50% height 
            hudRef.current.scale.set(visibleWidth, visibleHeight * 0.5, 1);

            // Calculate the position in front of the camera 
            const vector = new THREE.Vector3(0, 0, -distance).applyQuaternion(camera.quaternion);
            const hudPosition = camera.position.clone().add(vector);

            // Adjust the vertical position to move the HUD 25% downwards 
            const verticalOffset = new THREE.Vector3(0, -visibleHeight * 0.25, 0).applyQuaternion(camera.quaternion);
            hudPosition.add(verticalOffset);

            // Position HUD in front of the camera 
            hudRef.current.position.copy(hudPosition);

            // Align HUD rotation with camera rotation 
            hudRef.current.quaternion.copy(camera.quaternion);
        }
    });

    return (
        <mesh ref={hudRef}>
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
            />
        </mesh>
    );
}

// Box Component 
function Box(props: any) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const [hovered, setHover] = useState(false);
    const [active, setActive] = useState(false);

    useFrame((state, delta) => {
        meshRef.current.rotation.x += delta * 0.5;
        meshRef.current.rotation.y += delta * 0.5;
    });

    return (
        <mesh
            {...props}
            ref={meshRef}
            scale={active ? 1.5 : 1}
            onClick={() => setActive(!active)}
            onPointerOver={() => setHover(true)}
            onPointerOut={() => setHover(false)}
            castShadow
            receiveShadow
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={hovered ? 'hotpink' : '#2f74c0'} />
        </mesh>
    );
}

// Additional Cube Closer to the Camera 
function CloserCube() {
    const meshRef = useRef<THREE.Mesh>(null!);

    useFrame((state, delta) => {
        meshRef.current.rotation.y += delta * 0.3;
    });

    return (
        <mesh
            ref={meshRef}
            position={[1, 1, 3]} // Positioned 3 units in front of the camera 
            scale={[0.3, 0.3, 0.3]}
            castShadow
            receiveShadow
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="green" />
        </mesh>
    );
}

// Main Scene Content 
function SceneContent() {
    return (
        <>
            {/* Ambient Lighting */}
            <ambientLight intensity={0.5} />

            {/* Boxes Positioned in the Scene */}
            <Box position={[-1.5, 0, 0]} />
            <Box position={[1.5, 0, 0]} />

            {/* Additional Cube Closer to the Camera */}
            <CloserCube />

            {/* HUD Integrated into the Scene */}
            <HUD />

            {/* VRM Model */}
            <VRMModel url="/models/Velle.vrm" />

        </>
    );
}

// Main Scene Component 
export function Scene() {
    // State to manage grid visibility 
    const [showGrid, setShowGrid] = useState(true);

    // Handler for pointer missed events 
    const handlePointerMissed = (event: PointerEvent) => {
        setShowGrid((prev) => !prev);
    };

    return (
        <Canvas
            shadows
            camera={{ position: [0, 2, 4], fov: 75, near: 0.1, far: 1000 }}
            style={{ width: '100vw', height: '100vh' }}
            onPointerMissed={handlePointerMissed} // Attach the handler
        >
            {/* Set Background Color to Black */}
            <color attach="background" args={['#212121']} />

            {/* Add Environment for realistic reflections */}
            <Environment preset="city" /> 

            <OrbitControls makeDefault target={[0, 0, 0]} />

            {/* Render Scene Content */}
            <SceneContent />

            {/* Conditionally Render the Grid Based on State */}
            {showGrid && <Grid infiniteGrid fadeDistance={50} fadeStrength={5} />}

            {/* Performance Statistics */}
            <Stats />
        </Canvas>
    );
}
