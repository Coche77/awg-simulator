// src/AwgSimulator.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
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
  { key: "mineral", title: "Mineralización" },
];

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/* ------------------------------ Partículas ------------------------------ */
function Particles({
  count = 700,
  color = "#7dd3fc",
  size = 0.012,
  speed = 0.35,
  active = true,
  box = [1.2, 0.6, 0.6],
  direction = [1, 0, 0],
  swirl = 0.0,
  opacity = 0.9,
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

      // loop
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
        opacity={opacity}
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------ UI helpers ------------------------------ */
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
        fontWeight: 700,
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
        background: "rgba(255,255,255,0.88)",
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
        <div style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.1 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, opacity: 0.72, marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- AWG 3D model ----------------------------- */
function AwgModel({ step, fluidFlow = 0.6, tempCondensation = 0.55 }) {
  const group = useRef();
  const fanRef = useRef();
  const uvRef = useRef();
  const dirtyWaterRef = useRef();
  const cleanWaterRef = useRef();

  const metalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#d9dde4"),
        metalness: 0.65,
        roughness: 0.22,
      }),
    []
  );

  const darkInteriorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#0b1220"),
        metalness: 0.0,
        roughness: 0.9,
      }),
    []
  );

  const panelEdgeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#bfc6d2"),
        metalness: 0.55,
        roughness: 0.28,
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

  const coilBlueMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#2563eb"),
        metalness: 0.35,
        roughness: 0.32,
        emissive: new THREE.Color("#1d4ed8"),
        emissiveIntensity: 0.05,
      }),
    []
  );

  const coilCopperMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#b45309"),
        metalness: 0.75,
        roughness: 0.35,
      }),
    []
  );

  const uvMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#7c3aed"),
        emissive: new THREE.Color("#a78bfa"),
        emissiveIntensity: 0.12,
        metalness: 0.1,
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
        roughness: 0.08,
        metalness: 0.0,
        transmission: 1.0,
        thickness: 0.15,
        ior: 1.45,
        clearcoat: 0.4,
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
      }),
    []
  );

  const waterCleanMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#60a5fa"),
        transparent: true,
        opacity: 0.55,
        roughness: 0.15,
      }),
    []
  );

  // Cámara/poses por paso (sutil)
  useEffect(() => {
    if (!group.current) return;

    const targetRotY = (() => {
      if (step === "air") return 0.35;
      if (step === "condensation") return 0.55;
      if (step === "filtration") return 0.25;
      if (step === "uv_tank") return 0.05;
      if (step === "dispense") return -0.15;
      if (step === "mineral") return 0.2;
      return 0.25;
    })();

    group.current.rotation.y = targetRotY;
  }, [step]);

  useFrame((state, delta) => {
    const flow = clamp01(fluidFlow);
    const cond = clamp01(tempCondensation);

    if (fanRef.current) {
      const base = 1.6 + flow * 10.0;
      fanRef.current.rotation.z += base * (step === "air" ? 1.0 : 0.25) * delta;
    }

    // coil "cold glow"
    coilBlueMat.emissiveIntensity = step === "condensation" ? 0.25 + cond * 0.8 : 0.05;

    // UV glow
    if (uvRef.current) {
      uvMat.emissiveIntensity = step === "uv_tank" ? 0.7 + flow * 0.8 : 0.12;
    }

    // niveles agua
    if (dirtyWaterRef.current) {
      const target = step === "filtration" || step === "condensation" ? 0.18 : 0.25;
      dirtyWaterRef.current.scale.y += (target - dirtyWaterRef.current.scale.y) * (1 - Math.pow(0.001, delta));
    }
    if (cleanWaterRef.current) {
      const target = step === "uv_tank" || step === "dispense" || step === "mineral" ? 0.34 : 0.22;
      cleanWaterRef.current.scale.y += (target - cleanWaterRef.current.scale.y) * (1 - Math.pow(0.001, delta));
    }
  });

  // velocidades partículas
  const airSpeed = 0.22 + clamp01(fluidFlow) * 0.75;
  const waterSpeed = 0.15 + clamp01(fluidFlow) * 1.0;
  const condSpeed = 0.09 + clamp01(tempCondensation) * 0.55;

  // Dimensiones carcasa estilo referencia (frente abierto)
  const W = 2.55; // ancho
  const H = 1.65; // alto
  const D = 1.55; // fondo
  const t = 0.08; // grosor panel
  const frontZ = D / 2; // frente abierto

  return (
    <group ref={group} position={[0, -0.25, 0]}>
      {/* ---------------- CARCASA tipo "cutaway": paneles, frente abierto ---------------- */}
      {/* techo */}
      <mesh position={[0, H / 2 - t / 2, 0]} material={metalMat}>
        <boxGeometry args={[W, t, D]} />
      </mesh>
      {/* base */}
      <mesh position={[0, -H / 2 + t / 2, 0]} material={metalMat}>
        <boxGeometry args={[W, t, D]} />
      </mesh>
      {/* lado izquierdo */}
      <mesh position={[-W / 2 + t / 2, 0, 0]} material={metalMat}>
        <boxGeometry args={[t, H, D]} />
      </mesh>
      {/* lado derecho */}
      <mesh position={[W / 2 - t / 2, 0, 0]} material={metalMat}>
        <boxGeometry args={[t, H, D]} />
      </mesh>
      {/* panel trasero */}
      <mesh position={[0, 0, -D / 2 + t / 2]} material={metalMat}>
        <boxGeometry args={[W, H, t]} />
      </mesh>

      {/* borde interior (marco) para que parezca carcasa premium */}
      <mesh position={[0, 0, frontZ - t]} material={panelEdgeMat}>
        <boxGeometry args={[W - 0.18, H - 0.18, 0.02]} />
      </mesh>

      {/* interior oscuro (placa del fondo interior) */}
      <mesh position={[0, 0, -D / 2 + t + 0.02]} material={darkInteriorMat}>
        <boxGeometry args={[W - 0.18, H - 0.18, 0.02]} />
      </mesh>

      {/* ---------------- COMPONENTES internos (reubicados estilo referencia) ---------------- */}
      {/* Fan (izquierda) */}
      <group position={[-W / 2 + 0.34, 0.32, 0.25]}>
        <mesh>
          <circleGeometry args={[0.26, 44]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.15} />
        </mesh>
        <mesh ref={fanRef} position={[0, 0, 0.02]}>
          <circleGeometry args={[0.22, 36]} />
          <meshStandardMaterial color="#1f2937" roughness={0.45} metalness={0.35} />
        </mesh>
      </group>

      {/* Coil (derecha-arriba) */}
      <group position={[0.45, 0.38, 0.15]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[i * 0.085 - 0.21, 0, 0]} material={coilBlueMat}>
            <torusGeometry args={[0.29, 0.038, 16, 90]} />
          </mesh>
        ))}
        <mesh position={[0.34, 0, 0]} material={coilCopperMat}>
          <torusGeometry args={[0.33, 0.02, 16, 90]} />
        </mesh>
      </group>

      {/* Línea filtros (centro) */}
      <group position={[-0.35, -0.08, 0.34]}>
        <mesh material={pipeMat} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.085, 0.085, 1.55, 22]} />
        </mesh>

        {[
          { x: -0.52, c: "#111827" },
          { x: 0.0, c: "#374151" },
          { x: 0.52, c: "#111827" },
        ].map((s, idx) => (
          <mesh
            key={idx}
            position={[s.x, 0, 0]}
            material={new THREE.MeshStandardMaterial({
              color: s.c,
              metalness: 0.25,
              roughness: 0.55,
            })}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.13, 0.13, 0.32, 22]} />
          </mesh>
        ))}
      </group>

      {/* UV (derecha-centro) */}
      <mesh ref={uvRef} position={[0.28, -0.03, 0.34]} material={uvMat} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.92, 18]} />
      </mesh>

      {/* Tanques (abajo) */}
      <group position={[-0.2, -0.60, 0.08]}>
        {/* tanque sucio */}
        <mesh position={[-0.55, 0.15, 0.2]} material={glassMat}>
          <cylinderGeometry args={[0.27, 0.27, 0.58, 30]} />
        </mesh>
        <mesh
          ref={dirtyWaterRef}
          position={[-0.55, 0.00, 0.2]}
          scale={[1, 0.25, 1]}
          material={waterDirtyMat}
        >
          <cylinderGeometry args={[0.255, 0.255, 0.52, 26]} />
        </mesh>

        {/* tanque limpio */}
        <mesh position={[0.15, 0.15, 0.2]} material={glassMat}>
          <cylinderGeometry args={[0.27, 0.27, 0.58, 30]} />
        </mesh>
        <mesh
          ref={cleanWaterRef}
          position={[0.15, 0.00, 0.2]}
          scale={[1, 0.22, 1]}
          material={waterCleanMat}
        >
          <cylinderGeometry args={[0.255, 0.255, 0.52, 26]} />
        </mesh>
      </group>

      {/* Grifo exterior (derecha) */}
      <group position={[W / 2 - 0.18, -0.05, 0.48]}>
        <mesh material={new THREE.MeshStandardMaterial({ color: "#9ca3af", metalness: 0.95, roughness: 0.18 })}>
          <boxGeometry args={[0.26, 0.09, 0.26]} />
        </mesh>
        <mesh position={[0.18, -0.10, 0.0]} material={new THREE.MeshStandardMaterial({ color: "#9ca3af", metalness: 0.95, roughness: 0.18 })}>
          <cylinderGeometry args={[0.03, 0.03, 0.22, 18]} />
        </mesh>
      </group>

      {/* Vaso exterior */}
      <group position={[W / 2 + 0.25, -0.78, 0.55]}>
        <mesh material={glassMat}>
          <cylinderGeometry args={[0.18, 0.18, 0.36, 28]} />
        </mesh>
        <mesh position={[0, -0.08, 0]} material={waterCleanMat}>
          <cylinderGeometry args={[0.165, 0.165, 0.18, 24]} />
        </mesh>
      </group>

      {/* ---------------- CALL OUTS (derecha) ---------------- */}
      <Html position={[W / 2 + 0.38, 0.10, 0.05]} transform occlude style={{ width: 300 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <Callout icon="🧱" title="SEDIMENT FILTER" subtitle="Retiene partículas y sólidos en suspensión." />
          <Callout icon="⚫" title="CARBON FILTER" subtitle="Reduce químicos, cloro y olores." />
          <Callout icon="🧪" title="MINERALIZACIÓN" subtitle="Ajuste de minerales para mejor sabor." />
        </div>
      </Html>

      {/* ---------------- Partículas por paso (alineadas al equipo) ---------------- */}
      {/* entrada aire (izq → dentro) */}
      <group position={[-W / 2 - 0.35, 0.32, 0.25]}>
        <Particles
          active={step === "air"}
          color="#93c5fd"
          speed={airSpeed}
          size={0.012}
          box={[1.2, 0.42, 0.42]}
          direction={[1, 0, 0]}
          swirl={0.6}
          opacity={0.85}
        />
      </group>

      {/* condensación (baja desde coil) */}
      <group position={[0.45, 0.38, 0.15]}>
        <Particles
          active={step === "condensation"}
          color="#bfdbfe"
          speed={condSpeed}
          size={0.01}
          box={[0.65, 0.35, 0.35]}
          direction={[0, -1, 0]}
          swirl={0.25}
          opacity={0.85}
        />
      </group>

      {/* filtración (flujo horizontal) */}
      <group position={[-0.35, -0.08, 0.34]}>
        <Particles
          active={step === "filtration"}
          color="#60a5fa"
          speed={waterSpeed}
          size={0.01}
          box={[1.55, 0.22, 0.22]}
          direction={[1, 0, 0]}
          swirl={0.15}
          opacity={0.9}
        />
      </group>

      {/* UV + tanque */}
      <group position={[0.28, -0.03, 0.34]}>
        <Particles
          active={step === "uv_tank"}
          color="#a78bfa"
          speed={0.12 + waterSpeed * 0.35}
          size={0.01}
          box={[0.95, 0.22, 0.22]}
          direction={[1, 0, 0]}
          swirl={0.1}
          opacity={0.85}
        />
      </group>

      {/* dispensado (caída al vaso) */}
      <group position={[W / 2 + 0.02, -0.22, 0.48]}>
        <Particles
          active={step === "dispense"}
          color="#7dd3fc"
          speed={0.25 + waterSpeed * 0.35}
          size={0.012}
          box={[0.22, 0.55, 0.22]}
          direction={[0, -1, 0]}
          swirl={0.0}
          opacity={0.9}
        />
      </group>

      {/* mineralización (puntos cálidos dentro) */}
      <group position={[0.10, -0.10, 0.26]}>
        <Particles
          active={step === "mineral"}
          color="#f59e0b"
          speed={0.08 + waterSpeed * 0.18}
          size={0.01}
          box={[0.85, 0.25, 0.25]}
          direction={[1, 0, 0]}
          swirl={0.22}
          opacity={0.75}
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

/* ---------------------------------- APP --------------------------------- */
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
    const id = setInterval(() => setStepIndex((i) => (i + 1) % STEPS.length), 3200);
    return () => clearInterval(id);
  }, [autoPlay]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        position: "relative",
        background: "radial-gradient(1200px 600px at 30% 20%, #ffffff 0%, #eaf2ff 45%, #dbeafe 100%)",
        overflow: "hidden",
      }}
    >
      <Leva collapsed />

      {/* TOP LEFT */}
      <div
        style={{
          position: "absolute",
          left: 18,
          top: 18,
          zIndex: 10,
          background: "rgba(255,255,255,0.80)",
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

      {/* BOTTOM LEFT */}
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
            background: "rgba(255,255,255,0.70)",
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
            Ajusta sliders (Leva) o navega los pasos.
          </div>
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
          <UiButton onClick={() => setAutoPlay((v) => !v)}>
            {autoPlay ? "⏸ Pausar Demo" : "▶ Demo Auto"}
          </UiButton>
          <StepDots stepIndex={stepIndex} setStepIndex={setStepIndex} />
        </div>
      </div>

      <Canvas camera={{ position: [3.25, 1.15, 3.25], fov: 32 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[6, 7, 3]} intensity={1.2} />
        <Environment preset="warehouse" />

        <AwgModel step={step} fluidFlow={fluidFlow} tempCondensation={tempCondensation} />

        <OrbitControls enablePan={false} minDistance={2.5} maxDistance={6.0} />
      </Canvas>
    </div>
  );
}
