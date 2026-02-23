// src/AwgSimulator.jsx
// AWG Interactive 3D Simulator (React + R3F)
// Cutaway cabinet + internal components + step-based particles + UI like reference

import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, Html, RoundedBox } from "@react-three/drei";
import { Leva, useControls } from "leva";

const STEPS = [
  { key: "air", title: "Entrada de aire" },
  { key: "condensation", title: "Condensación" },
  { key: "filtration", title: "Filtración" },
  { key: "uv_tank", title: "UV + Tanque" },
  { key: "dispense", title: "Dispensado" },
  { key: "mineral", title: "Mineralización" },
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function Particles({
  count = 900,
  color = "#7dd3fc",
  size = 0.012,
  speed = 0.35,
  active = true,
  box = [1.2, 0.6, 0.6],
  direction = [1, 0, 0],
  swirl = 0.0,
}) {
  const points = useRef();

  const dir = useMemo(() => {
    const d = new THREE.Vector3(direction[0], direction[1], direction[2]);
    if (d.length() === 0) d.set(1, 0, 0);
    d.normalize();
    return d;
  }, [direction]);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * box[0];
      arr[i * 3 + 1] = (Math.random() - 0.5) * box[1];
      arr[i * 3 + 2] = (Math.random() - 0.5) * box[2];
    }
    return arr;
  }, [count, box]);

  const phases = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = Math.random() * Math.PI * 2;
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (!active || !points.current) return;
    const pos = points.current.geometry.attributes.position.array;

    const halfX = box[0] / 2;
    const halfY = box[1] / 2;
    const halfZ = box[2] / 2;

    const t = state.clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const ix = i * 3 + 0;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      pos[ix] += dir.x * speed * delta;
      pos[iy] += dir.y * speed * delta;
      pos[iz] += dir.z * speed * delta;

      if (swirl > 0) {
        const p = phases[i] + t * (0.8 + swirl * 1.2);
        pos[iy] += Math.sin(p) * swirl * 0.02;
        pos[iz] += Math.cos(p) * swirl * 0.02;
      }

      if (pos[ix] > halfX) pos[ix] = -halfX;
      if (pos[ix] < -halfX) pos[ix] = halfX;
      if (pos[iy] > halfY) pos[iy] = -halfY;
      if (pos[iy] < -halfY) pos[iy] = halfY;
      if (pos[iz] > halfZ) pos[iz] = -halfZ;
      if (pos[iz] < -halfZ) pos[iz] = halfZ;
    }

    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={size} color={color} transparent opacity={0.9} depthWrite={false} />
    </points>
  );
}

function UiButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "none",
        borderRadius: 12,
        padding: "10px 14px",
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.75)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.14)",
        fontFamily: "Inter, system-ui, Arial",
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      {children}
    </button>
  );
}

