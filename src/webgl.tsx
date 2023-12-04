import { Glb } from '../lib/glb.js';
import { Gltf2Loader } from '../lib/gltf2-loader.mjs';
import { Mesh } from '../lib/buffer/primitive.mjs';
import { Material } from '../lib/materials/material.mjs';
import React from 'react';
import { vec3, mat4, OrbitView, PerspectiveProjection } from '../lib/math/gl-matrix.mjs';


const GL = WebGL2RenderingContext;


const VS = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aUv;
out vec2 fUv;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

void main()
{
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1);
  fUv = aUv;
}
`;

const FS = `#version 300 es
precision mediump float;
in vec2 fUv;
out vec4 _Color;

void main(){
  _Color = vec4(fUv,1,1);
}
`;

// shaderSource
// compile
function compileShader(errorPrefix: string, gl: WebGL2RenderingContext,
  src: string, type: number): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('createShader');
  }
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, GL.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`${errorPrefix}${info}: ${src}`);
  }
  return shader;
}


class ShaderProgram implements Disposable {
  program: WebGLProgram;

  constructor(public readonly gl: WebGL2RenderingContext) {
    this.program = gl.createProgram()!;
    if (!this.program) {
      throw new Error('createProgram');
    }
  }

  [Symbol.dispose]() {
    this.gl.deleteProgram(this.program);
  }

  link(vs: WebGLShader, fs: WebGLShader) {
    const gl = this.gl;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, GL.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(this.program);
      throw new Error(`[LinkProgram]: ${info}`);
    }
  }

  // compile, attach, link
  static create(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): ShaderProgram {
    const vs = compileShader('[VERTEX_SHADER]: ', gl, vsSrc, GL.VERTEX_SHADER);
    const fs = compileShader('[FRAGMENT_SHADER]: ', gl, fsSrc, GL.FRAGMENT_SHADER);
    const program = new ShaderProgram(gl);
    program.link(vs, fs);
    return program;
  }

  use() {
    this.gl.useProgram(this.program);
  }

  setMatrix(name: string, matrix: mat4) {
    const gl = this.gl;
    const location = gl.getUniformLocation(this.program, name);
    if (!location) {
      console.warn(`getUniformLocation${name} not found`);
    }
    gl.uniformMatrix4fv(location, false, matrix.array);
  }
}


class Buffer implements Disposable {
  buffer: WebGLBuffer;
  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly type = GL.ARRAY_BUFFER,
    public readonly componentType?: ElementType,
  ) {
    this.buffer = gl.createBuffer()!;
    if (!this.buffer) {
      throw new Error('createBuffer');
    }
  }

  [Symbol.dispose](): void {
    this.gl.deleteBuffer(this.buffer);
  }

  static create(gl: WebGL2RenderingContext,
    type: (GL.ARRAY_BUFFER | GL.ELEMENT_ARRAY_BUFFER),
    bytes: ArrayBuffer,
    componetType?: ElementType
  ): Buffer {
    const buffer = new Buffer(gl, type, componetType);
    buffer.upload(bytes);
    return buffer;
  }

  upload(bytes: ArrayBuffer) {
    const gl = this.gl;
    gl.bindBuffer(this.type, this.buffer);
    gl.bufferData(this.type, bytes, gl.STATIC_DRAW);
    gl.bindBuffer(this.type, null);
  }
}


type VertexAttribute = {
  name: string,
  buffer: Buffer,
  componentType: number,
  componentCount: number,
  bufferStride: number,
  bufferOffset: number,
}

type ElementType = GL.UNSIGNED_BYTE | GL.UNSIGNED_SHORT | GL.UNSIGNED_INT;

class Vao implements Disposable {
  vao: WebGLVertexArrayObject;
  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly elementType?: ElementType,
  ) {
    this.vao = gl.createVertexArray()!;
    if (!this.vao) {
      throw new Error('createVertexArray');
    }
  }

  [Symbol.dispose](): void {
    this.gl.deleteVertexArray(this.vao);
  }

  static create(gl: WebGL2RenderingContext,
    attributes: VertexAttribute[],
    indices?: Buffer) {
    const vao = new Vao(gl, indices?.componentType);
    gl.bindVertexArray(vao.vao);
    let location = 0;
    for (const a of attributes) {
      gl.bindBuffer(GL.ARRAY_BUFFER, a.buffer.buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, a.componentCount, a.componentType, false,
        a.bufferStride, a.bufferOffset);
      ++location;
    }

    if (indices) {
      gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indices.buffer);
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(GL.ARRAY_BUFFER, null);
    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    return vao;
  }

  bind() {
    this.gl.bindVertexArray(this.vao);
  }

  unbind() {
    this.gl.bindVertexArray(null);
  }

  draw(count: number, offset: number = 0) {
    if (this.elementType) {
      this.gl.drawElements(GL.TRIANGLES, count, this.elementType, offset);
    }
    else {
      this.gl.drawArrays(GL.TRIANGLES, offset, count);
    }
  }
}


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

  private _getOrCreateShader(material: Material): ShaderProgram {
    {
      const shader = this.materialShaderMap.get(material);
      if (shader) {
        return shader;
      }
    }

    {
      const shader = ShaderProgram.create(this.gl, VS, FS);
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
