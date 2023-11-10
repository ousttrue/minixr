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
import { Primitive, getAttributeMask } from '../scene/geometry/primitive.mjs';
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
  private _cameraPositions: vec3[];
  private _lighting = new Lighting();
  private _materialFactory: MaterialFactory;
  private _primVaoMap: Map<Primitive, Vao> = new Map();

  constructor(
    private readonly _gl: WebGL2RenderingContext,
    private _multiview = false) {
    this._materialFactory = new MaterialFactory(this._gl, _multiview);
    this._cameraPositions = [];
  }

  private _getOrCreatePrimtive(prim: Primitive) {
    let vao = this._primVaoMap.get(prim);
    if (vao) {
      return vao;
    }

    const attributeMask = getAttributeMask(prim.attributes);
    const program = this._materialFactory.getMaterialProgram(prim.material, attributeMask);
    const renderMaterial = this._materialFactory.createMaterial(prim.material, program);
    vao = new Vao(this._gl, prim, renderMaterial, attributeMask);
    this._primVaoMap.set(prim, vao);
    return vao;
  }

  drawViews(views: RenderView[], rootNode: Node) {
    if (!rootNode) {
      return;
    }

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
    }

    // Draw node redursive
    this._drawNode(views, rootNode);
  }

  private _drawNode(views: RenderView[], node: Node) {
    for (let prim of node.primitives) {
      const vao = this._getOrCreatePrimtive(prim);
      this._drawRenderPrimitiveSet(views, vao, node.worldMatrix)
    }

    for (let child of node.children) {
      this._drawNode(views, child);
    }
  }

  private _drawRenderPrimitiveSet(views: RenderView[], vao: Vao, worldMatrix: mat4) {
    let gl = this._gl;
    let program: Program | null = null;
    let material: RenderMaterial | undefined = undefined;

    // Loop through every primitive known to the renderer.
    // Bind the primitive material's program if it's different than the one we
    // were using for the previous primitive.
    // TODO: The ording of this could be more efficient.
    if (program != vao.material.program) {
      program = vao.material.program;
      program.use();

      if (program.uniform.LIGHT_DIRECTION) {
        gl.uniform3fv(program.uniform.LIGHT_DIRECTION, this._lighting.globalLightDir.array);
      }

      if (program.uniform.LIGHT_COLOR) {
        gl.uniform3fv(program.uniform.LIGHT_COLOR, this._lighting.globalLightColor.array);
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
          if (vp) {
            gl.viewport(vp.x, vp.y, vp.width, vp.height);
          }
          gl.uniformMatrix4fv(program.uniform.LEFT_PROJECTION_MATRIX,
            false, views[0].projectionMatrix.array);
          gl.uniformMatrix4fv(program.uniform.LEFT_VIEW_MATRIX,
            false, views[0].viewMatrix.array);
          gl.uniformMatrix4fv(program.uniform.RIGHT_PROJECTION_MATRIX,
            false, views[0].projectionMatrix.array);
          gl.uniformMatrix4fv(program.uniform.RIGHT_VIEW_MATRIX,
            false, views[0].viewMatrix.array);
          gl.uniform3fv(program.uniform.CAMERA_POSITION, this._cameraPositions[0].array);
          gl.uniform1i(program.uniform.EYE_INDEX, views[0].eyeIndex);
        }
      }
    }

    if (material != vao.material) {
      this._materialFactory.bindMaterialState(vao.material, material);
      vao.material.bind(gl);
      material = vao.material;
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
            gl.uniformMatrix4fv(program.uniform.LEFT_PROJECTION_MATRIX,
              false, views[0].projectionMatrix.array);
            gl.uniformMatrix4fv(program.uniform.LEFT_VIEW_MATRIX,
              false, views[0].viewMatrix.array);
            gl.uniformMatrix4fv(program.uniform.RIGHT_PROJECTION_MATRIX,
              false, views[1].projectionMatrix.array);
            gl.uniformMatrix4fv(program.uniform.RIGHT_VIEW_MATRIX,
              false, views[1].viewMatrix.array);
          }
          // TODO(AB): modify shaders which use CAMERA_POSITION and EYE_INDEX to work with Multiview
          gl.uniform3fv(program.uniform.CAMERA_POSITION, this._cameraPositions[i].array);
          gl.uniform1i(program.uniform.EYE_INDEX, view.eyeIndex);
        } else {
          gl.uniformMatrix4fv(program.uniform.PROJECTION_MATRIX,
            false, view.projectionMatrix.array);
          gl.uniformMatrix4fv(program.uniform.VIEW_MATRIX,
            false, view.viewMatrix.array);
          gl.uniform3fv(program.uniform.CAMERA_POSITION, this._cameraPositions[i].array);
          gl.uniform1i(program.uniform.EYE_INDEX, view.eyeIndex);
        }
      }

      gl.uniformMatrix4fv(program.uniform.MODEL_MATRIX, false,
        worldMatrix.array);

      vao.draw(gl);
      if (this._multiview) {
        break;
      }
    }
  }
}