function Callout({ title, subtitle, icon = "💧" }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.90)",
        padding: "10px 12px",
        borderRadius: 16,
        fontFamily: "Inter, system-ui, Arial",
        boxShadow: "0 10px 30px rgba(0,0,0,0.14)",
        display: "flex",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          background: "rgba(59,130,246,0.12)",
          display: "grid",
          placeItems: "center",
          fontSize: 16,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function AwgModel({ step, fluidFlow = 0.6, tempCondensation = 0.55 }) {
  const group = useRef();

  const fanRef = useRef();
  const coilGlowRef = useRef();
  const uvRef = useRef();
  const dirtyWaterRef = useRef();
  const cleanWaterRef = useRef();

  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#d7dbe2"),
        metalness: 0.65,
        roughness: 0.25,
      }),
    []
  );

  const darkInnerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0b1220"),
        roughness: 0.95,
        metalness: 0.0,
      }),
    []
  );

  const pipeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#111827"),
        metalness: 0.25,
        roughness: 0.55,
      }),
    []
  );

  const coilMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#1d4ed8"),
        metalness: 0.35,
        roughness: 0.32,
        emissive: new THREE.Color("#60a5fa"),
        emissiveIntensity: 0.08,
      }),
    []
  );

  const copperMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#b45309"),
        metalness: 0.75,
        roughness: 0.32,
      }),
    []
  );

  const uvMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#7c3aed"),
        emissive: new THREE.Color("#a78bfa"),
        emissiveIntensity: 0.15,
        metalness: 0.15,
        roughness: 0.35,
      }),
    []
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#ffffff"),
        transparent: true,
        opacity: 0.18,
        roughness: 0.10,
        metalness: 0.0,
        transmission: 1.0,
        thickness: 0.18,
        ior: 1.45,
        clearcoat: 0.35,
        clearcoatRoughness: 0.1,
      }),
    []
  );

  const waterDirtyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#9ca3af"),
        transparent: true,
        opacity: 0.55,
        roughness: 0.2,
        metalness: 0.0,
      }),
    []
  );

  const waterCleanMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#60a5fa"),
        transparent: true,
        opacity: 0.55,
        roughness: 0.14,
        metalness: 0.0,
      }),
    []
  );

  useFrame((state, delta) => {
    const flow = clamp01(fluidFlow);
    const cond = clamp01(tempCondensation);

    // Fan spins mainly on "air"
    if (fanRef.current) {
      const base = 1.2 + flow * 10.0;
      const mult = step === "air" ? 1.0 : 0.20;
      fanRef.current.rotation.z += base * mult * delta;
    }

    // Coil glow on condensation
    if (coilGlowRef.current) {
      coilMat.emissiveIntensity = step === "condensation" ? 0.25 + cond * 0.85 : 0.08;
    }

    // UV glow on uv_tank
    if (uvRef.current) {
      uvMat.emissiveIntensity = step === "uv_tank" ? 0.6 + flow * 0.9 : 0.12;
    }

    // Simple water levels
    if (dirtyWaterRef.current) {
      const target = step === "filtration" || step === "condensation" ? 0.15 : 0.22;
      dirtyWaterRef.current.scale.y += (target - dirtyWaterRef.current.scale.y) * (1 - Math.pow(0.001, delta));
    }
    if (cleanWaterRef.current) {
      const target = step === "uv_tank" || step === "dispense" || step === "mineral" ? 0.33 : 0.25;
      cleanWaterRef.current.scale.y += (target - cleanWaterRef.current.scale.y) * (1 - Math.pow(0.001, delta));
    }
  });

  // Particle speeds
  const airSpeed = 0.20 + clamp01(fluidFlow) * 0.75;
  const waterSpeed = 0.15 + clamp01(fluidFlow) * 1.0;
  const condSpeed = 0.08 + clamp01(tempCondensation) * 0.45;

  return (
    <group ref={group} position={[0, -0.15, 0]}>
      {/* === CABINET (cutaway) === */}
      {/* Outer shell */}
      <RoundedBox args={[2.55, 1.65, 1.55]} radius={0.10} smoothness={8} material={bodyMat} />

      {/* Front opening frame (creates “cutaway” look) */}
      <group position={[0, 0.02, 0.79]}>
        {/* Frame */}
        <RoundedBox args={[2.30, 1.35, 0.06]} radius={0.08} smoothness={8}>
          <meshStandardMaterial color="#e6e9ef" metalness={0.65} roughness={0.28} />
        </RoundedBox>

        {/* “Glass” panel inset (optional look like reference) */}
        <mesh position={[0, 0, 0.04]} material={glassMat}>
          <planeGeometry args={[2.10, 1.15]} />
        </mesh>
      </group>

      {/* Inner cavity dark plate */}
      <mesh position={[0.0, 0.02, 0.15]} material={darkInnerMat}>
        <boxGeometry args={[2.15, 1.30, 1.10]} />
      </mesh>

      {/* === INTERNAL COMPONENTS (arranged like the reference image) === */}

      {/* Fan (left) */}
      <group position={[-0.95, 0.33, 0.32]}>
        <mesh>
          <circleGeometry args={[0.28, 44]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.15} />
        </mesh>
        <mesh ref={fanRef} position={[0, 0, 0.02]}>
          <circleGeometry args={[0.24, 36]} />
          <meshStandardMaterial color="#1f2937" roughness={0.45} metalness={0.35} />
        </mesh>
      </group>

      {/* Coils (top-right) */}
      <group position={[0.45, 0.42, 0.28]} ref={coilGlowRef}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[i * 0.085 - 0.21, 0, 0]} material={coilMat}>
            <torusGeometry args={[0.30, 0.040, 16, 90]} />
          </mesh>
        ))}
        <mesh position={[0.37, 0, 0]} material={copperMat}>
          <torusGeometry args={[0.34, 0.022, 16, 90]} />
        </mesh>
      </group>

      {/* Filter / pipe line (middle) */}
      <group position={[-0.35, 0.00, 0.35]}>
        {/* Main pipe */}
        <mesh rotation={[0, 0, Math.PI / 2]} material={pipeMat}>
          <cylinderGeometry args={[0.08, 0.08, 1.55, 22]} />
        </mesh>

        {/* Filter segments */}
        <mesh position={[-0.45, 0, 0]} material={pipeMat}>
          <cylinderGeometry args={[0.12, 0.12, 0.30, 22]} />
        </mesh>
        <mesh position={[-0.05, 0, 0]} material={new THREE.MeshStandardMaterial({ color: "#374151", metalness: 0.25, roughness: 0.55 })}>
          <cylinderGeometry args={[0.12, 0.12, 0.30, 22]} />
        </mesh>
        <mesh position={[0.35, 0, 0]} material={pipeMat}>
          <cylinderGeometry args={[0.12, 0.12, 0.30, 22]} />
        </mesh>
      </group>

      {/* UV tube (center) */}
      <mesh ref={uvRef} position={[0.20, -0.05, 0.35]} material={uvMat} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.055, 0.055, 0.95, 18]} />
      </mesh>

      {/* Tanks (bottom) */}
      <group position={[-0.15, -0.55, 0.18]}>
        {/* Dirty */}
        <mesh position={[-0.55, 0.05, 0.05]} material={glassMat}>
          <cylinderGeometry args={[0.28, 0.28, 0.58, 30]} />
        </mesh>
        <mesh ref={dirtyWaterRef} position={[-0.55, -0.12, 0.05]} scale={[1, 0.22, 1]} material={waterDirtyMat}>
          <cylinderGeometry args={[0.26, 0.26, 0.54, 26]} />
        </mesh>

        {/* Clean */}
        <mesh position={[0.25, 0.05, 0.05]} material={glassMat}>
          <cylinderGeometry args={[0.28, 0.28, 0.58, 30]} />
        </mesh>
        <mesh ref={cleanWaterRef} position={[0.25, -0.12, 0.05]} scale={[1, 0.25, 1]} material={waterCleanMat}>
          <cylinderGeometry args={[0.26, 0.26, 0.54, 26]} />
        </mesh>
      </group>

      {/* Tap / spout (right) */}
      <group position={[1.05, -0.05, 0.45]}>
        <mesh material={new THREE.MeshStandardMaterial({ color: "#9ca3af", metalness: 0.95, roughness: 0.18 })}>
          <boxGeometry args={[0.26, 0.10, 0.26]} />
        </mesh>
        <mesh position={[0.18, -0.11, 0.0]} material={new THREE.MeshStandardMaterial({ color: "#9ca3af", metalness: 0.95, roughness: 0.18 })}>
          <cylinderGeometry args={[0.03, 0.03, 0.24, 18]} />
        </mesh>
      </group>

      {/* Cup (outside, right-bottom) */}
      <group position={[1.42, -0.68, 0.55]}>
        <mesh material={glassMat}>
          <cylinderGeometry args={[0.18, 0.18, 0.38, 30]} />
        </mesh>
        <mesh position={[0, -0.09, 0]} material={waterCleanMat}>
          <cylinderGeometry args={[0.165, 0.165, 0.18, 26]} />
        </mesh>
      </group>

      {/* === CALLOUTS (right) === */}
      <Html position={[1.38, 0.18, 0.05]} transform occlude style={{ width: 290 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <Callout icon="🧱" title="SEDIMENT FILTER" subtitle="Retiene partículas y sólidos en suspensión." />
          <Callout icon="⚫" title="CARBON FILTER" subtitle="Reduce químicos, cloro y olores." />
          <Callout icon="🧪" title="MINERALIZACIÓN" subtitle="Ajuste de minerales para mejor sabor." />
        </div>
      </Html>

      {/* === PARTICLES BY STEP === */}
      {/* Air intake (left -> inside) */}
      <group position={[-1.30, 0.33, 0.32]}>
        <Particles
          active={step === "air"}
          color="#93c5fd"
          speed={airSpeed}
          size={0.012}
          box={[1.4, 0.55, 0.55]}
          direction={[1, 0, 0]}
          swirl={0.6}
        />
      </group>

      {/* Condensation droplets (down) */}
      <group position={[0.45, 0.42, 0.28]}>
        <Particles
          active={step === "condensation"}
          color="#bfdbfe"
          speed={condSpeed}
          size={0.010}
          box={[0.7, 0.35, 0.35]}
          direction={[0, -1, 0]}
          swirl={0.25}
        />
      </group>

      {/* Filtration flow (left->right) */}
      <group position={[-0.35, 0.00, 0.35]}>
        <Particles
          active={step === "filtration"}
          color="#60a5fa"
          speed={waterSpeed}
          size={0.010}
          box={[1.8, 0.25, 0.25]}
          direction={[1, 0, 0]}
          swirl={0.15}
        />
      </group>

      {/* UV path (center tube) */}
      <group position={[0.20, -0.05, 0.35]}>
        <Particles
          active={step === "uv_tank"}
          color="#a78bfa"
          speed={0.15 + waterSpeed * 0.35}
          size={0.010}
          box={[1.0, 0.25, 0.25]}
          direction={[1, 0, 0]}
          swirl={0.12}
        />
      </group>

      {/* Dispense (down into cup) */}
      <group position={[1.05, -0.20, 0.45]}>
        <Particles
          active={step === "dispense"}
          color="#7dd3fc"
          speed={0.25 + waterSpeed * 0.35}
          size={0.012}
          box={[0.30, 0.55, 0.30]}
          direction={[0, -1, 0]}
          swirl={0.0}
        />
      </group>

      {/* Mineralization (tiny colored) */}
      <group position={[0.05, -0.12, 0.25]}>
        <Particles
          active={step === "mineral"}
          color="#f59e0b"
          speed={0.08 + waterSpeed * 0.18}
          size={0.010}
          box={[0.9, 0.25, 0.25]}
          direction={[1, 0, 0]}
          swirl={0.20}
        />
      </group>
    </group>
  );
}

