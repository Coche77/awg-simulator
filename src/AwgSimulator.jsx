// src/AwgSimulator.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, Html } from "@react-three/drei";
import { Leva, useControls } from "leva";

const STEPS = [
  { key: "air", title: "Entrada de aire" },
  { key: "condensation", title: "Condensación" },
  { key: "filtration", title: "Filtración" },
  { key: "uv_tank", title: "UV + Tanque" },
  { key: "dispense", title: "Dispensado" },
  { key: "mineral", title: "Purificación y Mineralización" },
];

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/* ----------------------------- UI helpers ----------------------------- */

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
        background: disabled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.78)",
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
            background:
              idx === stepIndex ? "rgba(59,130,246,0.95)" : "rgba(255,255,255,0.55)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          }}
        />
      ))}
    </div>
  );
}

function Callout({ title, subtitle, icon = "💧" }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.86)",
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
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

/* ----------------------------- Particles ----------------------------- */

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
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.92}
        depthWrite={false}
      />
    </points>
  );
}

/* ----------------------------- 3D Model ------------------------------ */
/**
 * IMPORTANT:
 * Para replicar EXACTO tu imagen final, necesitarías un modelo 3D real (GLB).
 * Esto es un "mock" 3D para que visualmente se parezca (cutaway + componentes).
 */

function Panel({ pos, size, color = "#d7dbe2", opacity = 1 }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        metalness={0.75}
        roughness={0.22}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

function MachineShell() {
  // Carcasa tipo cutaway (frente abierto)
  const W = 4.0;
  const H = 2.4;
  const D = 2.2;
  const t = 0.12;

  return (
    <group>
      {/* Fondo */}
      <Panel pos={[0, 0, -D / 2 + t / 2]} size={[W, H, t]} color="#cfd5de" />

      {/* Laterales */}
      <Panel pos={[-W / 2 + t / 2, 0, 0]} size={[t, H, D]} color="#d7dbe2" />
      <Panel pos={[W / 2 - t / 2, 0, 0]} size={[t, H, D]} color="#d7dbe2" />

      {/* Techo / Piso */}
      <Panel pos={[0, H / 2 - t / 2, 0]} size={[W, t, D]} color="#d7dbe2" />
      <Panel pos={[0, -H / 2 + t / 2, 0]} size={[W, t, D]} color="#c7cdd7" />

      {/* Marco frontal */}
      <Panel pos={[0, 0, D / 2 - t / 2]} size={[W, H, t]} opacity={0.12} color="#eef2f7" />
      {/* “Bisel” interior (linea visual) */}
      <Panel
        pos={[0, 0, D / 2 - 0.02]}
        size={[W - 0.5, H - 0.5, 0.02]}
        opacity={0.35}
        color="#ffffff"
      />
    </group>
  );
}

function Fan({ flow = 0.6, step }) {
  const fanRef = useRef();
  useFrame((_, delta) => {
    if (!fanRef.current) return;
    const mult = step === "air" ? 1 : 0.25;
    fanRef.current.rotation.z += (1.5 + flow * 10) * mult * delta;
  });

  return (
    <group position={[-1.55, 0.4, -0.4]}>
      <mesh>
        <circleGeometry args={[0.42, 48]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
      </mesh>

      <mesh ref={fanRef} position={[0, 0, 0.02]}>
        <circleGeometry args={[0.36, 36]} />
        <meshStandardMaterial color="#1f2937" roughness={0.45} metalness={0.35} />
      </mesh>

      {/* rejilla */}
      <mesh position={[0, 0, 0.04]}>
        <ringGeometry args={[0.1, 0.42, 48]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
}

function Coil({ step, cond = 0.55 }) {
  const coilGroup = useRef();

  const coilMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1d4ed8"),
      metalness: 0.35,
      roughness: 0.28,
      emissive: new THREE.Color("#60a5fa"),
      emissiveIntensity: 0.06,
    });
  }, []);

  const copperMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#b45309"),
      metalness: 0.85,
      roughness: 0.28,
    });
  }, []);

  useFrame((_, delta) => {
    if (!coilGroup.current) return;
    // micro motion para vida
    coilGroup.current.rotation.y += 0.12 * delta;
    coilGroup.current.rotation.x += 0.06 * delta;

    if (step === "condensation") {
      coilMat.emissiveIntensity = 0.18 + clamp01(cond) * 0.9;
    } else {
      coilMat.emissiveIntensity = 0.06;
    }
  });

  return (
    <group ref={coilGroup} position={[0.25, 0.65, -0.1]}>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[i * 0.14 - 0.35, 0, 0]} material={coilMat}>
          <torusGeometry args={[0.42, 0.055, 18, 100]} />
        </mesh>
      ))}
      <mesh position={[0.55, 0, 0]} material={copperMat}>
        <torusGeometry args={[0.5, 0.03, 18, 100]} />
      </mesh>
    </group>
  );
}

