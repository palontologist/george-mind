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
}: ConnectomeSceneProps) {
  return (
    <div className="w-full h-full relative bg-[#09090b]">
      <Canvas camera={{ position: [0, 0, 6.2], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <pointLight position={[-10, -10, -10]} color="#38bdf8" intensity={0.8} />

        <NeuralCloud />

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