function StepDots({ stepIndex, setStepIndex }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      {STEPS.map((s, idx) => (
        <button
          key={s.key}
          onClick={() => setStepIndex(idx)}
          aria-label={s.title}
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            background: idx === stepIndex ? "rgba(59,130,246,0.95)" : "rgba(255,255,255,0.55)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          }}
        />
      ))}
    </div>
  );
}

export default function AwgSimulator() {
  const [stepIndex, setStepIndex] = useState(2); // start at Filtration like your screenshot
  const step = STEPS[stepIndex].key;

  const { fluidFlow, tempCondensation } = useControls({
    fluidFlow: { value: 0.62, min: 0, max: 1, step: 0.01, label: "FLUID FLOW" },
    tempCondensation: { value: 0.58, min: 0, max: 1, step: 0.01, label: "TEMP. CONDE..." },
  });

  const [autoPlay, setAutoPlay] = useState(true);
  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => setStepIndex((i) => (i + 1) % STEPS.length), 3200);
    return () => clearInterval(id);
  }, [autoPlay]);

  return (
    <div style={{ height: "100vh", width: "100%", background: "#eaf2ff", position: "relative" }}>
      <Leva collapsed />

      {/* TOP LEFT HEADER */}
      <div
        style={{
          position: "absolute",
          left: 18,
          top: 18,
          zIndex: 10,
          background: "rgba(255,255,255,0.78)",
          borderRadius: 16,
          padding: "10px 12px",
          backdropFilter: "blur(10px)",
          fontFamily: "Inter, system-ui, Arial",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.3 }}>GENERADOR AWG INTERACTIVO</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Paso Actual: {STEPS[stepIndex].title}</div>
      </div>

      {/* BOTTOM LEFT CONTROLS */}
      <div style={{ position: "absolute", left: 18, bottom: 18, zIndex: 10, display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            background: "rgba(255,255,255,0.65)",
            borderRadius: 16,
            padding: "10px 12px",
            backdropFilter: "blur(10px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            fontFamily: "Inter, system-ui, Arial",
            width: 320,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.25 }}>CONTROLES</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Flow {fluidFlow.toFixed(2)} · Cond {tempCondensation.toFixed(2)}
            </div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.72, marginTop: 6 }}>Ajusta sliders (Leva) o navega los pasos.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <UiButton onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0}>
            ◀ Anterior
          </UiButton>
          <UiButton onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))} disabled={stepIndex === STEPS.length - 1}>
            Siguiente ▶
          </UiButton>
          <UiButton onClick={() => setStepIndex(0)}>Reiniciar</UiButton>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <UiButton onClick={() => setAutoPlay((v) => !v)}>{autoPlay ? "⏸ Pausar Demo" : "▶ Demo Auto"}</UiButton>
          <StepDots stepIndex={stepIndex} setStepIndex={setStepIndex} />
        </div>
      </div>

      <Canvas camera={{ position: [3.6, 1.35, 3.35], fov: 32 }}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[5, 6, 3]} intensity={1.25} />
        <Environment preset="warehouse" />
        <AwgModel step={step} fluidFlow={fluidFlow} tempCondensation={tempCondensation} />
        <OrbitControls enablePan={false} minDistance={2.9} maxDistance={7.0} />
      </Canvas>
    </div>
  );
}
