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
import { Material, ProgramDefine, MaterialUniform } from '../materials/material.mjs';
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

export const ATTRIB_MASK = {
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
    vertSrc: string, fragSrc: string,
    defines: ProgramDefine[]) {
    this.program = gl.createProgram()!;
    console.log('create', name, this.program);

    let definesString = '#version 300 es\n';
    if (defines) {
      for (let [key, value] of defines) {
        this.defines[key] = value;
        definesString += `#define ${key} ${value}\n`;
      }
    }

    const vertShader = gl.createShader(GL.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, definesString + vertSrc);
    gl.compileShader(vertShader);
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      console.error(`[${name}] Vertex shader compile error: ${gl.getShaderInfoLog(vertShader)}: ${definesString + vertSrc}`);
    }

    const fragShader = gl.createShader(GL.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, definesString + fragSrc);
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, GL.COMPILE_STATUS)) {
      console.error(`[${name}] Fragment shader compile error: ${gl.getShaderInfoLog(fragShader)}: ${definesString + fragSrc}`);
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
    for (let i = 0; i < material._samplers.length; ++i) {
      const sampler = material._samplers[i];
      const unit = this.textureUnitMap[sampler.name];
      if (unit != null) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        if (sampler.texture) {
          const texture = getTexture(sampler.texture);
          gl.bindTexture(gl.TEXTURE_2D, texture);
        }
        else {
          gl.bindTexture(gl.TEXTURE_2D, null);
        }
      }
      else {
        // console.warn(`${sampler.name}: unit not found`);
      }
    }

    for (let src of material._uniforms) {
      const dst = this.uniformMap[src.name];
      if (dst) {
        this.setTo(gl, src, dst);
      }
    }

    material.bind(gl, this.uniformMap);
  }

  setTo(gl: WebGL2RenderingContext, src: MaterialUniform, dst: WebGLUniformLocation) {
    switch (src.length) {
      case 1:
        gl.uniform1fv(dst, [src.value]);
        break;
      case 2: gl.uniform2fv(dst, src.value); break;
      case 3: gl.uniform3fv(dst, src.value); break;
      case 4: gl.uniform4fv(dst, src.value); break;
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
    const defines = material.getProgramDefines(attributeMask);

    let key = this._getProgramKey(material.materialName, defines);
    let program = this._programCache[key];
    if (program) {
      return program;
    }

    program = new Program(this.gl,
      key,
      material.vertexSource, material.fragmentSource, defines);
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
