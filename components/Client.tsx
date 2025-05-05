"use client";
import { Canvas, extend, type ThreeToJSXElements } from "@react-three/fiber";
import { type FC, useLayoutEffect, useState } from "react";
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
// import { TheRingPostProcessing } from "@/components/advanced/theRing/TheRingPostProcessing";
import { type WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.js";
import { WebGPURenderer } from "three/webgpu";
import * as THREE from "three/webgpu";

import NotSupported from "@/components/NotSupported";
import {
  backgroundNode,
  TheRingParticles,
  TheRingVideo,
} from "@/components/TheRingScene";
import { UI } from "@/components/UI";

import CameraControls from "./CameraControls";

declare module "@react-three/fiber" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);

type Props = {
  name: string | undefined;
};

const TheRing: FC<Props> = ({ name }) => {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [textPoints, setTextPoints] = useState<Float32Array | null>(null);

  useLayoutEffect(() => {
    setIsSupported(WebGPU.isAvailable());
  }, []);

  if (isSupported === null) return null;
  if (!isSupported) return <NotSupported />;

  return (
    <>
      <Canvas
        className="!fixed inset-0 !h-lvh"
        performance={{ min: 0.5, debounce: 300 }}
        scene={{ backgroundNode: backgroundNode }}
        camera={{ position: [0, 0, 5], far: 10, fov: 70 }}
        flat={true}
        gl={async (props) => {
          const renderer = new WebGPURenderer(
            props as WebGPURendererParameters
          );
          await renderer.init();
          return renderer;
        }}
      >
        <CameraControls />
        <TheRingVideo shouldPlay={!!textPoints} />
        <TheRingParticles textPoints={textPoints} />
      </Canvas>
      <UI name={name} setTextPoints={setTextPoints} />
    </>
  );
};

export default TheRing;
