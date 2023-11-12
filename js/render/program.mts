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

export class Program {
  program: WebGLProgram;
  attrib: { [key: string]: number } = {};
  uniformMap: { [key: string]: WebGLUniformLocation } = {};
  defines: { [key: string]: number } = {};
  private _nextUseCallbacks: Function[] = [];
  constructor(public readonly gl: WebGL2RenderingContext,
    vertSrc: string, fragSrc: string,
    attribMap: { [key: string]: number },
    defines: { [key: string]: number }) {
    this.program = gl.createProgram()!;

    let definesString = '';
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
      console.error('Vertex shader compile error: ' + gl.getShaderInfoLog(vertShader));
    }

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragShader, definesString + fragSrc);
    gl.compileShader(fragShader);
    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compile error: ' + gl.getShaderInfoLog(fragShader));
    }

    if (attribMap) {
      for (let attribName in attribMap) {
        // before gl.linkProgram !
        gl.bindAttribLocation(this.program, attribMap[attribName], attribName);
        this.attrib[attribName] = attribMap[attribName];
      }
    }

    gl.attachShader(this.program, fragShader);
    gl.attachShader(this.program, vertShader);
    gl.linkProgram(this.program);
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error: ' + gl.getProgramInfoLog(this.program));
    }

    if (!attribMap) {
      let attribCount = gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
      for (let i = 0; i < attribCount; i++) {
        let attribInfo = gl.getActiveAttrib(this.program, i);
        if (attribInfo) {
          this.attrib[attribInfo.name] = gl.getAttribLocation(this.program, attribInfo.name);
        }
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

  bindMaterial(material: Material) {
    // First time we do a binding, cache the uniform locations and remove
    // unused uniforms from the list.
    // if (this._firstBind) {
    //   for (let i = 0; i < material._samplers.length;) {
    //     let sampler = material._samplers[i];
    //     if (!this.uniform[sampler._uniformName]) {
    //       material._samplers.splice(i, 1);
    //       continue;
    //     }
    //     ++i;
    //   }
    //
    //   for (let i = 0; i < this._uniforms.length;) {
    //     let uniform = this._uniforms[i];
    //     uniform._uniform = this.program.uniform[uniform._uniformName];
    //     if (!uniform._uniform) {
    //       this._uniforms.splice(i, 1);
    //       continue;
    //     }
    //     ++i;
    //   }
    //   this._firstBind = false;
    // }

    const gl = this.gl;
    // for (let sampler of material._samplers) {
    //   gl.activeTexture(gl.TEXTURE0 + sampler._index);
    //   if (sampler._renderTexture && sampler._renderTexture._complete) {
    //     gl.bindTexture(gl.TEXTURE_2D, sampler._renderTexture._texture);
    //   } else {
    //     gl.bindTexture(gl.TEXTURE_2D, null);
    //   }
    // }

    for (let src of material.uniforms) {
      const dst = this.uniformMap[src.name];
      if (dst) {
        src.setTo(gl, dst);
      }
    }
  }
}
