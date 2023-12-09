// Copyright 2018 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
import { Shader, MULTIVIEW_VP, DEFAULT_VP } from '../../../lib/materials/shader.mjs';
import { Material, ProgramDefine } from '../../../lib/materials/material.mjs';
import { Mesh, MeshVertexAttribute, SubMesh } from '../../../lib/buffer/mesh.mjs';
import { Texture } from '../../../lib/materials/texture.mjs';
import { Ubo, UboMap } from './ubo.mjs';


const GL = WebGL2RenderingContext;


export const ATTRIB = {
  POSITION: 1,
  NORMAL: 2,
  TANGENT: 3,
  TEXCOORD_0: 4,
  TEXCOORD_1: 5,
  COLOR_0: 6,
};

export const ATTRIB_MASK: { [key: string]: number } = {
  POSITION: 0x0001,
  NORMAL: 0x0002,
  TANGENT: 0x0004,
  TEXCOORD_0: 0x0008,
  TEXCOORD_1: 0x0010,
  COLOR_0: 0x0020,
};


function getAttributeMask(attributes: MeshVertexAttribute[]): number {
  let attributeMask = 0;
  for (const attribute of attributes) {
    attributeMask |= ATTRIB_MASK[attribute.name];
  }
  return attributeMask;
}

export class Program {
  program: WebGLProgram;
  attrib: { [key: string]: number } = {};
  uniformMap: { [key: string]: WebGLUniformLocation } = {};
  textureUnitMap: { [key: string]: number } = {};
  uboIndexMap: { [key: string]: { index: number, byteLength: number } } = {}
  defines: { [key: string]: number } = {};
  private _nextUseCallbacks: Function[] = [];
  constructor(public readonly gl: WebGL2RenderingContext,
    public readonly name: string,
    shader: Shader,
    defines: ProgramDefine[],
    multiview: boolean) {
    this.program = gl.createProgram()!;
    console.log('create', name, this.program);

    if (!shader) {
      throw new Error('no shader');
    }

    let definesString = '';
    if (defines) {
      for (let [key, value] of defines) {
        this.defines[key] = value;
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
    if (multiview) {
      vs_list.push(MULTIVIEW_VP)
    }
    else {
      vs_list.push(DEFAULT_VP)
    }
    vs_list.push(shader.vertexSource);
    const vertShader = gl.createShader(GL.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, vs_list.join(''))
    gl.compileShader(vertShader);
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      console.error(`[${name}] Vertex shader compile error: ${gl.getShaderInfoLog(vertShader)}: ${definesString + shader.vertexSource}`);
    }

    const fs_list = [
      '#version 300 es\n'
    ]
    fs_list.push(definesString);
    fs_list.push('precision mediump float;\n')
    fs_list.push(shader.fragmentSource);
    const fragShader = gl.createShader(GL.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, fs_list.join(''));
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, GL.COMPILE_STATUS)) {
      console.error(`[${name}] Fragment shader compile error: ${gl.getShaderInfoLog(fragShader)}: ${definesString + shader.fragmentSource}`);
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

  use() {
    this.gl.useProgram(this.program);

    if (this._nextUseCallbacks.length) {
      for (let callback of this._nextUseCallbacks) {
        callback(this);
      }
      this._nextUseCallbacks = [];
    }
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

export class ProgramFactory {
  private _programCache: { [key: string]: Program } = {};
  private _uboMap: Map<Material, UboMap> = new Map();

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly multiview: boolean,
  ) {
  }

  getOrCreateUbo(gl: WebGL2RenderingContext,
    program: Program, material: Material): UboMap {
    let uboMap = this._uboMap.get(material);
    if (uboMap) {
      return uboMap;
    }

    uboMap = {}
    if (material._uboMap) {
      for (const name in material._uboMap) {
        const ubo = new Ubo(gl, material._uboMap[name]);
        uboMap[name] = ubo;
      }
    }
    this._uboMap.set(material, uboMap);
    return uboMap;
  }

  getOrCreateProgram(gl: WebGL2RenderingContext, primitive: Mesh, submesh: SubMesh): [Program, UboMap] {
    const material = submesh.material;

    // determine shader defines by material & primitive combination 
    const attributeMask = getAttributeMask(primitive.attributes);
    const defines = material.getProgramDefines(attributeMask);
    let key = this._getProgramKey(material.shader.name, defines);

    let program = this._programCache[key];
    if (!program) {
      program = new Program(this.gl,
        key, material.shader, defines, this.multiview);
      this._programCache[key] = program;
    }

    const uboMap = this.getOrCreateUbo(gl, program, submesh.material);

    return [program, uboMap];
  }

  private _getProgramKey(name: string, defines: ProgramDefine[]) {
    if (!name) {
      throw new Error('no material name');
    }
    let str = `${name}:`;
    for (const [key, value] of defines) {
      str += `${key}=${value},`;
    }
    return str;
  }
}
