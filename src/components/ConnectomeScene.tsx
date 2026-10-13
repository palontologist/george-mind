"use client";

import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float } from "@react-three/drei";
import * as THREE from "three";
import connectomeData from "../data/connectome.json";

export interface Lobe {
  id: string;
  name: string;
  tag: string;
  color: string;
  position: [number, number, number];
  description: string;
  nodes: {
    title: string;
    subtitle: string;
    metrics?: string;
    repo?: string;
    content: string;
  }[];
}

interface ConnectomeSceneProps {
  onSelectLobe: (lobe: Lobe) => void;
  activeLobeId: string | null;
  mood?: {
    emotion: string;
    expression: string;
    aura: string;
  };
}

function MindFace({ mood, color }: { mood?: ConnectomeSceneProps["mood"]; color: string }) {
  const faceRef = useRef<THREE.Group>(null);
  const emotion = mood?.emotion.toLowerCase() ?? "neutral";
  const happy = /smile|warmth|radiant|camaraderie|energy|euphoria/.test(emotion);
  const curious = /wonder|curious|contemplation|debugging|wanderlust/.test(emotion);
  const intense = /focus|grit|electric|raw/.test(emotion);
  // The reference uses a neutral robotic bust: keep the face sculptural and let the brain carry the color.\n  const skin = "#d9d5cc";

  useFrame((state) => {
    if (faceRef.current) {
      faceRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.035;
      faceRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.38) * 0.07;
    }
  });

  return (
    <group ref={faceRef} position={[0, -0.08, 0.4]} scale={0.88}>
      {/* Glass cranial shell: a translucent brain is visible through the upper skull. */}
      <mesh position={[0, 0.52, -0.05]} scale={[1.05, 1.1, 0.92]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshPhysicalMaterial color="#e8e3d8" transparent opacity={0.22} roughness={0.2} metalness={0.05} transmission={0.08} thickness={0.6} clearcoat={1} />
      </mesh>
      <group position={[0, 0.5, -0.1]} scale={[0.9, 0.82, 0.72]}>
        {[-0.4, 0.4].map((x) => (
          <mesh key={x} position={[x, 0, 0]} scale={[0.85, 1, 1]} rotation={[0, x * 0.18, x * 0.12]}>
            <sphereGeometry args={[0.68, 32, 24]} />
            <meshPhysicalMaterial color="#d7d2c8" emissive={color} emissiveIntensity={0.08} roughness={0.58} metalness={0.04} clearcoat={0.4} />
          </mesh>
        ))}
        {[...Array(9)].map((_, i) => (
          <mesh key={i} position={[(i % 3 - 1) * 0.42, 0.15 + Math.floor(i / 3) * 0.2, 0.58]} rotation={[0, 0, (i % 2 ? 1 : -1) * 0.35]}>
            <torusGeometry args={[0.22, 0.025, 8, 24, Math.PI * 1.55]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
        ))}
      </group>
      {/* Anatomical bust and face */}
      <mesh position={[0, -0.83, 0]} scale={[0.48, 0.62, 0.38]}>
        <cylinderGeometry args={[0.82, 1.02, 1.5, 32]} />
        <meshPhysicalMaterial color={skin} roughness={0.62} metalness={0.02} clearcoat={0.18} />
      </mesh>
      <mesh position={[0, 0.02, 0.35]} scale={[0.82, 1.02, 0.72]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshPhysicalMaterial color={skin} roughness={0.58} metalness={0.02} clearcoat={0.2} />
      </mesh>
      {[-0.82, 0.82].map((x) => <mesh key={x} position={[x, 0.02, 0.28]} scale={[0.18, 0.3, 0.12]}><sphereGeometry args={[1, 20, 16]} /><meshPhysicalMaterial color={skin} roughness={0.65} /></mesh>)}
      <mesh position={[0, -0.02, 1.02]} scale={[0.12, 0.28, 0.12]} rotation={[0.1, 0, 0]}><coneGeometry args={[1, 1.5, 20]} /><meshPhysicalMaterial color={skin} roughness={0.6} /></mesh>
      {[-0.32, 0.32].map((x) => (
        <group key={x} position={[x, 0.24, 0.92]} rotation={[0, 0, (curious ? x : 0) * 0.28]}>
          <mesh scale={[0.24, curious ? 0.09 : 0.12, 0.07]}><sphereGeometry args={[1, 24, 16]} /><meshPhysicalMaterial color="#f1d7c9" roughness={0.4} /></mesh>
          <mesh position={[0, 0, 0.08]} scale={0.075}><sphereGeometry args={[1, 16, 12]} /><meshBasicMaterial color="#20151b" /></mesh>
        </group>
      ))}
      <mesh position={[0, happy ? -0.34 : -0.27, 0.91]} rotation={[Math.PI / 2, 0, 0]} scale={[happy ? 0.34 : intense ? 0.16 : 0.23, 0.1, 0.06]}><torusGeometry args={[1, 0.3, 12, 32, Math.PI]} /><meshBasicMaterial color={happy ? "#ff9da9" : "#5c2831"} /></mesh>
      <Text position={[0, -1.62, 0]} fontSize={0.12} color={color} anchorX="center" anchorY="middle">{mood ? mood.emotion.toUpperCase() : "RESTING STATE • OBSERVING"}</Text>
    </group>
  );
}

function NeuralCloud() {
  const count = 2400;
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const baseColor = new THREE.Color("#475569");
    const accentColor = new THREE.Color("#38bdf8");

    for (let i = 0; i < count; i++) {
      // Generate a brain-like dual ellipsoid distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 2.6;

      const hemisphere = Math.random() > 0.5 ? 1 : -1;
      const x = r * Math.sin(phi) * Math.cos(theta) * 1.1 + hemisphere * 0.4;
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.9 + (Math.random() - 0.5) * 0.4;
      const z = r * Math.cos(phi) * 1.3;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const c = Math.random() > 0.85 ? accentColor : baseColor;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.04;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        vertexColors
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function LobeNode({
  lobe,
  onSelect,
  isActive,
}: {
  lobe: Lobe;
  onSelect: (lobe: Lobe) => void;
  isActive: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = hovered || isActive ? 1.4 : 1.0 + Math.sin(state.clock.getElapsedTime() * 2 + lobe.position[0]) * 0.08;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={lobe.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(lobe);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshStandardMaterial
          color={lobe.color}
          emissive={lobe.color}
          emissiveIntensity={hovered || isActive ? 1.8 : 0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Label billboard */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        <Text
          position={[0, 0.32, 0]}
          fontSize={0.14}
          color={hovered || isActive ? "#ffffff" : "#94a3b8"}
          anchorX="center"
          anchorY="middle"
        >
          {lobe.name.toUpperCase()}
        </Text>
        <Text
          position={[0, 0.18, 0]}
          fontSize={0.09}
          color={lobe.color}
          anchorX="center"
          anchorY="middle"
        >
          {lobe.tag}
        </Text>
      </Float>
    </group>
  );
}

export default function ConnectomeScene({
  onSelectLobe,
  activeLobeId,
  mood,
}: ConnectomeSceneProps) {
  const moodColor = mood ? connectomeData.lobes.find((lobe) => lobe.mood?.emotion === mood.emotion)?.color ?? "#38bdf8" : "#38bdf8";
  return (
    <div className="w-full h-full relative bg-[#09090b]">
      <Canvas camera={{ position: [0, 0, 6.2], fov: 45 }}>
        <ambientLight intensity={0.65} />\n        <directionalLight position={[3, 5, 6]} intensity={2.2} color="#fff5e8" />\n        <pointLight position={[-4, 1, 5]} color="#9bdcff" intensity={0.7} />\n        <pointLight position={[3, -3, -2]} color="#38bdf8" intensity={0.35} />

        <NeuralCloud />
        <MindFace mood={mood} color={moodColor} />

        {connectomeData.lobes.map((lobe) => (
          <LobeNode
            key={lobe.id}
            lobe={lobe as unknown as Lobe}
            onSelect={onSelectLobe}
            isActive={activeLobeId === lobe.id}
          />
        ))}

        <OrbitControls
          enablePan={false}
          maxDistance={9}
          minDistance={3.5}
          autoRotate={!activeLobeId}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
