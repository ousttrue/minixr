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
import { BufferSource } from './buffersource.mjs';


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


export class Mesh {
  bb = new BoundingBox();
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
      instanceAttributes?: PrimitiveAttribute[],
      min?: any,
      max?: any,
    }
  ) {
    if (options?.min && options?.max) {
      this.bb.expand(vec3.fromValues(
        options.min[0], options.min[1], options.min[2]));
      this.bb.expand(vec3.fromValues(
        options.max[0], options.max[1], options.max[2]));
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
