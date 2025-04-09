import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

// Spinning cube component
const SpinningCube = () => {
  const cubeRef = useRef();

  useFrame(() => {
    if (cubeRef.current) {
      cubeRef.current.rotation.y += 0.01;
      cubeRef.current.rotation.x += 0.005;
    }
  });

  return (
    <mesh ref={cubeRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#3b82f6" /> {/* Tailwind blue-500 */}
    </mesh>
  );
};

// Hero canvas background component
const HeroSection = () => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        <SpinningCube />
      </Canvas>
    </div>
  );
};

export default HeroSection;