function Filters() {
  const pipeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#111827"),
        metalness: 0.25,
        roughness: 0.55,
      }),
    []
  );

  return (
    <group position={[-0.25, -0.05, -0.1]}>
      {/* línea */}
      <mesh material={pipeMat} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 2.3, 22]} />
      </mesh>

      {/* cartuchos */}
      <mesh position={[-0.65, 0, 0]} material={pipeMat}>
        <cylinderGeometry args={[0.16, 0.16, 0.45, 24]} />
      </mesh>
      <mesh
        position={[0, 0, 0]}
        material={new THREE.MeshStandardMaterial({
          color: new THREE.Color("#374151"),
          metalness: 0.25,
          roughness: 0.55,
        })}
      >
        <cylinderGeometry args={[0.16, 0.16, 0.45, 24]} />
      </mesh>
      <mesh position={[0.65, 0, 0]} material={pipeMat}>
        <cylinderGeometry args={[0.16, 0.16, 0.45, 24]} />
      </mesh>
    </group>
  );
}

function UVTube({ step, flow = 0.6 }) {
  const uvRef = useRef();

  const uvMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#7c3aed"),
      emissive: new THREE.Color("#a78bfa"),
      emissiveIntensity: 0.12,
      metalness: 0.15,
      roughness: 0.35,
    });
  }, []);

  useFrame(() => {
    uvMat.emissiveIntensity = step === "uv_tank" ? 0.7 + clamp01(flow) * 0.9 : 0.12;
  });

  return (
    <mesh ref={uvRef} position={[0.35, -0.05, 0.25]} material={uvMat}>
      <cylinderGeometry args={[0.075, 0.075, 1.35, 20]} />
    </mesh>
  );
}

function Tanks({ step }) {
  const glassMat = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#ffffff"),
      transparent: true,
      opacity: 0.16,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 1.0,
      thickness: 0.15,
      ior: 1.45,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1,
    });
  }, []);

  const waterMatDirty = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#9ca3af"),
      transparent: true,
      opacity: 0.55,
      roughness: 0.15,
      metalness: 0.0,
    });
  }, []);

  const waterMatClean = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#60a5fa"),
      transparent: true,
      opacity: 0.55,
      roughness: 0.12,
      metalness: 0.0,
    });
  }, []);

  const dirtyRef = useRef();
  const cleanRef = useRef();

  useFrame((_, delta) => {
    if (!dirtyRef.current || !cleanRef.current) return;

    const targetDirty = step === "filtration" || step === "condensation" ? 0.22 : 0.30;
    const targetClean = step === "uv_tank" || step === "dispense" || step === "mineral" ? 0.42 : 0.28;

    dirtyRef.current.scale.y += (targetDirty - dirtyRef.current.scale.y) * (1 - Math.pow(0.001, delta));
    cleanRef.current.scale.y += (targetClean - cleanRef.current.scale.y) * (1 - Math.pow(0.001, delta));
  });

  return (
    <group position={[-0.1, -0.95, -0.15]}>
      {/* dirty */}
      <mesh position={[-0.85, 0.25, 0.15]} material={glassMat}>
        <cylinderGeometry args={[0.42, 0.42, 1.05, 32]} />
      </mesh>
      <mesh
        ref={dirtyRef}
        position={[-0.85, -0.1, 0.15]}
        scale={[1, 0.3, 1]}
        material={waterMatDirty}
      >
        <cylinderGeometry args={[0.395, 0.395, 0.98, 30]} />
      </mesh>

      {/* clean */}
      <mesh position={[0.35, 0.25, 0.15]} material={glassMat}>
        <cylinderGeometry args={[0.42, 0.42, 1.05, 32]} />
      </mesh>
      <mesh
        ref={cleanRef}
        position={[0.35, -0.1, 0.15]}
        scale={[1, 0.28, 1]}
        material={waterMatClean}
      >
        <cylinderGeometry args={[0.395, 0.395, 0.98, 30]} />
      </mesh>
    </group>
  );
}

