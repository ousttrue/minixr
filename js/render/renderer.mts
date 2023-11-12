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
import { Node } from '../scene/node.mjs';
import { RenderCommands } from '../scene/scene.mjs';
import { Primitive, getAttributeMask } from '../scene/geometry/primitive.mjs';
import { Vao, Vbo, Ibo } from './vao.mjs';
import { Program } from './program.mjs';
import { RenderMaterial, MaterialFactory } from './rendermaterial.mjs';

const GL = WebGLRenderingContext; // For enums

const DEF_LIGHT_DIR = vec3.fromValues(-0.1, -1.0, -0.2);
const DEF_LIGHT_COLOR = vec3.fromValues(3.0, 3.0, 3.0);

/**
 * Creates a WebGL context and initializes it with some common default state.
 */
export function createWebGLContext(glAttribs: any): RenderingContext | null {
  glAttribs = glAttribs || { alpha: false };

  let webglCanvas = document.createElement('canvas');
  let contextTypes = glAttribs.webgl2 ? ['webgl2'] : ['webgl', 'experimental-webgl'];

  let context = null;
  for (let contextType of contextTypes) {
    context = webglCanvas.getContext(contextType, glAttribs);
    if (context) {
      break;
    }
  }

  if (!context) {
    let webglType = (glAttribs.webgl2 ? 'WebGL 2' : 'WebGL');
    console.error('This browser does not support ' + webglType + '.');
  }

  return context;
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
  private _cameraPositions = new Float32Array(8);
  private _lighting = new Lighting();
  private _materialFactory: MaterialFactory;
  private _iboMap: Map<Object, Ibo> = new Map();
  private _vboMap: Map<DataView, Vbo> = new Map();
  private _primVaoMap: Map<Primitive, Vao> = new Map();

  constructor(
    private readonly _gl: WebGL2RenderingContext,
    private _multiview = false) {
    this._materialFactory = new MaterialFactory(this._gl, _multiview);
  }

  private _getOrCreateVertexBuffer(buffer: DataView, usage: number) {
    let vbo = this._vboMap.get(buffer);
    if (vbo) {
      return vbo;
    }

    vbo = new Vbo(this._gl, GL.ARRAY_BUFFER, buffer, usage);
    this._vboMap.set(buffer, vbo);
    return vbo;
  }

  private _getOrCreateIndexBuffer(indices: Uint8Array | Uint16Array | Uint32Array, usage: number): Ibo {
    let ibo = this._iboMap.get(indices);
    if (ibo) {
      return ibo;
    }

    const indexBuffer = new Vbo(this._gl, GL.ELEMENT_ARRAY_BUFFER,
      new DataView(indices.buffer, indices.byteOffset, indices.byteLength),
      usage);
    let indexType = 0;
    if (indices instanceof Uint16Array) {
      indexType = GL.UNSIGNED_SHORT;
    }
    else if (indices instanceof Uint8Array) {
      indexType = GL.UNSIGNED_BYTE;
    }
    else if (indices instanceof Uint32Array) {
      indexType = GL.UNSIGNED_INT;
    }
    else {
      throw new Error("unknown");
    }

    ibo = new Ibo(indexBuffer, indexType, indices.length);
    this._iboMap.set(indices, ibo);
    return ibo;
  }

  _used = new Set();
  private _getOrCreatePrimtive(primitive: Primitive) {
    let vao = this._primVaoMap.get(primitive);
    if (vao) {
      if (primitive.vertexUpdated) {
        this._used.clear();
        for (const attrib of primitive.attributes) {
          const vbo = vao.vboMap.get(attrib.buffer);
          if (vbo) {
            if (!this._used.has(vbo)) {
              this._used.add(vbo);
              vbo.updateRenderBuffer(this._gl, attrib.buffer);
            }
          }
        }
      }
      return vao;
    }

    const attributeMask = getAttributeMask(primitive.attributes);
    const program = this._materialFactory.getMaterialProgram(primitive.material, attributeMask);
    const renderMaterial = this._materialFactory.createMaterial(primitive.material, program);

    // IBO
    let ibo: Ibo | undefined = undefined;
    if (primitive.indices) {
      ibo = this._getOrCreateIndexBuffer(primitive.indices, primitive.options?.indicesUsage ?? GL.STATIC_DRAW);
    }

    // VBO
    const vboList: Vbo[] = [];
    for (let attrib of primitive.attributes) {
      const vbo = this._getOrCreateVertexBuffer(attrib.buffer, primitive.options?.attributesUsage ?? GL.STATIC_DRAW);
      vboList.push(vbo);
    }

    // VAO
    vao = new Vao(this._gl, primitive, renderMaterial, vboList, attributeMask, ibo);
    this._primVaoMap.set(primitive, vao);
    return vao;
  }

  drawViews(views: readonly XRView[], viewports: readonly XRViewport[], renderList: RenderCommands) {
    if (views.length != viewports.length) {
      throw new Error("arienai !!");
    }

    // Get the positions of the 'camera' for each view matrix.
    for (let i = 0; i < views.length; ++i) {
      const pos = views[i].transform.position;
      if (i == 0) {
        this._cameraPositions.set(views[i].transform.matrix.subarray(12), 0);
      }
      else if (i == 1) {
        this._cameraPositions.set(views[i].transform.matrix.subarray(12), 4);
      }
      else {
        throw new Error("?");
      }
    }

    if (this._multiview) {
      throw new Error("not implemented");
    }
    else {
      if (views.length != 2 || viewports.length != 2) {
        throw new Error("arienai ?");
      }
      // left
      this._drawView(views, viewports, 0, this._cameraPositions.subarray(0, 3), renderList);
      // right
      this._drawView(views, viewports, 1, this._cameraPositions.subarray(4, 7), renderList);
    }
  }

  private _drawView(views: readonly XRView[], viewports: readonly XRViewport[], eyeIndex: number,
    cameraPosition: Float32Array, renderList: RenderCommands) {
    let gl = this._gl;

    const view = views[eyeIndex];
    const vp = viewports[eyeIndex];
    gl.viewport(vp.x, vp.y, vp.width, vp.height);

    let program: Program | null = null;
    let material: Material | undefined = undefined;
    renderList.forEach((nodes, primitive) => {
      const vao = this._getOrCreatePrimtive(primitive);
      for (const node of nodes) {
        // Loop through every primitive known to the renderer.
        // Bind the primitive material's program if it's different than the one we
        // were using for the previous primitive.
        // TODO: The ording of this could be more efficient.
        const programChanged = program != vao.material.program
        if (programChanged) {
          program = vao.material.program;
          program.use();

          if (program.uniform.LIGHT_DIRECTION) {
            gl.uniform3fv(program.uniform.LIGHT_DIRECTION, this._lighting.globalLightDir.array);
          }

          if (program.uniform.LIGHT_COLOR) {
            gl.uniform3fv(program.uniform.LIGHT_COLOR, this._lighting.globalLightColor.array);
          }

          gl.uniformMatrix4fv(program.uniform.PROJECTION_MATRIX, false,
            view.projectionMatrix);
          gl.uniformMatrix4fv(program.uniform.VIEW_MATRIX, false,
            view.transform.inverse.matrix);
          gl.uniform3fv(program.uniform.CAMERA_POSITION, cameraPosition);
          gl.uniform1i(program.uniform.EYE_INDEX, eyeIndex);
        }

        if (programChanged || material != primitive.material) {
          this._materialFactory.bindMaterialState(primitive.material.state, material?.state);
          vao.material.bind(gl);
          material = primitive.material;
        }

        // @ts-ignore
        gl.uniformMatrix4fv(program.uniform.MODEL_MATRIX, false,
          node.worldMatrix.array);

        vao.draw(gl);
      }
    });
  }
}
