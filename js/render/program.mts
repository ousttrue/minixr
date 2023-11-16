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
import { Material } from '../scene/materials/material.mjs';
import { Primitive, ATTRIB } from '../scene/geometry/primitive.mjs';
import { Texture } from '../scene/materials/texture.mjs';


export class Program {
  program: WebGLProgram;
  attrib: { [key: string]: number } = {};
  uniformMap: { [key: string]: WebGLUniformLocation } = {};
  defines: { [key: string]: number } = {};
  private _nextUseCallbacks: Function[] = [];
  constructor(public readonly gl: WebGL2RenderingContext,
    name: string,
    vertSrc: string, fragSrc: string,
    defines: { [key: string]: number }) {
    this.program = gl.createProgram()!;
    // console.log('create', this.program);

    let definesString = '#version 300 es\n';
    if (defines) {
      for (let define in defines) {
        this.defines[define] = defines[define];
        definesString += `#define ${define} ${defines[define]}\n`;
      }
    }

    const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vertShader, definesString + vertSrc);
    gl.compileShader(vertShader);
    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      console.error(`[${name}] Vertex shader compile error: ${gl.getShaderInfoLog(vertShader)}: ${definesString + vertSrc}`);
    }

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, definesString + fragSrc);
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      console.error(`[${name}] Fragment shader compile error: ${gl.getShaderInfoLog(fragShader)}: ${definesString + fragSrc}`);
    }

    gl.attachShader(this.program, fragShader);
    gl.attachShader(this.program, vertShader);
    gl.linkProgram(this.program);
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
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
          this.uniformMap[uniformName] = location;
        }
      }
    }
  }

  onNextUse(callback: Function) {
    this._nextUseCallbacks.push(callback);
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
    for (let i = 0; i < material.samplers.length; ++i) {
      const sampler = material.samplers[i];
      gl.activeTexture(gl.TEXTURE0 + i);

      if (sampler.texture) {
        const texture = getTexture(sampler.texture);
        gl.bindTexture(gl.TEXTURE_2D, texture);
      }
      else {
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
    }

    for (let src of material.uniforms) {
      const dst = this.uniformMap[src.name];
      if (dst) {
        src.setTo(gl, dst);
      }
    }

    material.bind(gl, this.uniformMap);
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
    let key = this._getProgramKey(material.materialName, {});
    let program = this._programCache[key];
    if (program) {
      return program;
    }

    program = new Program(this.gl,
      material.materialName,
      material.vertexSource, material.fragmentSource, {});
    this._programCache[key] = program;

    program.onNextUse((program: Program) => {
      // Bind the samplers to the right texture index. This is constant for
      // the lifetime of the program.
      for (let i = 0; i < material.samplers.length; ++i) {
        const sampler = material.samplers[i];
        let uniform = program.uniformMap[sampler.name];
        if (uniform) {
          this.gl.uniform1i(uniform, i);
        }
      }
    });

    return program;
  }

  private _getProgramKey(name: string, defines: any) {
    if (!name) {
      throw new Error('no material name');
    }
    let key = `${name}:`;
    for (let define in defines) {
      key += `${define}=${defines[define]},`;
    }
    return key;
  }
}
