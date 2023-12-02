import { Glb } from '../lib/glb.js';
import React from 'react';
import { vec3, mat4, OrbitView, PerspectiveProjection } from '../lib/math/gl-matrix.mjs';

const GL = WebGL2RenderingContext;


const VS = `#version 300 es
in vec2 aPosition;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

void main()
{
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 0, 1);
}
`;

const FS = `#version 300 es
precision mediump float;
out vec4 _Color;

void main(){
  _Color = vec4(1,1,1,1);
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
  ) {
    this.buffer = gl.createBuffer()!;
    if (!this.buffer) {
      throw new Error('createBuffer');
    }
  }

  [Symbol.dispose](): void {
    this.gl.deleteBuffer(this.buffer);
  }

  static create(gl: WebGL2RenderingContext, bytes: ArrayBuffer): Buffer {
    const buffer = new Buffer(gl, GL.ARRAY_BUFFER);
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
  buffer: Buffer,
  componentType: number,
  componentCount: number,
  bufferStride: number,
  bufferOffset: number,
}


class Vao implements Disposable {
  vao: WebGLVertexArrayObject;
  constructor(public readonly gl: WebGL2RenderingContext) {
    this.vao = gl.createVertexArray()!;
    if (!this.vao) {
      throw new Error('createVertexArray');
    }
  }

  [Symbol.dispose](): void {
    this.gl.deleteVertexArray(this.vao);
  }

  static create(gl: WebGL2RenderingContext, attributes: VertexAttribute[]) {
    const vao = new Vao(gl);
    gl.bindVertexArray(vao.vao);
    let location = 0;
    for (const a of attributes) {
      gl.bindBuffer(GL.ARRAY_BUFFER, a.buffer.buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, a.componentCount, a.componentType, false,
        a.bufferStride, a.bufferOffset);
    }
    gl.bindBuffer(GL.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    return vao;
  }

  draw(count: number) {
    this.gl.bindVertexArray(this.vao);
    this.gl.drawArrays(GL.TRIANGLES, 0, count);
    this.gl.bindVertexArray(null);
  }
}


export class Renderer {
  shader: ShaderProgram | null = null;
  vbo: Buffer | null = null;
  vao: Vao | null = null;
  model = mat4.identity();

  view = new OrbitView(mat4.identity(), vec3.fromValues(0, 0, 5));
  projection = new PerspectiveProjection(mat4.identity());

  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly observer: ResizeObserver,
  ) { }

  render(time: number, width: number, height: number) {
    this.projection.resize(width, height);

    const gl = this.gl;
    const { shader, vao } = this.getOrCreate(gl);

    gl.clearColor(0.2, 0.2, 0.2, 1);
    gl.clear(GL.COLOR_BUFFER_BIT);
    gl.viewport(0, 0, width, height);

    shader.use();

    // update camera matrix
    shader.setMatrix('uProjection', this.projection.matrix);
    shader.setMatrix('uView', this.view.matrix);

    // update model matrix
    const t = time * 0.001;
    const c = Math.sin(t);
    const s = Math.cos(t);
    this.model.array.set(
      [
        c, -s, 0, 0, //
        s, c, 0, 0, //
        0, 0, 1, 0, //
        0, 0, 0, 1, //
      ]);
    shader.setMatrix('uModel', this.model);

    vao.draw(6);
  }

  private getOrCreate(gl: WebGL2RenderingContext): { shader: ShaderProgram, vao: Vao } {
    let shader = this.shader;
    if (!shader) {
      shader = ShaderProgram.create(gl, VS, FS);
      this.shader = shader;
    }

    let vao = this.vao;
    if (!vao) {
      //  2
      // 0>1
      const pos = [
        -0.5, -0.5,
        0.5, -0.5,
        0.5, 0.5,

        0.5, 0.5,
        -0.5, 0.5,
        -0.5, -0.5,
      ];
      const vbo = Buffer.create(gl, new Float32Array(pos).buffer);
      vao = Vao.create(gl, [
        {
          buffer: vbo,
          bufferStride: 2 * 4,
          bufferOffset: 0,
          componentCount: 2,
          componentType: GL.FLOAT,
        }
      ]);
      this.vao = vao;
    }

    return { shader, vao };
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

    state.render(Date.now(), ref.current.width, ref.current.height);
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
