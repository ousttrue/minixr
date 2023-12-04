import { mat4 } from '../math/gl-matrix.mjs';


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


export class ShaderProgram implements Disposable {
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

  // compile, attach, link
  static create(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): ShaderProgram {
    const vs = compileShader('[VERTEX_SHADER]: ', gl, vsSrc, GL.VERTEX_SHADER);
    const fs = compileShader('[FRAGMENT_SHADER]: ', gl, fsSrc, GL.FRAGMENT_SHADER);
    const program = new ShaderProgram(gl);
    program.link(vs, fs);
    return program;
  }

  static createDefault(
    gl: WebGL2RenderingContext): ShaderProgram {
    return ShaderProgram.create(gl, VS, FS);
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
