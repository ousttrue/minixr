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
import { Shader } from '../materials/shader.mjs';
import { Material, MaterialUniform } from '../materials/material.mjs';
import { ProgramDefine } from '../materials/shader.mjs';
import { Primitive, PrimitiveAttribute } from '../geometry/primitive.mjs';
import { Texture } from '../materials/texture.mjs';


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


function getAttributeMask(attributes: PrimitiveAttribute[]): number {
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
  defines: { [key: string]: number } = {};
  private _nextUseCallbacks: Function[] = [];
  constructor(public readonly gl: WebGL2RenderingContext,
    public readonly name: string,
    shader: Shader,
    defines: ProgramDefine[]) {
    this.program = gl.createProgram()!;
    console.log('create', name, this.program);

    if(!shader){
      throw new Error('no shader');
    }

    let definesString = '#version 300 es\n';
    if (defines) {
      for (let [key, value] of defines) {
        this.defines[key] = value;
        definesString += `#define ${key} ${value}\n`;
      }
    }

    const vertShader = gl.createShader(GL.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, definesString + shader.vertexSource);
    gl.compileShader(vertShader);
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      console.error(`[${name}] Vertex shader compile error: ${gl.getShaderInfoLog(vertShader)}: ${definesString + shader.vertexSource}`);
    }

    const fragShader = gl.createShader(GL.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, definesString + shader.fragmentSource);
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
            const v = gl.getUniform(this.program, location);
            this.textureUnitMap[uniformName] = v;
          }
          else {
            this.uniformMap[uniformName] = location;
          }
        }
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

  bindMaterial(material: Material, getTexture: (src: Texture) => WebGLTexture | null) {
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
  constructor(
    private readonly gl: WebGL2RenderingContext
  ) {
  }

  getOrCreateProgram(primitive: Primitive): Program {
    const material = primitive.material;

    // determine shader defines by material & primitive combination 
    const attributeMask = getAttributeMask(primitive.attributes);
    // const defines = material.getProgramDefines(attributeMask);
    const defines: ProgramDefine[] = [];

    let key = this._getProgramKey(material.name, defines);
    let program = this._programCache[key];
    if (program) {
      return program;
    }

    program = new Program(this.gl,
      key, material.shader, defines);
    this._programCache[key] = program;

    return program;
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
