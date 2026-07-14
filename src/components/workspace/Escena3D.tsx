"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { perfilPuntos } from "@/lib/geometry/perfil";
import type { TipoPerfil } from "@/lib/calc/params";

export interface Escena3DProps {
  modo: "lona" | "baqueton";
  largo: number; ancho: number;
  altoDelante: number; altoAtras: number;
  tipoPerfil: TipoPerfil;
  llevaCurva: boolean; radioCurva?: number;
  baqueton?: number;
  onSnapshotReady?: (getSnapshot: (() => string) | null) => void;
}

const LONA = "#3b82c4"; // azul neutro; solo referencia de forma

function CuerpoLona({ p }: { p: Escena3DProps }) {
  const geom = useMemo(() => {
    const pts = perfilPuntos(p.tipoPerfil, {
      ancho: p.ancho,
      altoDelante: Math.max(p.altoDelante, p.altoAtras),
      radio: p.llevaCurva ? p.radioCurva ?? 15 : 15,
    });
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x - p.ancho / 2, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: p.largo, bevelEnabled: false });
    g.translate(0, 0, -p.largo / 2);
    return g;
  }, [p.tipoPerfil, p.ancho, p.altoDelante, p.altoAtras, p.largo, p.llevaCurva, p.radioCurva]);

  return (
    <mesh geometry={geom} castShadow>
      <meshStandardMaterial color={LONA} roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

function CuerpoBaqueton({ p }: { p: Escena3DProps }) {
  const alto = Math.max(p.baqueton ?? 20, 1);
  const rTubo = 2.5;
  return (
    <group>
      <mesh position={[0, alto / 2, 0]} castShadow>
        <boxGeometry args={[p.ancho, alto, p.largo]} />
        <meshStandardMaterial color={LONA} roughness={0.55} />
      </mesh>
      {/* tubo del baquetón en las 4 aristas superiores */}
      {[
        { pos: [0, alto, -p.largo / 2], rot: [0, 0, Math.PI / 2], len: p.ancho },
        { pos: [0, alto, p.largo / 2], rot: [0, 0, Math.PI / 2], len: p.ancho },
        { pos: [-p.ancho / 2, alto, 0], rot: [Math.PI / 2, 0, 0], len: p.largo },
        { pos: [p.ancho / 2, alto, 0], rot: [Math.PI / 2, 0, 0], len: p.largo },
      ].map((t, i) => (
        <mesh key={i} position={t.pos as [number, number, number]} rotation={t.rot as [number, number, number]}>
          <cylinderGeometry args={[rTubo, rTubo, t.len, 16]} />
          <meshStandardMaterial color="#666a70" roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Snapshot({ onReady }: { onReady?: Escena3DProps["onSnapshotReady"] }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    onReady?.(() => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    });
    return () => onReady?.(null);
  }, [gl, scene, camera, onReady]);
  return null;
}

export function Escena3D(props: Escena3DProps) {
  const valido = props.largo > 0 && props.ancho > 0 &&
    (props.modo === "baqueton" ? (props.baqueton ?? 0) > 0 : props.altoDelante > 0);
  const dist = Math.max(props.largo, props.ancho, 200) * 1.6;

  return (
    <div className="h-full min-h-[320px] w-full rounded-xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-neutral-200">
      {valido ? (
        <Canvas
          shadows
          gl={{ preserveDrawingBuffer: true }}
          camera={{ position: [dist * 0.7, dist * 0.45, dist * 0.7], fov: 35, near: 1, far: dist * 10 }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[dist, dist, dist / 2]} intensity={1.1} castShadow />
          {props.modo === "lona" ? <CuerpoLona p={props} /> : <CuerpoBaqueton p={props} />}
          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={dist * 2} blur={2} />
          <Environment preset="city" />
          <OrbitControls makeDefault enableDamping target={[0, Math.max(props.altoDelante || 0, props.baqueton ?? 0) / 2, 0]} />
          <Snapshot onReady={props.onSnapshotReady} />
        </Canvas>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-neutral-400">
          Introduce medidas para ver la forma…
        </div>
      )}
    </div>
  );
}
