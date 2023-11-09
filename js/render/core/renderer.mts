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

import { Material, CAP, MAT_STATE, RENDER_ORDER, stateToBlendFunc } from './material.mjs';
import { Node } from '../../scene/node.mjs';
import { Primitive, getAttributeMask } from './primitive.mjs';
import { mat4, vec3 } from '../../math/gl-matrix.mjs';
import { Vao } from './renderprimitive.mjs';
import { RenderView } from './renderview.mjs';
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

export class RenderBuffer {
  private _target: any;
  private _usage: any;
  private _length: number;
  constructor(target, usage, buffer, length = 0) {
    this._target = target;
    this._usage = usage;
    this._length = length;
    if (buffer instanceof Promise) {
      this._buffer = null;
      this._promise = buffer.then((buffer) => {
        this._buffer = buffer;
        return this;
      });
    } else {
      this._buffer = buffer;
      this._promise = Promise.resolve(this);
    }
  }

  waitForComplete() {
    return this._promise;
  }
}






const inverseMatrix = new mat4();


export class Renderer {
  private _gl: WebGL2RenderingContext;
  private _frameId: number;
  private _renderPrimitives: any[];
  private _cameraPositions: vec3[];
  private _depthMaskNeedsReset: boolean;
  private _colorMaskNeedsReset: boolean;
  private _globalLightColor = new vec3();
  private _globalLightDir = new vec3();

  private _materialFactory: MaterialFactory;

  constructor(gl: RenderingContext | null, multiview?) {
    this._gl = gl || createWebGLContext();
    this._materialFactory = new MaterialFactory(this._gl, multiview);
    this._frameId = 0;
    this._renderPrimitives = Array(RENDER_ORDER.DEFAULT);
    this._cameraPositions = [];


    this._depthMaskNeedsReset = false;
    this._colorMaskNeedsReset = false;

    this.globalLightColor = DEF_LIGHT_COLOR.copy();
    this.globalLightDir = DEF_LIGHT_DIR.copy();
  }

  get gl() {
    return this._gl;
  }

  set globalLightColor(value: vec3) {
    value.copy({ out: this._globalLightColor });
  }

  get globalLightColor() {
    return this._globalLightColor;
  }

  set globalLightDir(value: vec3) {
    value.copy({ out: this._globalLightDir });
  }

  get globalLightDir() {
    return this._globalLightDir;
  }

  createRenderBuffer(target, data, usage = GL.STATIC_DRAW) {
    let gl = this._gl;
    let glBuffer = gl.createBuffer();

    if (data instanceof Promise) {
      let renderBuffer = new RenderBuffer(target, usage, data.then((data) => {
        gl.bindBuffer(target, glBuffer);
        gl.bufferData(target, data, usage);
        renderBuffer._length = data.byteLength;
        return glBuffer;
      }));
      return renderBuffer;
    } else {
      gl.bindBuffer(target, glBuffer);
      gl.bufferData(target, data, usage);
      return new RenderBuffer(target, usage, glBuffer, data.byteLength);
    }
  }

  updateRenderBuffer(buffer, data, offset = 0) {
    if (buffer._buffer) {
      let gl = this._gl;
      gl.bindBuffer(buffer._target, buffer._buffer);
      if (offset == 0 && buffer._length == data.byteLength) {
        gl.bufferData(buffer._target, data, buffer._usage);
      } else {
        gl.bufferSubData(buffer._target, offset, data);
      }
    } else {
      buffer.waitForComplete().then((buffer) => {
        this.updateRenderBuffer(buffer, data, offset);
      });
    }
  }

  createRenderPrimitive(primitive: Primitive, material: Material) {
    const attributeMask = getAttributeMask(primitive.attributes);
    const program = this._materialFactory.getMaterialProgram(material, attributeMask);
    const renderMaterial = this._materialFactory.createMaterial(material, program);
    const vao = new Vao(this._gl, primitive, renderMaterial, attributeMask);
    if (!this._renderPrimitives[renderMaterial._renderOrder]) {
      this._renderPrimitives[renderMaterial._renderOrder] = [];
    }
    this._renderPrimitives[renderMaterial._renderOrder].push(vao);
    return vao;
  }

  createMesh(primitive: Primitive, material: Material) {
    let meshNode = new Node();
    meshNode.addRenderPrimitive(this.createRenderPrimitive(primitive, material));
    return meshNode;
  }

  drawViews(views: RenderView[], rootNode: Node) {
    if (!rootNode) {
      return;
    }

    let gl = this._gl;
    this._frameId++;

    rootNode.markActive(this._frameId);

    // If there's only one view then flip the algorithm a bit so that we're only
    // setting the viewport once.
    if (views.length == 1 && views[0].viewport) {
      let vp = views[0].viewport;
      this._gl.viewport(vp.x, vp.y, vp.width, vp.height);
    }

    // Get the positions of the 'camera' for each view matrix.
    for (let i = 0; i < views.length; ++i) {
      if (this._cameraPositions.length <= i) {
        this._cameraPositions.push(views[i].viewMatrix.getTranslation());
      }
      else {
        views[i].viewMatrix.getTranslation({ out: this._cameraPositions[i] });
      }

      /*mat4.invert(inverseMatrix, views[i].viewMatrix);
      let cameraPosition = this._cameraPositions[i];
      vec3.set(cameraPosition, 0, 0, 0);
      vec3.transformMat4(cameraPosition, cameraPosition, inverseMatrix);*/
    }

    // Draw each set of render primitives in order
    for (let renderPrimitives of this._renderPrimitives) {
      if (renderPrimitives && renderPrimitives.length) {
        this._drawRenderPrimitiveSet(views, renderPrimitives);
      }
    }

    gl.bindVertexArray(null);

    if (this._depthMaskNeedsReset) {
      gl.depthMask(true);
    }
    if (this._colorMaskNeedsReset) {
      gl.colorMask(true, true, true, true);
    }
  }

