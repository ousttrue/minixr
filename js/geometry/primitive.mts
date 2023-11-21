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


export type BufferSourceArray = (
  Float32Array
  | Uint8Array | Uint16Array | Uint32Array
);


export class BufferSource {
  dirty = false;

  constructor(
    public readonly componentCount: number,
    public readonly array: BufferSourceArray,
  ) {
  }

  get glType(): number {
    if (this.array instanceof Uint16Array) {
      return GL.UNSIGNED_SHORT;
    }
    else if (this.array instanceof Uint8Array) {
      return GL.UNSIGNED_BYTE;
    }
    else if (this.array instanceof Uint32Array) {
      return GL.UNSIGNED_INT;
    }
    else {
      throw new Error("unknown");
    }
  }

  get length() {
    return this.array.length / this.componentCount;
  }

  get stride() {
    return this.array.byteLength / this.array.length * this.componentCount
  }

  updateBBFromPositions(bb: BoundingBox) {
    const floats = this.array as Float32Array;
    for (let i = 0; i < floats.length; i += this.componentCount) {
      if (this.componentCount == 2) {
        bb.expand(vec3.fromValues(floats[i], floats[i + 1], 0));
      }
      else {
        bb.expand(new vec3(floats.subarray(i, i + 3)));
      }
    }
    if (!bb.isFinite()) {
      console.log(`${bb}`);
    }
  }
}


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
    public readonly source: BufferSource,
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
    public indices?: BufferSource,
    public options?: {
      /** GL.TRIANGLES */
      mode?: number,
      /** GL.STATIC_DRAW */
      attributesUsage?: number,
      /** GL.STATIC_DRAW */
      indicesUsage?: number,

      instanceAttributes?: PrimitiveAttribute[],

      min?: any,
      max?: any,
    }
  ) {
    if (options?.min && options?.max) {
      this.bb.expand(vec3.fromValues(...options.min));
      this.bb.expand(vec3.fromValues(...options.max));
    }
    else {
      for (const attr of attributes) {
        if (attr.name == 'POSITION') {
          attr.source.updateBBFromPositions(this.bb);
        }
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
      if (a.source == attribute.source) {
        stride += a.calcStride();
      }
    }
    return stride;
  }

  hitTest(p: vec3): boolean {
    if (!this.bb.isFinite()) {
      for (const attr of this.attributes) {
        if (attr.name == 'POSITION') {
          attr.source.updateBBFromPositions(this.bb);
        }
      }
    }
    return this.bb.contains(p);
  }
}
