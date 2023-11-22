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

import { mat4, vec3 } from '../math/gl-matrix.mjs';
import { Material } from '../materials/material.mjs';
import { MaterialState, CAP } from '../materials/materialstate.mjs';
import { Primitive } from '../buffer/primitive.mjs';
import { BufferSource } from '../buffer/buffersource.mjs';
import { Vao, Vbo, Ibo } from './vao.mjs';
import { Program, ProgramFactory } from './program.mjs';
import { TextureFactory } from './texturefactory.mjs';

const GL = WebGLRenderingContext; // For enums

const DEF_LIGHT_DIR = vec3.fromValues(-0.1, -1.0, -0.2);
const DEF_LIGHT_COLOR = vec3.fromValues(3.0, 3.0, 3.0);


function setCap(gl: WebGL2RenderingContext, glEnum: number, cap: any, prevState: any, state: any) {
  let change = (state & cap) - (prevState & cap);
  if (!change) {
    return;
  }

  if (change > 0) {
    gl.enable(glEnum);
  } else {
    gl.disable(glEnum);
  }
}


class Lighting {
  private _globalLightColor = DEF_LIGHT_COLOR.copy();
  set globalLightColor(value: vec3) {
    value.copy({ out: this._globalLightColor });
  }
  get globalLightColor() {
    return this._globalLightColor;
  }

  private _globalLightDir = DEF_LIGHT_DIR.copy();
  set globalLightDir(value: vec3) {
    value.copy({ out: this._globalLightDir });
  }
  get globalLightDir() {
    return this._globalLightDir;
  }
}


export class Renderer {
  private _lighting = new Lighting();
  private _textureFactory: TextureFactory;
  private _programFactory: ProgramFactory;
  private _iboMap: Map<BufferSource, Ibo> = new Map();
  private _vboMap: Map<BufferSource, Vbo> = new Map();
  private _primVaoMap: Map<Primitive, Vao> = new Map();

  constructor(
    private readonly gl: WebGL2RenderingContext,
    multiview = false,
  ) {
    this._programFactory = new ProgramFactory(gl, multiview);
    this._textureFactory = new TextureFactory(gl);
  }

  private _getOrCreateVertexBuffer(source: BufferSource) {
    let vbo = this._vboMap.get(source);
    if (vbo) {
      return vbo;
    }

    vbo = new Vbo(this.gl, GL.ARRAY_BUFFER, source, source.usage);
    this._vboMap.set(source, vbo);
    return vbo;
  }

  private _getOrCreateIndexBuffer(source: BufferSource): Ibo {
    let ibo = this._iboMap.get(source);
    if (ibo) {
      return ibo;
    }

    const indexBuffer = new Vbo(this.gl,
      GL.ELEMENT_ARRAY_BUFFER, source, source.usage);

    ibo = new Ibo(indexBuffer, source);
    this._iboMap.set(source, ibo);
    return ibo;
  }

  private _getOrCreatePrimtive(primitive: Primitive, program: Program) {
    let vao = this._primVaoMap.get(primitive);
    if (vao) {
      for (const attrib of primitive.attributes) {
        if (attrib.source.dirty || attrib.source.usage == GL.STREAM_DRAW) {
          const vbo = vao.vboMap.get(attrib.source);
          if (vbo) {
            this.gl.bindVertexArray(null);
            attrib.source.dirty = false;
            vbo.updateRenderBuffer(this.gl, attrib.source);
          }
        }
      }
      if (primitive.indices && vao.ibo) {
        if (primitive.indices.dirty || primitive.indices.usage == GL.STREAM_DRAW) {
          primitive.indices.dirty = false;
          vao.ibo.indexBuffer.updateRenderBuffer(this.gl, primitive.indices);
        }
      }
      if (primitive.options?.instanceAttributes) {
        for (const attrib of primitive.options?.instanceAttributes!) {
          if (attrib.source.dirty || attrib.source.usage == GL.STREAM_DRAW) {
            const vbo = vao.vboMap.get(attrib.source);
            if (vbo) {
              this.gl.bindVertexArray(null);
              attrib.source.dirty = false;
              vbo.updateRenderBuffer(this.gl, attrib.source);
            }
          }
        }
      }
      return vao;
    }

    this.gl.bindVertexArray(null);

    // VBO
    const vboList: Vbo[] = [];
    for (let attrib of primitive.attributes) {
      const vbo = this._getOrCreateVertexBuffer(attrib.source);
      vboList.push(vbo);
    }

    // IBO
    let ibo: Ibo | undefined = undefined;
    if (primitive.indices) {
      ibo = this._getOrCreateIndexBuffer(primitive.indices);
    }

    // Instancing
    const instanceList: Vbo[] = [];
    if (primitive.options?.instanceAttributes) {
      for (let attrib of primitive.options?.instanceAttributes) {
        const vbo = this._getOrCreateVertexBuffer(attrib.source);
        instanceList.push(vbo);
      }
    }

    // VAO
    vao = new Vao(this.gl, program, primitive, vboList, ibo, instanceList);
    this._primVaoMap.set(primitive, vao);
    return vao;
  }

