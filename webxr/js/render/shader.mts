import { mat4 } from '../math/gl-matrix.mjs';
import type { WglBuffer } from './buffer.mjs';
import { Shader } from '../materials/shader.mjs';
import { Material, ProgramDefine } from '../materials/material.mjs';
import { Texture } from '../materials/texture.mjs';


const GL = WebGL2RenderingContext;


export const COMMON_MVP = `
layout (std140) uniform uEnv {
  mat4 uView[2];
  mat4 uProjection[2];
  vec4 uLightPosDir;
  vec4 uLightColor;
};

uniform mat4 MODEL_MATRIX;
`


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


export type UboInfo = {
  index: number,
  byteLength: number,
}


export class WglShader implements Disposable {
  program: WebGLProgram;
  attrib: { [key: string]: number } = {}
  textureUnitMap: { [key: string]: number } = {}
  uniformMap: { [key: string]: WebGLUniformLocation } = {}
  uboIndexMap: { [key: string]: UboInfo } = {}

  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly name: string,
    public readonly vertSrc: string,
    public readonly fragSrc: string,
    attributeBinds: string[] = [],
  ) {
    this.program = gl.createProgram()!;
    if (!this.program) {
      throw new Error('createProgram');
    }
    console.log('create', name, this.program);

    const vertShader = compileShader('[VERTEX_SHADER]', gl, vertSrc, GL.VERTEX_SHADER);
    const fragShader = compileShader('[FRAGMENT_SHADER]', gl, fragSrc, GL.FRAGMENT_SHADER);

    if (attributeBinds) {
      for (let i = 0; i < attributeBinds.length; ++i) {
        gl.bindAttribLocation(this.program, i, attributeBinds[i]);
      }
    }

    gl.attachShader(this.program, fragShader);
    gl.attachShader(this.program, vertShader);
    gl.linkProgram(this.program);
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    if (!gl.getProgramParameter(this.program, GL.LINK_STATUS)) {
      console.error(`[${name}] Program link error: ${gl.getProgramInfoLog(this.program)}`);
    }

    let attribCount = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < attribCount; i++) {
      let attribInfo = gl.getActiveAttrib(this.program, i);
      if (attribInfo) {
        this.attrib[attribInfo.name] = gl.getAttribLocation(this.program, attribInfo.name);
      }
    }

    let uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      let uniformInfo = gl.getActiveUniform(this.program, i);
      if (uniformInfo) {
        const uniformName = uniformInfo.name.replace('[0]', '');
        const location = gl.getUniformLocation(this.program, uniformName);
        if (location) {
          if (uniformInfo.type == GL.SAMPLER_2D) {
            // const v = gl.getUniform(this.program, location);
            const v = Object.keys(this.textureUnitMap).length;
            console.log(`${uniformName}: ${location} ${v}`);
            this.textureUnitMap[uniformName] = v;
          }
          else if (uniformInfo.type == GL.SAMPLER_2D_ARRAY) {
            console.info(`TODO: [${uniformName}] SAMPLER_2D_ARRAY !`)
          }
          else {
            this.uniformMap[uniformName] = location;
          }
        }
        else {
          // UBO ?
          // console.log(`${uniformName}: no location`)
        }
      }
    }

    let uniformBlockCount = gl.getProgramParameter(this.program, GL.ACTIVE_UNIFORM_BLOCKS);
    for (let i = 0; i < uniformBlockCount; ++i) {
      const name = gl.getActiveUniformBlockName(this.program, i);
      if (name) {
        var index = gl.getUniformBlockIndex(this.program, name);
        const byteLength = gl.getActiveUniformBlockParameter(this.program, i, gl.UNIFORM_BLOCK_DATA_SIZE);
        console.log(`ubo: ${name} => ${index}: ${byteLength}bytes`);
        this.uboIndexMap[name] = { index, byteLength };
        gl.uniformBlockBinding(this.program, index, index);
      }
      else {
        console.warn(`ubo: ${i}: no name`);
      }
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

  bindMaterial(material: Material,
    getTexture: (src: Texture) => WebGLTexture | null,
  ) {
    const gl = this.gl;
    for (const name in material._textureMap) {
      const texture = material._textureMap[name];
      const unit = this.textureUnitMap[name];
      if (unit != null) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        if (texture) {
          const handle = getTexture(texture);
          gl.bindTexture(gl.TEXTURE_2D, handle);
        }
        else {
          gl.bindTexture(gl.TEXTURE_2D, null);
        }
      }
      else {
        // console.warn(`${sampler.name}: unit not found`);
      }
    }

    for (const name in material._uniformMap) {
      const dst = this.uniformMap[name];
      if (dst) {
        material._uniformMap[name].setTo(gl, dst);
      }
    }
  }
}


function vsSource(vertexSource: string, defines: ProgramDefine[], multiview: boolean) {
  let definesString = '';
  if (defines) {
    for (let [key, value] of defines) {
      // this.defines[key] = value;
      definesString += `#define ${key} ${value}\n`;
    }
  }

  const vs_list = [
    '#version 300 es\n'
  ]
  if (multiview) {
    vs_list.push('#extension GL_OVR_multiview2 : require\n')
    vs_list.push('#define NUM_VIEWS 2\n')
    vs_list.push('layout(num_views=NUM_VIEWS) in;\n')
    vs_list.push('#define VIEW_ID gl_ViewID_OVR\n')
  }
  vs_list.push(definesString)
  vs_list.push('precision mediump float;\n')

  vs_list.push(COMMON_MVP)
  if (multiview) {
    vs_list.push(`
mat4 ViewProjection()
{
  return uProjection[gl_ViewID_OVR] * uView[gl_ViewID_OVR];
}
`);
  }
  else {
    vs_list.push(`
mat4 ViewProjection()
{
  return uProjection[0] * uView[0];
}
`
    )
  }

  vs_list.push(vertexSource);
  return vs_list.join('')
}


function fsSource(fragmentSource: string, defines: ProgramDefine[]) {
  let definesString = '';
  if (defines) {
    for (let [key, value] of defines) {
      // this.defines[key] = value;
      definesString += `#define ${key} ${value}\n`;
    }
  }

  const fs_list = [
    '#version 300 es\n'
  ]
  fs_list.push(definesString);
  fs_list.push('precision mediump float;\n')
  fs_list.push(fragmentSource);
  return fs_list.join('')
}


export class ModShader extends WglShader {
  defines: { [key: string]: number } = {}

  constructor(
    gl: WebGL2RenderingContext, shader: Shader,
    defines: ProgramDefine[] = [],
    multiview: boolean = false,
    attributeBinds: string[] = [],
    hasSkinning = false,
  ) {
    super(gl, shader.name,
      vsSource(shader.vertexSource, defines, multiview),
      fsSource(shader.fragmentSource, defines),
      attributeBinds
    )
  }
}