function Faucet() {
  const metal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#9ca3af"),
        metalness: 0.95,
        roughness: 0.18,
      }),
    []
  );

  return (
    <group position={[1.65, -0.35, 0.75]}>
      <mesh material={metal}>
        <boxGeometry args={[0.35, 0.12, 0.35]} />
      </mesh>
      <mesh position={[0.22, -0.18, 0]} material={metal}>
        <cylinderGeometry args={[0.035, 0.035, 0.35, 18]} />
      </mesh>
      <mesh position={[0.22, -0.36, 0]} material={metal}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 18]} />
      </mesh>
    </group>
  );
}

function Cup() {
  const glass = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#ffffff"),
      transparent: true,
      opacity: 0.18,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 1.0,
      thickness: 0.12,
      ior: 1.45,
      clearcoat: 0.3,
      clearcoatRoughness: 0.12,
    });
  }, []);

  const water = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#60a5fa"),
      transparent: true,
      opacity: 0.55,
      roughness: 0.12,
      metalness: 0.0,
    });
  }, []);

  return (
    <group position={[2.05, -1.1, 0.75]}>
      <mesh material={glass}>
        <cylinderGeometry args={[0.25, 0.25, 0.55, 28]} />
      </mesh>
      <mesh position={[0, -0.1, 0]} material={water}>
        <cylinderGeometry args={[0.23, 0.23, 0.28, 24]} />
      </mesh>
    </group>
  );
}

