import React, { useEffect, useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRM, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';

interface VRMModelProps {
    url: string;
}

const VRMModel: React.FC<VRMModelProps> = ({ url }: any) => {
    const gltf = useLoader(GLTFLoader, url, (loader) => {
        loader.register((parser: any) => new VRMLoaderPlugin(parser));
    });

    const vrm = useRef<VRM | null>(null);
    const clock = useRef(new THREE.Clock());

    useEffect(() => {
        if (gltf && gltf.userData.vrm) {
            vrm.current = gltf.userData.vrm;

            vrm.current.scene.position.z = 2;

            vrm.current.scene.rotation.y = Math.PI;

            vrm.current.scene.traverse((obj: any) => {
                if ((obj as THREE.Object3D).isMesh) {
                    const mesh = obj as THREE.Mesh;
                    mesh.material = new THREE.MeshBasicMaterial({
                        map: (mesh.material as THREE.MeshStandardMaterial).map,
                        color: new THREE.Color('#fdfdfd')
                    });
                }
            }); 

            VRMUtils.removeUnnecessaryVertices(vrm.current.scene);
            VRMUtils.removeUnnecessaryJoints(vrm.current.scene);

            vrm.current.scene.traverse((obj:any ) => {
                if ((obj as THREE.Object3D).isMesh) {
                    (obj as THREE.Mesh).frustumCulled = false;
                }
            });
        }
    }, [gltf]);

    useFrame(() => {
        if (vrm.current) {
            vrm.current.update(clock.current.getDelta());
        }
    });

    return <primitive object={gltf.scene} />;
};

export default VRMModel;
