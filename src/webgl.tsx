import { Glb } from '../lib/glb.js';
import { useState, useRef, useEffect } from 'react';


const GL = WebGL2RenderingContext;


class GlRenderer {
  render(gl: WebGL2RenderingContext, glb?: Glb) {
    console.log(glb);
    if (glb) {
      gl.clearColor(0.0, 0.2, 0.0, 1.0);
    }
    else {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
    }
    gl.clear(GL.COLOR_BUFFER_BIT);
  }
}


class CanvasManager {
  renderer: GlRenderer;

  constructor(
    public readonly canvas: HTMLCanvasElement,
    public readonly context: WebGL2RenderingContext,
  ) {
    this.renderer = new GlRenderer();
  }

  static create(canvas: HTMLCanvasElement): CanvasManager {
    const context = canvas.getContext('webgl2');
    if (!context) {
      throw new Error('no WebGL2RenderingContext');
    }
    return new CanvasManager(canvas, context);
  }
}


export default function WebGLCanvas(props: {
  glb?: Glb,
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [gl, setGl] = useState<CanvasManager | null>(null);

  useEffect(() => {

    if (!ref.current) {
      return;
    }

    const current = gl ?? CanvasManager.create(ref.current);
    if (current != gl) {
      setGl(current);
    }

    current.renderer.render(current.context, props.glb);

  }, [gl, props.glb]);

  return <canvas ref={ref} />
}
