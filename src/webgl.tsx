import { Glb } from '../lib/glb.js';
import { Gltf2Loader } from '../lib/gltf2-loader.mjs';
import { Mesh } from '../lib/buffer/primitive.mjs';
import { Material } from '../lib/materials/material.mjs';
import React from 'react';
import { vec3, mat4, OrbitView, PerspectiveProjection } from '../lib/math/gl-matrix.mjs';
import { ShaderProgram } from '../lib/wgl/shader.mjs';
import { Vao, Buffer } from '../lib/wgl/geometry.mjs';


const GL = WebGL2RenderingContext;


export class Renderer {
  shader: ShaderProgram | null = null;
  model = mat4.identity();

  view = new OrbitView(mat4.identity(), vec3.fromValues(0, 0, 5));
  projection = new PerspectiveProjection(mat4.identity());

  glb: Glb | null = null;
  loader: Gltf2Loader | null = null;

  meshVaoMap: Map<Mesh, Vao> = new Map();
  materialShaderMap: Map<Material, ShaderProgram> = new Map();

  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly observer: ResizeObserver,
  ) { }

  render(time: number, width: number, height: number, glb?: Glb) {
    this.projection.resize(width, height);

    if (glb != this.glb) {
      this.glb = glb ?? null;
      if (this.glb) {
        const loader = new Gltf2Loader(this.glb.json, { binaryChunk: this.glb.bin });
        loader.load().then(() => {
          this.loader = loader;
        });
      }
      else {
        // dispose ?
        this.loader = null;
      }
    }

    {
      const gl = this.gl;
      gl.clearColor(0.2, 0.2, 0.2, 1);
      gl.clear(GL.COLOR_BUFFER_BIT);
      gl.viewport(0, 0, width, height);
    }

    if (this.loader) {
      for (const mesh of this.loader.meshes) {

        const vao = this._getOrCreateVao(mesh);

        vao.bind();

        let offset = 0
        for (const submesh of mesh.submeshes) {

          const shader = this._getOrCreateShader(submesh.material);
          shader.use();

          // update camera matrix
          shader.setMatrix('uProjection', this.projection.matrix);
          shader.setMatrix('uView', this.view.matrix);

          shader.setMatrix('uModel', this.model);

          vao.draw(submesh.drawCount, offset);
          offset += submesh.drawCount;
        }
      }
    }
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
  glb?: Glb,
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
    const newRenderer = new Renderer(gl, observer);
    setRenderer(newRenderer);
    return newRenderer;
  }

  React.useEffect(() => {
    if (!ref.current) {
      return;
    }

    const state = getOrCreateState();

    state.render(Date.now(), ref.current.width, ref.current.height, props.glb);
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

  return <canvas
    style={{ width: '100%', height: '100%' }}
    ref={ref}
    onMouseMove={handleMouseMove}
    onWheel={handleWheel}
  />
}