  _drawRenderPrimitiveSet(views: RenderView[], vaoList: Vao[]) {
    let gl = this._gl;
    let program: Program | null = null;
    let material: RenderMaterial | undefined = undefined;

    // Loop through every primitive known to the renderer.
    for (let vao of vaoList) {
      // Skip over those that haven't been marked as active for this frame.
      if (vao._activeFrameId != this._frameId) {
        continue;
      }

      // Bind the primitive material's program if it's different than the one we
      // were using for the previous primitive.
      // TODO: The ording of this could be more efficient.
      if (program != vao.material.program) {
        program = vao.material.program;
        program.use();

        if (program.uniform.LIGHT_DIRECTION) {
          gl.uniform3fv(program.uniform.LIGHT_DIRECTION, this._globalLightDir.array);
        }

        if (program.uniform.LIGHT_COLOR) {
          gl.uniform3fv(program.uniform.LIGHT_COLOR, this._globalLightColor.array);
        }

        if (views.length == 1) {
          if (!this._multiview) {
            gl.uniformMatrix4fv(program.uniform.PROJECTION_MATRIX, false,
              views[0].projectionMatrix.array);
            gl.uniformMatrix4fv(program.uniform.VIEW_MATRIX, false,
              views[0].viewMatrix.array);
            gl.uniform3fv(program.uniform.CAMERA_POSITION, this._cameraPositions[0].array);
            gl.uniform1i(program.uniform.EYE_INDEX, views[0].eyeIndex);
          } else {
            let vp = views[0].viewport;
            gl.viewport(vp.x, vp.y, vp.width, vp.height);
            gl.uniformMatrix4fv(program.uniform.LEFT_PROJECTION_MATRIX, false, views[0].projectionMatrix);
            gl.uniformMatrix4fv(program.uniform.LEFT_VIEW_MATRIX, false, views[0].viewMatrix);
            gl.uniformMatrix4fv(program.uniform.RIGHT_PROJECTION_MATRIX, false, views[0].projectionMatrix);
            gl.uniformMatrix4fv(program.uniform.RIGHT_VIEW_MATRIX, false, views[0].viewMatrix);
            gl.uniform3fv(program.uniform.CAMERA_POSITION, this._cameraPositions[0]);
            gl.uniform1i(program.uniform.EYE_INDEX, views[0].eyeIndex);
          }
        }
      }

      if (material != vao.material) {
        this._materialFactory.bindMaterialState(vao.material, material);
        vao.material.bind(gl);
        material = vao.material;
      }

      if (vao._vao) {
        gl.bindVertexArray(vao._vao);
      } else {
        vao._vao = gl.createVertexArray();
        gl.bindVertexArray(vao._vao);
        vao.bindPrimitive(gl);
      }

      for (let i = 0; i < views.length; ++i) {
        let view = views[i];
        if (views.length > 1) {
          if (view.viewport) {
            let vp = view.viewport;
            gl.viewport(vp.x, vp.y, vp.width, vp.height);
          }
          if (this._multiview) {
            if (i == 0) {
              gl.uniformMatrix4fv(program.uniform.LEFT_PROJECTION_MATRIX, false, views[0].projectionMatrix);
              gl.uniformMatrix4fv(program.uniform.LEFT_VIEW_MATRIX, false, views[0].viewMatrix);
              gl.uniformMatrix4fv(program.uniform.RIGHT_PROJECTION_MATRIX, false, views[1].projectionMatrix);
              gl.uniformMatrix4fv(program.uniform.RIGHT_VIEW_MATRIX, false, views[1].viewMatrix);
            }
            // TODO(AB): modify shaders which use CAMERA_POSITION and EYE_INDEX to work with Multiview
            gl.uniform3fv(program.uniform.CAMERA_POSITION, this._cameraPositions[i]);
            gl.uniform1i(program.uniform.EYE_INDEX, view.eyeIndex);
          } else {
            gl.uniformMatrix4fv(program.uniform.PROJECTION_MATRIX, false, view.projectionMatrix);
            gl.uniformMatrix4fv(program.uniform.VIEW_MATRIX, false, view.viewMatrix);
            gl.uniform3fv(program.uniform.CAMERA_POSITION, this._cameraPositions[i]);
            gl.uniform1i(program.uniform.EYE_INDEX, view.eyeIndex);
          }
        }

        for (let instance of vao._instances) {
          if (instance._activeFrameId != this._frameId) {
            continue;
          }

          gl.uniformMatrix4fv(program.uniform.MODEL_MATRIX, false,
            instance.worldMatrix.array);

          if (vao._indexBuffer) {
            gl.drawElements(vao._mode, vao._elementCount,
              vao._indexType, vao._indexByteOffset);
          } else {
            gl.drawArrays(vao._mode, 0, vao._elementCount);
          }
        }
        if (this._multiview) {
          break;
        }
      }
    }
  }
}
