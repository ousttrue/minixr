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

import { Node } from './node.mjs';
import { Material, MaterialSampler } from '../materials/material.mjs';
import { Texture } from '../materials/texture.mjs';
import { BoxBuilder } from '../geometry/box-builder.mjs';
import { vec3, mat4 } from '../../math/gl-matrix.mjs';


const GL = WebGLRenderingContext; // For enums


class CubeSeaMaterial extends Material {
  baseColor: MaterialSampler;
  constructor(public heavy = false) {
    super();
    this.baseColor = this.defineSampler('baseColor');
  }

  get materialName() {
    return 'CUBE_SEA';
  }

  get vertexSource() {
    return `
precision mediump float;
uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;

    in vec3 POSITION;
    in vec2 TEXCOORD_0;
    in vec3 NORMAL;

    out vec2 vTexCoord;
    out vec3 vLight;

    const vec3 lightDir = vec3(0.75, 0.5, 1.0);
    const vec3 ambientColor = vec3(0.5, 0.5, 0.5);
    const vec3 lightColor = vec3(0.75, 0.75, 0.75);

    void main() {
      vec3 normalRotated = vec3(MODEL_MATRIX * vec4(NORMAL, 0.0));
      float lightFactor = max(dot(normalize(lightDir), normalRotated), 0.0);
      vLight = ambientColor + (lightColor * lightFactor);
      vTexCoord = TEXCOORD_0;
      gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * vec4(POSITION, 1.0);
    }`;
  }

  get fragmentSource() {
    return `
      precision mediump float;
      uniform sampler2D baseColor;
      in vec2 vTexCoord;
      in vec3 vLight;
      out vec4 _Color;

      void main() {
        _Color = vec4(vLight, 1.0) * texture(baseColor, vTexCoord);
      }`;
  }
}

export class CubeSeaNode extends Node {
  heavyGpu: boolean;
  cubeCount: any;
  cubeScale: any;
  halfOnly: boolean;
  autoRotate: boolean;
  private _material: CubeSeaMaterial;
  heroNode: Node;
  constructor(options: {
    heavyGpu: boolean,
    cubeCount: number,
    cubeScale: number,
    halfOnly: boolean,
    autoRotate: boolean,
    texture: Texture,
  }) {
    super('CubeSeaNode');

    // Test variables
    // If true, use a very heavyweight shader to stress the GPU.
    this.heavyGpu = !!options.heavyGpu;

    // Number and size of the static cubes. Warning, large values
    // don't render right due to overflow of the int16 indices.
    this.cubeCount = options.cubeCount || (this.heavyGpu ? 12 : 10);
    this.cubeScale = options.cubeScale || 1.0;

    // Draw only half the world cubes. Helps test variable render cost
    // when combined with heavyGpu.
    this.halfOnly = !!options.halfOnly;

    // Automatically spin the world cubes. Intended for automated testing,
    // not recommended for viewing in a headset.
    this.autoRotate = !!options.autoRotate;


    this._material = new CubeSeaMaterial(this.heavyGpu);
    this._material.baseColor.texture = options.texture;

    {
      let boxBuilder = new BoxBuilder();
      // Build the spinning "hero" cubes
      boxBuilder.pushCube([0, 0.25, -0.8], 0.1);
      boxBuilder.pushCube([0.8, 0.25, 0], 0.1);
      boxBuilder.pushCube([0, 0.25, 0.8], 0.1);
      boxBuilder.pushCube([-0.8, 0.25, 0], 0.1);
      let heroPrimitive = boxBuilder.finishPrimitive(this._material);
      this.heroNode = new Node("hero");
      this.heroNode.primitives.push(heroPrimitive);
      this.addNode(this.heroNode);
    }

    {
      let boxBuilder = new BoxBuilder();
      let size = 0.4 * this.cubeScale;
      boxBuilder.pushCube([0, 0, 0], size);
      let cubeSeaPrimitive = boxBuilder.finishPrimitive(this._material);

      // Build the cube sea
      let halfGrid = this.cubeCount * 0.5;
      for (let x = 0; x < this.cubeCount; ++x) {
        for (let y = 0; y < this.cubeCount; ++y) {
          for (let z = 0; z < this.cubeCount; ++z) {
            let pos = [x - halfGrid, y - halfGrid, z - halfGrid];
            // Only draw cubes on one side. Useful for testing variable render
            // cost that depends on view direction.
            if (pos[2] > 0) {
              continue;
            }

            // Don't place a cube in the center of the grid.
            if (pos[0] == 0 && pos[1] == 0 && pos[2] == 0) {
              continue;
            }

            const cubeSeaNode = new Node('sea');
            cubeSeaNode.primitives.push(cubeSeaPrimitive);
            cubeSeaNode.local.translation = vec3.fromValues(pos[0], pos[1], pos[2]);

            this.addNode(cubeSeaNode);
          }
        }
      }
    }
  }

  protected _onUpdate(timestamp: number, _frameDelta: number,
    _refsp: XRReferenceSpace, _frame: XRFrame) {
    // if (this.autoRotate) {
    //   const matrix = this.cubeSeaNode.local.matrix;
    //   mat4.fromRotation(timestamp / 500, vec3.fromValues(0, -1, 0), { out: matrix });
    //   this.cubeSeaNode.local.invalidate();
    // }

    {
      const matrix = this.heroNode.local.matrix;
      mat4.fromRotation(timestamp / 2000, vec3.fromValues(0, 1, 0), { out: matrix });
      this.heroNode.local.invalidate();
    }
  }
}
