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
import { vec3, BoundingBox } from '../math/gl-matrix.mjs';
import { Material } from '../materials/material.mjs';


const GL = WebGL2RenderingContext; // For enums


function getComponentSize(componentType: number) {
  switch (componentType) {
    case GL.FLOAT: return 4;
    case GL.UNSIGNED_INT: return 4;
    default: throw new Error(`unknown component type: ${componentType}`);
  }
}

export class PrimitiveAttribute {
  constructor(
    public readonly name: string,
    /** may sharing from multi PrimitiveAttributes */
    public readonly buffer: DataView,
    public readonly componentCount: number = 3,
    public readonly componentType: number = GL.FLOAT,
    public readonly stride: number = 0,
    public readonly byteOffset: number = 0,
    public readonly normalized = false) {
    if (this.stride == 0) {
      // console.warn(name, 'stride=0');
    }
  }

  calcStride(): number {
    return getComponentSize(this.componentType) * this.componentCount;
  }
}

export class Primitive {
  bb = new BoundingBox();
  vertexUpdated = false;
  instanceUpdated = false;
  drawCount: number = 0;
  instanceCount: number = 0;
  constructor(
    public material: Material,
    public attributes: PrimitiveAttribute[],
    public vertexCount: number,
    public indices?: Uint8Array | Uint16Array | Uint32Array,
    public options?: {
      /** GL.TRIANGLES */
      mode?: number,
      /** GL.STATIC_DRAW */
      attributesUsage?: number,
      /** GL.STATIC_DRAW */
      indicesUsage?: number,

      instanceAttributes?: PrimitiveAttribute[],
    }
  ) {
    for (const attr of attributes) {
      if (attr.name == 'POSITION') {
        this.updateBBFromPositions(attr);
      }
    }

    if (indices) {
      this.drawCount = indices.length;
    }
    else {
      this.drawCount = vertexCount;
    }
  }

  calcStrideFor(attribute: PrimitiveAttribute) {
    let stride = 0;
    for (const a of this.attributes) {
      if (a.buffer == attribute.buffer) {
        stride += a.calcStride();
      }
    }
    return stride;
  }

  updateBBFromPositions(attribute: PrimitiveAttribute) {
    const view = attribute.buffer;
    const floats = new Float32Array(view.buffer, view.byteOffset, view.byteLength / 4);
    const stride = this.calcStrideFor(attribute) / 4;
    for (let i = 0; i < floats.length; i += stride) {
      if (stride == 2) {
        this.bb.expand(vec3.fromValues(floats[i], floats[i + 1], 0));
      }
      else {
        this.bb.expand(new vec3(floats.subarray(i, i + 3)));
      }
    }
    if (!this.bb.isFinite()) {
      console.log(`${this.bb}`);
    }
  }

  hitTest(p: vec3): boolean {
    if (!this.bb.isFinite()) {
      for (const attr of this.attributes) {
        if (attr.name == 'POSITION') {
          this.updateBBFromPositions(attr);
        }
      }
    }
    return this.bb.contains(p);
  }
}
