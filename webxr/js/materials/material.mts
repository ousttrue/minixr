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
import { Texture } from './texture.mjs';
import { vec2, vec3, vec4 } from '../math/gl-matrix.mjs';
import { MaterialState } from './materialstate.mjs';


abstract class MaterialUniform {
  abstract setTo(gl: WebGL2RenderingContext, dst: WebGLUniformLocation): void;
}

export class MaterialUniform1f {
  constructor(public value: number) { }

  setTo(gl: WebGL2RenderingContext, dst: WebGLUniformLocation) {
    gl.uniform1fv(dst, [this.value]);
  }
}
export class MaterialUniform2f {
  constructor(public value: vec2) { }
  setTo(gl: WebGL2RenderingContext, dst: WebGLUniformLocation) {
    gl.uniform2fv(dst, this.value.array);
  }
}
export class MaterialUniform3f {
  constructor(public value: vec3) { }
  setTo(gl: WebGL2RenderingContext, dst: WebGLUniformLocation) {
    gl.uniform3fv(dst, this.value.array);
  }
}
export class MaterialUniform4f {
  constructor(public value: vec4) { }
  setTo(gl: WebGL2RenderingContext, dst: WebGLUniformLocation) {
    gl.uniform4fv(dst, this.value.array);
  }
}
export class MaterialUniformInt32Array {
  constructor(public value: Int32Array) { }
  setTo(gl: WebGL2RenderingContext, dst: WebGLUniformLocation) {
    gl.uniform1iv(dst, this.value);
  }
}


export class Ubo {
  buffer: ArrayBuffer;
  constructor(byteLength: number) {
    this.buffer = new ArrayBuffer(byteLength);
  }
}


export type ProgramDefine = [string, number];


export type Shader = {
  name: string;
  vertexSource: string;
  fragmentSource: string;
  // uniforms?: UniformDefaultValue[];
  // ubos?: UboDefinition[],
}


export class Material {
  state = new MaterialState();
  _uniformMap: { [key: string]: MaterialUniform } = {}
  _textureMap: { [key: string]: Texture } = {}
  _uboMap: { [key: string]: ArrayBuffer } = {}
  defines: ProgramDefine[] = [];

  constructor(
    public readonly name: string,
    public readonly shader: Shader) {
    // if (shader.uniforms) {
    //   for (const [name, value] of shader.uniforms) {
    //     this.setUniform(name, value);
    //   }
    // }
    // if (shader.ubos) {
    //   for (const ubo of shader.ubos) {
    //     this.defineUbo(ubo.name, new ArrayBuffer(ubo.byteLength));
    //   }
    // }
  }

  defineUbo(name: string, buffer: ArrayBuffer) {
    this._uboMap[name] = buffer;
  }

  setUniform(name: string, value: number | vec2 | vec3 | vec4 | number[] | Int32Array) {
    if (typeof (value) == 'number') {
      this._uniformMap[name] = new MaterialUniform1f(value);
    }
    else if (value instanceof Array) {
      switch (value.length) {
        case 1: this._uniformMap[name] = new MaterialUniform1f(value[0]); break;
        case 2: this._uniformMap[name] = new MaterialUniform2f(vec2.fromValues(...value)); break;
        case 3: this._uniformMap[name] = new MaterialUniform3f(vec3.fromValues(...value)); break;
        case 4: this._uniformMap[name] = new MaterialUniform4f(vec4.fromValues(...value)); break;
        default: throw new Error(`unknown type: ${value}`);
      }
    }
    else if (value instanceof vec2) {
      this._uniformMap[name] = new MaterialUniform2f(value);
    }
    else if (value instanceof vec3) {
      this._uniformMap[name] = new MaterialUniform3f(value);
    }
    else if (value instanceof vec4) {
      this._uniformMap[name] = new MaterialUniform4f(value);
    }
    else if (value instanceof Int32Array) {
      this._uniformMap[name] = new MaterialUniformInt32Array(value);
    }
    else {
      throw new Error(`unknown type: ${value}`);
    }
  }

  setTexture(name: string, texture: Texture | null) {
    if (texture) {
      this._textureMap[name] = texture;
    }
  }
}

// @ts-ignore
export const DefaultMaterial = {};

