import React from 'react';
import { create } from 'zustand'

import { Scene } from '../webxr/js/scene.mjs';
import { Renderer } from './renderer.js';
import { Env } from '../webxr/js/viewlayer/env.mjs';


type State = {
  renderer: Renderer | null;
  env: Env;
}


const GL = WebGL2RenderingContext;


interface Action {
  setRenderer(renderer: Renderer): void;
}


export const useStore = create<State & Action>((set, get) => ({
  env: new Env(),
  renderer: null,

  setRenderer: (renderer: Renderer): void => set({
    renderer
  }),
}));


export default function WebGLCanvas(props: {
  scene?: Scene,
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const env = useStore((state) => state.env)
  const renderer = useStore((state) => state.renderer)
  const setRenderer = useStore((state) => state.setRenderer)
  const [count, setCount] = React.useState(0);

  requestAnimationFrame(() => {
    setCount(count + 1);
  });

  // initialize
  React.useEffect(() => {
    if (renderer) {
      // StrictMode
      return;
    }

    const canvas = ref.current!;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const observer = new ResizeObserver((_) => {
      const canvas = ref.current;
      if (canvas) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
    });
    observer.observe(canvas);
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('no webgl2');
    }
    const statsParent = document.getElementById('stats')!;

    const newRenderer = new Renderer(gl, observer, statsParent);
    setRenderer(newRenderer);
  }, [])

  // render
  React.useEffect(() => {
    if (!renderer) {
      return;
    }
    const canvas = ref.current as HTMLCanvasElement;
    const width = canvas.width;
    const height = canvas.height;

    env.projection.resize(width, height);
    {
      const gl = renderer.gl;
      gl.clearColor(0.2, 0.2, 0.2, 1);

      gl.enable(GL.DEPTH_TEST);
      gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

      gl.enable(GL.CULL_FACE);

      gl.clearDepth(1);
      gl.viewport(0, 0, width, height);
    }

    renderer.render(env.buffer, props.scene);
  }, [count]);

  const handleMouseMove: React.MouseEventHandler<HTMLCanvasElement> = (event) => {
    // Only rotate when the left button is pressed
    if (renderer) {
      if (event.buttons & 1) {
        env.view.rotate(event.movementX, event.movementY);
      }
      if (event.buttons & 4) {
        env.view.shift(event.movementX, event.movementY);
      }
    }
  };

  const handleWheel: React.WheelEventHandler<HTMLCanvasElement> = (event) => {
    if (renderer) {
      env.view.dolly(event.deltaY);
    }
  };

  return (<div id="stats" style={{ width: '100%', height: '100%' }}>
    <canvas
      style={{ width: '100%', height: '100%' }}
      ref={ref}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
    />
  </div>)
}
