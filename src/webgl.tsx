import React from 'react';
import {
  vec3, mat4, OrbitView, PerspectiveProjection
} from '../lib/math/gl-matrix.mjs';
import { Mesh } from '../lib/buffer/primitive.mjs';
import { Material } from '../lib/materials/material.mjs';
import { ShaderProgram } from '../lib/wgl/shader.mjs';
import { Vao, Buffer } from '../lib/wgl/geometry.mjs';
import { World } from '../lib/uecs/index.mjs';
import Stats from 'stats-gl'

// create a new Stats object
const stats = new Stats({
  logsPerSecond: 20,
  samplesLog: 100,
  samplesGraph: 10,
  precision: 2,
  horizontal: true,
  minimal: false,
  mode: 0
});


const GL = WebGL2RenderingContext;


export class Renderer {
  shader: ShaderProgram | null = null;
  model = mat4.identity();

  view = new OrbitView(mat4.identity(), vec3.fromValues(0, 0, 5));
  projection = new PerspectiveProjection(mat4.identity());

  meshVaoMap: Map<Mesh, Vao> = new Map();
  materialShaderMap: Map<Material, ShaderProgram> = new Map();

  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly observer: ResizeObserver,
  ) { }

  render(time: number, width: number, height: number, world: World) {
    stats.begin();

    this.projection.resize(width, height);

    {
      const gl = this.gl;
      gl.clearColor(0.2, 0.2, 0.2, 1);
      gl.clear(GL.COLOR_BUFFER_BIT);
      gl.viewport(0, 0, width, height);
    }

    world.view(mat4, Mesh).each((entity, matrix, mesh) => {
      const vao = this._getOrCreateVao(mesh);

      vao.bind();

      let offset = 0
      for (const submesh of mesh.submeshes) {

        const shader = this._getOrCreateShader(submesh.material);
        shader.use();

        // update camera matrix
        shader.setMatrix('uProjection', this.projection.matrix);
        shader.setMatrix('uView', this.view.matrix);
        shader.setMatrix('uModel', matrix);

        vao.draw(submesh.drawCount, offset);
        offset += submesh.drawCount;
      }

      vao.unbind();
    });

    stats.end();
  }

  private _getOrCreateVao(mesh: Mesh): Vao {
    {
      const vao = this.meshVaoMap.get(mesh);
      if (vao) {
        return vao;
      }
    }

    {
      const vertices = mesh.attributes[0]!.source;
      const vbo = Buffer.create(this.gl,
        GL.ARRAY_BUFFER, vertices.array);
      const vao = Vao.create(this.gl, [
        {
          name: 'POSITION',
          buffer: vbo,
          bufferStride: 8 * 4,
          bufferOffset: 0,
          componentCount: 3,
          componentType: GL.FLOAT,
        },
        {
          name: 'NORMAL',
          buffer: vbo,
          bufferStride: 8 * 4,
          bufferOffset: 12,
          componentCount: 3,
          componentType: GL.FLOAT,
        },
        {
          name: 'TEXCOORD_0',
          buffer: vbo,
          bufferStride: 8 * 4,
          bufferOffset: 24,
          componentCount: 2,
          componentType: GL.FLOAT,
        }
      ], mesh.indices
        ? Buffer.create(this.gl, GL.ELEMENT_ARRAY_BUFFER,
          mesh.indices.array, mesh.indices.glType)
        : undefined
      );

      this.meshVaoMap.set(mesh, vao);
      return vao;
    }
  }

  private _getOrCreateShader(
    material: Material): ShaderProgram {
    {
      const shader = this.materialShaderMap.get(material);
      if (shader) {
        return shader;
      }
    }

    {
      const shader = ShaderProgram.createDefault(this.gl);
      this.materialShaderMap.set(material, shader);
      return shader;
    }
  }
}


export default function WebGLCanvas(props: {
  world: World,
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = React.useState<Renderer | null>(null);

  function getOrCreateState(): Renderer {
    if (renderer) {
      return renderer;
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
    statsParent.appendChild(stats.container);
    stats.container.style.position = 'absolute';
    statsParent.style.position = 'relative';

    const newRenderer = new Renderer(gl, observer);
    setRenderer(newRenderer);
    return newRenderer;
  }

  React.useEffect(() => {
    if (!ref.current) {
      return;
    }

    const state = getOrCreateState();

    state.render(Date.now(), ref.current.width, ref.current.height, props.world);
  });

  const [count, setCount] = React.useState(0);
  requestAnimationFrame(() => {
    setCount(count + 1);
  });

  const handleMouseMove: React.MouseEventHandler<HTMLCanvasElement> = (event) => {
    // Only rotate when the left button is pressed
    if (renderer) {
      if (event.buttons & 1) {
        renderer.view.rotate(event.movementX, event.movementY);
      }
      if (event.buttons & 4) {
        renderer.view.shift(event.movementX, event.movementY);
      }
    }
  };

  const handleWheel: React.WheelEventHandler<HTMLCanvasElement> = (event) => {
    if (renderer) {
      renderer.view.dolly(event.deltaY);
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
