"use client";

import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Float, useGLTF } from "@react-three/drei";
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
  const { scene } = useGLTF("https://threejs.org/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb");
  const emotion = mood?.emotion.toLowerCase() ?? "neutral";
  const happy = /smile|warmth|radiant|camaraderie|energy|euphoria/.test(emotion);
  const curious = /wonder|curious|contemplation|debugging|wanderlust/.test(emotion);
  const intense = /focus|grit|electric|raw/.test(emotion);
  const face = useMemo(() => scene.clone(), [scene]);

  useFrame((state) => {
    if (faceRef.current) {
      faceRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.025;
      faceRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.38) * 0.06;
    }
    face.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.morphTargetDictionary || !object.morphTargetInfluences) return;
      const names = object.morphTargetDictionary;
      const set = (pattern: RegExp, value: number) => {
        const key = Object.keys(names).find((name) => pattern.test(name));
        if (key) object.morphTargetInfluences![names[key]] = THREE.MathUtils.lerp(object.morphTargetInfluences![names[key]], value, 0.12);
      };
      set(/mouthSmile|smile/i, happy ? 0.72 : 0.02);
      set(/browInnerUp|browOuterUp/i, curious ? 0.48 : intense ? 0.08 : 0.01);
      set(/browDown/i, intense ? 0.34 : 0.01);
      set(/jawOpen/i, curious ? 0.12 : 0.01);
    });
  });

  return (
    <group ref={faceRef} position={[0, -0.72, 0.35]} scale={0.42}>
      <primitive object={face} rotation={[0, Math.PI, 0]} />
      <pointLight color={color} intensity={0.8} distance={2.8} position={[0, 0.35, 0.7]} />
      <Text position={[0, -0.78, 0]} fontSize={0.045} color={color} anchorX="center" anchorY="middle">
        {mood ? mood.emotion.toUpperCase() : "RESTING STATE • OBSERVING"}
      </Text>
    </group>
  );
}

useGLTF.preload("https://threejs.org/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb");

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

function BrainModel({ activeColor }: { activeColor: string }) {
  const brainRef = useRef<THREE.Group>(null);
  const pathways = useMemo(() => Array.from({ length: 24 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    return new THREE.CatmullRomCurve3(Array.from({ length: 7 }, (__, pointIndex) => new THREE.Vector3(
      side * (0.12 + pointIndex * 0.2),
      -0.85 + (index % 7) * 0.28 + Math.sin(pointIndex * 1.8 + index) * 0.12,
      -0.32 + (index % 5) * 0.18 + Math.cos(pointIndex * 1.2 + index) * 0.16,
    )));
  }), []);

  useFrame((state) => {
    if (!brainRef.current) return;
    brainRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.24) * 0.16;
    brainRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.035;
  });

  return (
    <group ref={brainRef} position={[0, 0.55, 0]} scale={0.82}>
      {[-0.58, 0.58].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <sphereGeometry args={[1.35, 48, 32]} />
          <meshPhysicalMaterial color="#9aa6b7" roughness={0.82} metalness={0.05} clearcoat={0.18} transparent opacity={0.88} />
        </mesh>
      ))}
      {pathways.map((pathway, index) => (
        <mesh key={index}>
          <tubeGeometry args={[pathway, 32, index % 4 === 0 ? 0.018 : 0.009, 6, false]} />
          <meshBasicMaterial color={index % 4 === 0 ? activeColor : "#536477"} transparent opacity={index % 4 === 0 ? 0.72 : 0.32} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
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

        <BrainModel activeColor={moodColor} />
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
