import { mat4 } from '../math/gl-matrix.mjs';
import type { WglBuffer } from './buffer.mjs';


const GL = WebGL2RenderingContext;


const VS = `#version 300 es
precision mediump float;
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
out vec3 fPosition;
out vec3 fNormal;
out vec2 fUv;
uniform mat4 uModel;

layout (std140) uniform uEnv {
  mat4 uView;
  mat4 uProjection;
  vec4 uLightPosDir;
  vec4 uLightColor;
};

void main()
{
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1);
  fPosition = vec3(uModel * vec4(aPosition, 1.0));
  fNormal = aNormal;
  fUv = aUv;
}
`;

const FS = `#version 300 es
precision mediump float;
in vec3 fPosition;
in vec3 fNormal;
in vec2 fUv;
out vec4 _Color;

layout (std140) uniform uEnv {
  mat4 uView;
  mat4 uProjection;
  vec4 uLightPosDir;
  vec4 uLightColor;
};
layout (std140) uniform uMaterial {
  vec4 uColor;
};

void main(){
  vec3 norm = normalize(fNormal);
  vec3 lightDir = normalize(uLightPosDir.w == 0.0
    ? vec3(uLightPosDir) 
    : uLightPosDir.xyz - fPosition
  );  
  float diffuse = max(dot(norm, lightDir), 0.0);
  _Color = vec4(uColor.xyz * diffuse, uColor.w);
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


export class WglShader implements Disposable {
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
  static create(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WglShader {
    const vs = compileShader('[VERTEX_SHADER]: ', gl, vsSrc, GL.VERTEX_SHADER);
    const fs = compileShader('[FRAGMENT_SHADER]: ', gl, fsSrc, GL.FRAGMENT_SHADER);
    const program = new WglShader(gl);
    program.link(vs, fs);
    return program;
  }

  static createDefault(
    gl: WebGL2RenderingContext): WglShader {
    return WglShader.create(gl, VS, FS);
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

  setUbo(name: string, ubo: WglBuffer, bind: number) {
    const gl = this.gl;
    const block = gl.getUniformBlockIndex(this.program, name);
    gl.uniformBlockBinding(this.program, block, bind);
    gl.bindBufferBase(GL.UNIFORM_BUFFER, bind, ubo.buffer);
  }
}
