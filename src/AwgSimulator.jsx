// src/AwgSimulator.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, Html, useGLTF } from "@react-three/drei";
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

// Partículas simples (para “aire/agua”) — se colocan en posiciones ancla
function Particles({ active, color = "#7dd3fc", count = 600, size = 0.01, speed = 0.35, box = [0.6, 0.3, 0.3], direction = [1,0,0] }) {
  const points = useRef();
  const dir = useMemo(() => {
    const d = new THREE.Vector3(...direction);
    if (d.length() === 0) d.set(1,0,0);
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

  useFrame((_, delta) => {
    if (!active || !points.current) return;
    const pos = points.current.geometry.attributes.position.array;
    const hx = box[0] / 2, hy = box[1] / 2, hz = box[2] / 2;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      pos[ix + 0] += dir.x * speed * delta;
      pos[ix + 1] += dir.y * speed * delta;
      pos[ix + 2] += dir.z * speed * delta;

      if (pos[ix + 0] > hx) pos[ix + 0] = -hx;
      if (pos[ix + 0] < -hx) pos[ix + 0] = hx;
      if (pos[ix + 1] > hy) pos[ix + 1] = -hy;
      if (pos[ix + 1] < -hy) pos[ix + 1] = hy;
      if (pos[ix + 2] > hz) pos[ix + 2] = -hz;
      if (pos[ix + 2] < -hz) pos[ix + 2] = hz;
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

/**
 * IMPORTANTE:
 * Este componente espera que tu GLB tenga nombres de nodos “amigables”.
 * Si no, igual funciona (renderiza todo), pero NO podrá animar fan/UV/etc hasta mapearlos.
 */
function AwgGLB({ step, fluidFlow, tempCondensation }) {
  const group = useRef();
  const gltf = useGLTF("/models/awg.glb"); // <- pon aquí tu GLB

  // Ejemplo: intenta encontrar piezas por nombre (ajusta según tu GLB)
  const fan = gltf.scene.getObjectByName("Fan");
  const uv = gltf.scene.getObjectByName("UV");
  const coil = gltf.scene.getObjectByName("Coil");

  useFrame((_, delta) => {
    const flow = clamp01(fluidFlow);
    const cond = clamp01(tempCondensation);

    if (fan) {
      const mult = step === "air" ? 1.0 : 0.15;
      fan.rotation.z += (1.2 + flow * 10.0) * mult * delta;
    }

    if (coil && coil.material && coil.material.emissive) {
      coil.material.emissiveIntensity = step === "condensation" ? 0.25 + 0.9 * cond : 0.08;
    }

    if (uv && uv.material && uv.material.emissive) {
      uv.material.emissiveIntensity = step === "uv_tank" ? 0.7 + 0.8 * flow : 0.12;
    }
  });

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
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
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex].key;

  const { fluidFlow, tempCondensation } = useControls({
    fluidFlow: { value: 0.62, min: 0, max: 1, step: 0.01, label: "FLUID FLOW" },
    tempCondensation: { value: 0.58, min: 0, max: 1, step: 0.01, label: "TEMP. CONDENSACIÓN" },
  });

  const [autoPlay, setAutoPlay] = useState(false);
  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(() => setStepIndex((i) => (i + 1) % STEPS.length), 2800);
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
        <div style={{ fontSize: 12, fontWeight: 900 }}>GENERADOR AWG INTERACTIVO</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>Paso Actual: {STEPS[stepIndex].title}</div>
      </div>

      {/* RIGHT CALLOUTS (like reference) */}
      <div style={{ position: "absolute", right: 18, top: 120, zIndex: 10, display: "grid", gap: 10, width: 340 }}>
        <Callout icon="🧱" title="SEDIMENT FILTER" subtitle="Retiene partículas y sólidos en suspensión." />
        <Callout icon="⚫" title="CARBON FILTER" subtitle="Reduce químicos, cloro y olores." />
        <Callout icon="🧪" title="MINERALIZACIÓN" subtitle="Ajuste de minerales para mejor sabor." />
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
            width: 340,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 12, fontWeight: 900 }}>CONTROLES</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Flow {fluidFlow.toFixed(2)} · Cond {tempCondensation.toFixed(2)}
            </div>
          </div>
          <div style={{ fontSize: 11, opacity: 0.72, marginTop: 6 }}>Usa pasos o activa demo.</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setStepIndex((i) => Math.max(0, i - 1))} style={btnStyle} disabled={stepIndex === 0}>
            ◀ Anterior
          </button>
          <button onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))} style={btnStyle} disabled={stepIndex === STEPS.length - 1}>
            Siguiente ▶
          </button>
          <button onClick={() => setStepIndex(0)} style={btnStyle}>
            Reiniciar
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setAutoPlay((v) => !v)} style={btnStyle}>
            {autoPlay ? "⏸ Pausar Demo" : "▶ Demo Auto"}
          </button>
          <StepDots stepIndex={stepIndex} setStepIndex={setStepIndex} />
        </div>
      </div>

      <Canvas camera={{ position: [2.9, 1.25, 3.4], fov: 32 }}>
        {/* look premium: */}
        <ambientLight intensity={0.65} />
        <directionalLight position={[6, 7, 4]} intensity={1.35} />
        <Environment preset="studio" />

        {/* IMPORTANT: GLB model here */}
        <AwgGLB step={step} fluidFlow={fluidFlow} tempCondensation={tempCondensation} />

        {/* Partículas: por ahora están “globales”; lo ideal es anclarlas a empties del GLB */}
        <group position={[-1.0, 0.45, 0.2]}>
          <Particles active={step === "air"} color="#93c5fd" speed={0.2 + fluidFlow * 0.7} direction={[1, 0, 0]} />
        </group>
        <group position={[0.2, 0.75, 0.0]}>
          <Particles active={step === "condensation"} color="#bfdbfe" speed={0.08 + tempCondensation * 0.4} direction={[0, -1, 0]} />
        </group>
        <group position={[1.05, -0.2, 0.7]}>
          <Particles active={step === "dispense"} color="#7dd3fc" speed={0.25 + fluidFlow * 0.25} direction={[0, -1, 0]} box={[0.2, 0.5, 0.2]} />
        </group>

        <OrbitControls enablePan={false} minDistance={2.6} maxDistance={6.5} />
      </Canvas>
    </div>
  );
}

const btnStyle = {
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  cursor: "pointer",
  background: "rgba(255,255,255,0.75)",
  backdropFilter: "blur(10px)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.14)",
  fontFamily: "Inter, system-ui, Arial",
  fontSize: 13,
  fontWeight: 800,
};
