import React from 'react';
import { create } from 'zustand'
import Stats from 'stats-gl'

import { Scene } from './js/scene.mjs';
import { Renderer } from './js/render/renderer.mjs';
import { Env } from './js/viewlayer/env.mjs';
import { Animation } from './js/animation.mjs';


const GL = WebGL2RenderingContext;


type State = {
  stats: Stats;
  env: Env;
  renderer: Renderer | null;
  count: number;
}


interface Action {
  setRenderer(renderer: Renderer): void;
  setCount(count: number, width: number, height: number, scene?: Scene): void;
}


export const useGlStore = create<State & Action>((set, get) => ({
  // create a new Stats object
  stats: new Stats({
    logsPerSecond: 20,
    samplesLog: 100,
    samplesGraph: 10,
    precision: 2,
    horizontal: true,
    minimal: false,
    mode: 0
  }),
  env: new Env(),
  renderer: null,
  count: 0,

  setRenderer: (renderer: Renderer): void => set({
    renderer
  }),

  setCount: (count: number, width: number, height: number, scene?: Scene) => {
    const state = get();
    if (state.count == count) {
      return;
    }
    set({ count })

    // render
    state.stats.begin();

    const renderer = state.renderer;
    if (renderer) {
      state.env.projection.resize(width, height);
      {
        const gl = renderer.gl;
        gl.clearColor(0.2, 0.2, 0.2, 1);

        gl.enable(GL.DEPTH_TEST);
        gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        gl.enable(GL.CULL_FACE);

        gl.clearDepth(1);
        gl.viewport(0, 0, width, height);
      }

      if (scene) {
        // update scene
        const world = scene.world;
        const seconds = scene.timeSeconds;
        // console.log(seconds);
        world.view(Animation).each((_entity, animation) => {
          animation.update(seconds);
        });

        renderer.drawScene(state.env.buffer, scene);
      }
    }

    state.stats.end();
    state.stats.update();
  },
}));


export default function WebGLCanvas(props: {
  scene?: Scene,
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const env = useGlStore((state) => state.env)
  const renderer = useGlStore((state) => state.renderer)
  const stats = useGlStore((state) => state.stats)
  const setRenderer = useGlStore((state) => state.setRenderer)
  const count = useGlStore((state) => state.count)
  const setCount = useGlStore((state) => state.setCount);

  requestAnimationFrame(() => {
    const canvas = ref.current as HTMLCanvasElement;
    if (canvas) {
      setCount(count + 1, canvas.width, canvas.height, props.scene);
    }
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
    statsParent.appendChild(stats.dom);
    stats.dom.style.position = 'absolute';
    statsParent.style.position = 'relative';

    const newRenderer = new Renderer(gl);
    setRenderer(newRenderer);
  }, [])

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
