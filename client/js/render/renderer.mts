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

import { mat4, vec3 } from '../../../lib/math/gl-matrix.mjs';
import { Material } from '../../../lib/materials/material.mjs';
import { MaterialState, CAP } from '../../../lib/materials/materialstate.mjs';
import { Mesh, SubMesh, MeshVertexAttribute } from '../../../lib/buffer/mesh.mjs';
import { BufferSource, ElementType } from '../../../lib/buffer/buffersource.mjs';
import { WglVao, VertexAttribute } from '../../../lib/wgl/vao.mjs';
import { WglBuffer, BufferType } from '../../../lib/wgl/buffer.mjs';
import { WglShader, ModShader } from '../../../lib/wgl/shader.mjs';

const GL = WebGL2RenderingContext; // For enums

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
  private _bufferMap: Map<BufferSource, WglBuffer> = new Map();
  private _primVaoMap: Map<Mesh, WglVao> = new Map();
  private _shaderMap: Map<SubMesh, WglShader> = new Map();

  _ubo: WglBuffer;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    multiview = false,
  ) {
    this._ubo = new WglBuffer(gl, GL.UNIFORM_BUFFER);
  }

  private _getOrCreateProgram(submesh: SubMesh): WglShader {
    let shader = this._shaderMap.get(submesh);
    if (shader) {
      return shader;
    }

    shader = new ModShader(this.gl, submesh.material.shader);
    this._shaderMap.set(submesh, shader);
    return shader;
  }

  private _getOrCreateBuffer(source: BufferSource, buffertype: BufferType, elementtype?: ElementType): WglBuffer {
    let buffer = this._bufferMap.get(source);
    if (buffer) {
      return buffer;
    }

    buffer = new WglBuffer(this.gl, buffertype, elementtype);
    buffer.upload(source.array);
    this._bufferMap.set(source, buffer);
    return buffer;
  }

  private _getOrCreateMesh(mesh: Mesh): WglVao {
    let vao = this._primVaoMap.get(mesh);
    if (vao) {
      for (const attrib of mesh.attributes) {
        if (attrib.source.dirty) {
          const vbo = this._bufferMap.get(attrib.source);
          if (vbo) {
            // update vbo
            this.gl.bindVertexArray(null);
            attrib.source.dirty = false;
            vbo.upload(attrib.source.array);
          }
        }
      }
      if (mesh.indices && vao.indices) {
        if (mesh.indices.dirty) {
          // update ibo
          mesh.indices.dirty = false;
          vao.indices.upload(mesh.indices.array);
        }
      }
      if (mesh.instancing) {
        for (const attrib of mesh.instancing.instanceAttributes!) {
          if (attrib.source.dirty || attrib.source.usage == GL.STREAM_DRAW) {
            const vbo = this._bufferMap.get(attrib.source);
            if (vbo) {
              // update instancing
              this.gl.bindVertexArray(null);
              attrib.source.dirty = false;
              vbo.upload(attrib.source.array);
            }
          }
        }
      }
      return vao;
    }

    this.gl.bindVertexArray(null);

    // IBO
    let ibo: WglBuffer | undefined = undefined;
    if (mesh.indices) {
      ibo = this._getOrCreateBuffer(mesh.indices, GL.ELEMENT_ARRAY_BUFFER, mesh.indices.glType);
    }

    const createAttribute = (src: MeshVertexAttribute): VertexAttribute => ({
      name: src.name,
      buffer: this._getOrCreateBuffer(src.source, GL.ARRAY_BUFFER),
      componentType: src.componentType,
      componentCount: src.componentCount,
      bufferStride: src.stride,
      bufferOffset: src.byteOffset,
    });

    // VAO
    vao = new WglVao(this.gl,
      mesh.attributes.map(createAttribute),
      ibo,
      mesh.instancing?.instanceAttributes.map(createAttribute));
    this._primVaoMap.set(mesh, vao);
    return vao;
  }

  drawPrimitive(
    view: XRView,
    matrix: mat4, mesh: Mesh,
    state: {
      prevProgram: WglShader | null,
      prevMaterial: Material | null,
      prevVao: WglVao | null,
    },
    rightView?: XRView
  ) {

    let gl = this.gl;
    const vao = this._getOrCreateMesh(mesh);

    if (vao != state.prevVao) {
      vao.bind();
      state.prevVao = vao;
    }

    let drawOffset = 0
    for (const submesh of mesh.submeshes) {
      const program = this._getOrCreateProgram(submesh);
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

      if (programChanged || state.prevMaterial != submesh.material) {
        this._bindMaterialState(submesh.material.state, state.prevMaterial?.state);
        // program.bindMaterial(submesh.material,
        //   (src) => this._textureFactory.getOrCreateTexture(src));
        state.prevMaterial = submesh.material;

        for (const key in program.uboIndexMap) {
          const { index, byteLength } = program.uboIndexMap[key];
          this._ubo.upload(new ArrayBuffer(byteLength))
          program.setUbo(key, this._ubo, index);
        }
      }

      gl.uniformMatrix4fv(program.uniformMap.MODEL_MATRIX, false, matrix.array);

      vao.draw(submesh.mode, submesh.drawCount, mesh.instancing?.instanceCount);
      drawOffset += submesh.drawCount;
    }
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