  drawPrimitive(
    view: XRView,
    matrix: mat4, primitive: Primitive,
    state: {
      prevProgram: Program | null,
      prevMaterial: Material | null,
      prevVao: Vao | null,
    },
    rightView?: XRView
  ) {

    let gl = this.gl;
    const [program, uboMap] = this._programFactory.getOrCreateProgram(gl, primitive);
    const vao = this._getOrCreatePrimtive(primitive, program);
    // Loop through every primitive known to the renderer.
    // Bind the primitive material's program if it's different than the one we
    // were using for the previous primitive.
    // TODO: The ording of this could be more efficient.
    const programChanged = state.prevProgram != program
    if (programChanged) {
      state.prevProgram = program;
      if (!state.prevProgram) {
        throw new Error("arienai");
      }
      program.use();

      if (program.uniformMap.LIGHT_DIRECTION) {
        gl.uniform3fv(program.uniformMap.LIGHT_DIRECTION, this._lighting.globalLightDir.array);
      }

      if (program.uniformMap.LIGHT_COLOR) {
        gl.uniform3fv(program.uniformMap.LIGHT_COLOR, this._lighting.globalLightColor.array);
      }

      gl.uniformMatrix4fv(program.uniformMap.PROJECTION_MATRIX, false,
        view.projectionMatrix);
      gl.uniformMatrix4fv(program.uniformMap.VIEW_MATRIX, false,
        view.transform.inverse.matrix);
      if (rightView) {
        gl.uniformMatrix4fv(program.uniformMap.RIGHT_PROJECTION_MATRIX, false,
          rightView.projectionMatrix);
        gl.uniformMatrix4fv(program.uniformMap.RIGHT_VIEW_MATRIX, false,
          rightView.transform.inverse.matrix);
      }
    }

    if (programChanged || state.prevMaterial != primitive.material) {
      this._bindMaterialState(primitive.material.state, state.prevMaterial?.state);
      program.bindMaterial(primitive.material,
        (src) => this._textureFactory.getOrCreateTexture(src));
      state.prevMaterial = primitive.material;

      for (const key in uboMap) {
        const ubo = uboMap[key];
        ubo.bind(gl, program.uboIndexMap[key].index);
      }
    }

    gl.uniformMatrix4fv(program.uniformMap.MODEL_MATRIX, false, matrix.array);

    if (vao != state.prevVao) {
      vao.bind(gl);
      state.prevVao = vao;
    }
    vao.draw(gl, primitive.drawCount, primitive.instanceCount);
  }

  _colorMaskNeedsReset = false;
  _depthMaskNeedsReset = false;
  private _bindMaterialState(materialState: MaterialState, prevMaterialState?: MaterialState) {
    let state = materialState.state;
    let prevState: number = prevMaterialState ? prevMaterialState.state : ~state;

    // Return early if both materials use identical state
    if (state == prevState) {
      return;
    }

    let gl = this.gl;

    // Any caps bits changed?
    if (materialState._capsDiff(prevState)) {

      setCap(gl, gl.CULL_FACE, CAP.CULL_FACE, prevState, state);
      setCap(gl, gl.BLEND, CAP.BLEND, prevState, state);
      setCap(gl, gl.DEPTH_TEST, CAP.DEPTH_TEST, prevState, state);
      setCap(gl, gl.STENCIL_TEST, CAP.STENCIL_TEST, prevState, state);

      let colorMaskChange = (state & CAP.COLOR_MASK) - (prevState & CAP.COLOR_MASK);
      if (colorMaskChange) {
        let mask = colorMaskChange > 1;
        this._colorMaskNeedsReset = !mask;
        gl.colorMask(mask, mask, mask, mask);
      }

      let depthMaskChange = (state & CAP.DEPTH_MASK) - (prevState & CAP.DEPTH_MASK);
      if (depthMaskChange) {
        this._depthMaskNeedsReset = !(depthMaskChange > 1);
        gl.depthMask(depthMaskChange > 1);
      }

      let stencilMaskChange = (state & CAP.STENCIL_MASK) - (prevState & CAP.STENCIL_MASK);
      if (stencilMaskChange) {
        gl.stencilMask(stencilMaskChange > 1 ? 0xff : 0x00);
      }
    }

    // Blending enabled and blend func changed?
    if (materialState._blendDiff(prevState)) {
      gl.blendFunc(materialState.blendFuncSrc, materialState.blendFuncDst);
    }

    // Depth testing enabled and depth func changed?
    if (materialState._depthFuncDiff(prevState)) {
      gl.depthFunc(materialState.depthFunc);
    }
  }
}
