import React, { useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Leva, useControls } from "leva";

function Fan() {
  const ref = useRef();
  useFrame((_, delta) => {
    ref.current.rotation.z += delta * 4;
  });

  return (
    <mesh ref={ref} position={[-1.2, 0.2, 0]}>
      <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
      <meshStandardMaterial color="#111" metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

function Coil() {
  return (
    <group position={[0.3, 0.4, 0]}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[i * 0.22, 0, 0]}>
          <torusGeometry args={[0.32, 0.05, 16, 100]} />
          <meshStandardMaterial color="#2563eb" metalness={0.4} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function UV() {
  return (
    <mesh position={[0, -0.1, 0]}>
      <cylinderGeometry args={[0.07, 0.07, 1.4, 32]} />
      <meshStandardMaterial
        color="#a855f7"
        emissive="#c084fc"
        emissiveIntensity={1.5}
      />
    </mesh>
  );
}

function Tanks() {
  return (
    <group position={[0, -0.8, 0]}>
      <mesh position={[-0.5, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.7, 32]} />
        <meshStandardMaterial color="#dbeafe" transparent opacity={0.6} />
      </mesh>

      <mesh position={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.7, 32]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function MachineShell() {
  return (
    <mesh>
      <boxGeometry args={[4, 2.2, 2]} />
      <meshStandardMaterial color="#d1d5db" metalness={0.7} roughness={0.25} />
    </mesh>
  );
}

export default function AwgSimulator() {
  const { flow } = useControls({
    flow: { value: 0.6, min: 0, max: 1 }
  });

  return (
    <div style={{ height: "100vh", background: "#eef5ff" }}>
      <Leva collapsed />
      <Canvas camera={{ position: [3.5, 1.5, 4.5], fov: 35 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />

        <MachineShell />
        <Fan />
        <Coil />
        <UV />
        <Tanks />

        <OrbitControls />
      </Canvas>
    </div>
  );
}