function AwgScene({ step, fluidFlow, tempCondensation }) {
  // Velocidades de partículas
  const airSpeed = 0.22 + clamp01(fluidFlow) * 0.75;
  const waterSpeed = 0.15 + clamp01(fluidFlow) * 1.0;
  const condSpeed = 0.1 + clamp01(tempCondensation) * 0.5;

  return (
    <group position={[0, -0.05, 0]}>
      {/* Carcasa cutaway */}
      <MachineShell />

      {/* Componentes internos */}
      <Fan flow={fluidFlow} step={step} />
      <Coil step={step} cond={tempCondensation} />
      <Filters />
      <UVTube step={step} flow={fluidFlow} />
      <Tanks step={step} />
      <Faucet />
      <Cup />

      {/* Callouts derecha (simulan los globos de tu referencia) */}
      <Html position={[1.6, 0.25, 0.05]} transform style={{ width: 300 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <Callout icon="🧱" title="SEDIMENT FILTER" subtitle="Retiene partículas y sólidos." />
          <Callout icon="⚫" title="CARBON FILTER" subtitle="Reduce químicos, cloro y olores." />
          <Callout icon="🧪" title="MINERALIZACIÓN" subtitle="Ajuste de minerales para mejor sabor." />
        </div>
      </Html>

      {/* Partículas por paso (posiciones parecidas a tu imagen) */}
      {/* Aire entrando (izquierda al ventilador) */}
      <group position={[-2.05, 0.4, -0.4]}>
        <Particles
          active={step === "air"}
          color="#93c5fd"
          speed={airSpeed}
          size={0.012}
          box={[1.2, 0.55, 0.55]}
          direction={[1, 0, 0]}
          swirl={0.6}
        />
      </group>

      {/* Condensación (bajando en la zona de coil) */}
      <group position={[0.25, 0.55, -0.1]}>
        <Particles
          active={step === "condensation"}
          color="#bfdbfe"
          speed={condSpeed}
          size={0.01}
          box={[0.8, 0.45, 0.45]}
          direction={[0, -1, 0]}
          swirl={0.25}
        />
      </group>

      {/* Filtración (flujo horizontal por cartuchos) */}
      <group position={[-0.25, -0.05, -0.1]}>
        <Particles
          active={step === "filtration"}
          color="#60a5fa"
          speed={waterSpeed}
          size={0.01}
          box={[2.3, 0.22, 0.22]}
          direction={[1, 0, 0]}
          swirl={0.18}
        />
      </group>

      {/* UV + Tank */}
      <group position={[0.35, -0.05, 0.25]}>
        <Particles
          active={step === "uv_tank"}
          color="#a78bfa"
          speed={0.15 + waterSpeed * 0.35}
          size={0.01}
          box={[1.3, 0.25, 0.25]}
          direction={[1, 0, 0]}
          swirl={0.12}
        />
      </group>

      {/* Dispensado (chorro vertical) */}
      <group position={[1.65, -0.8, 0.75]}>
        <Particles
          active={step === "dispense"}
          color="#7dd3fc"
          speed={0.25 + waterSpeed * 0.35}
          size={0.012}
          box={[0.35, 0.75, 0.35]}
          direction={[0, -1, 0]}
          swirl={0.0}
        />
      </group>

      {/* Mineralización (partículas doradas pequeñas) */}
      <group position={[0.1, -0.25, 0.05]}>
        <Particles
          active={step === "mineral"}
          color="#f59e0b"
          speed={0.1 + waterSpeed * 0.22}
          size={0.01}
          box={[1.2, 0.25, 0.25]}
          direction={[1, 0, 0]}
          swirl={0.22}
        />
      </group>
    </group>
  );
}

/* ------------------------------ App Shell ----------------------------- */

export default function AwgSimulator() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex].key;

  const { fluidFlow, tempCondensation } = useControls({
    fluidFlow: { value: 0.62, min: 0, max: 1, step: 0.01, label: "FLUID FLOW" },
    tempCondensation: {
      value: 0.58,
      min: 0,
      max: 1,
      step: 0.01,
      label: "TEMP. CONDENSACIÓN",
    },
  });

  const [autoPlay, setAutoPlay] = useState(false);
  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, 3200);
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
          background: "rgba(255,255,255,0.74)",
          borderRadius: 16,
          padding: "10px 12px",
          backdropFilter: "blur(10px)",
          fontFamily: "Inter, system-ui, Arial",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.3 }}>
          GENERADOR AWG INTERACTIVO
        </div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
          Paso Actual: {STEPS[stepIndex].title}
        </div>
      </div>

      {/* BOTTOM LEFT CONTROLS */}
      <div
        style={{
          position: "absolute",
          left: 18,
          bottom: 18,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.62)",
            borderRadius: 16,
            padding: "10px 12px",
            backdropFilter: "blur(10px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            fontFamily: "Inter, system-ui, Arial",
            width: 340,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.25 }}>CONTROLES</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Flow {fluidFlow.toFixed(2)} · Cond {tempCondensation.toFixed(2)}
            </div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
            Ajusta sliders en el panel (Leva) o navega los pasos.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <UiButton onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0}>
            ◀ Anterior
          </UiButton>
          <UiButton
            onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
            disabled={stepIndex === STEPS.length - 1}
          >
            Siguiente ▶
          </UiButton>
          <UiButton onClick={() => setStepIndex(0)}>Reiniciar</UiButton>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <UiButton onClick={() => setAutoPlay((v) => !v)}>{autoPlay ? "⏸ Pausar Demo" : "▶ Demo Auto"}</UiButton>
          <StepDots stepIndex={stepIndex} setStepIndex={setStepIndex} />
        </div>
      </div>

      <Canvas camera={{ position: [5.2, 1.8, 5.2], fov: 33 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 7, 4]} intensity={1.25} />
        <Environment preset="warehouse" />

        <AwgScene step={step} fluidFlow={fluidFlow} tempCondensation={tempCondensation} />

        <OrbitControls enablePan={false} minDistance={4.0} maxDistance={9.5} />
      </Canvas>
    </div>
  );
}
