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

import { vec3, BoundingBox } from '../../math/gl-matrix.mjs';
import { Material } from '../material.mjs';

const GL = WebGLRenderingContext; // For enums

export const ATTRIB: { [key: string]: number } = {
  POSITION: 1,
  NORMAL: 2,
  TANGENT: 3,
  TEXCOORD_0: 4,
  TEXCOORD_1: 5,
  COLOR_0: 6,
};

export const ATTRIB_MASK: { [key: string]: number } = {
  POSITION: 0x0001,
  NORMAL: 0x0002,
  TANGENT: 0x0004,
  TEXCOORD_0: 0x0008,
  TEXCOORD_1: 0x0010,
  COLOR_0: 0x0020,
};

export class VertexBuffer {
  constructor(
    public readonly target: number,
    public readonly data: Uint8Array,
    public readonly usage = GL.STATIC_DRAW) { }
}

export class PrimitiveAttribute {
  constructor(
    public readonly name: string,
    public readonly buffer: VertexBuffer,
    public readonly componentCount: number = 3,
    public readonly componentType: number = GL.FLOAT,
    public readonly stride: number = 0,
    public readonly byteOffset: number = 0,
    public readonly normalized = false) {
  }
}

export function getAttributeMask(attributes: PrimitiveAttribute[]): number {
  let attributeMask = 0;
  for (let attribute of attributes) {
    attributeMask |= ATTRIB_MASK[attribute.name];
  }
  return attributeMask;
}

export class Primitive {
  indexBuffer: VertexBuffer | null = null;
  indexByteOffset: number = 0;
  indexType: number = 0;
  bb = new BoundingBox();
  constructor(
    public material: Material,
    public attributes: PrimitiveAttribute[] = [],
    public elementCount = 0,
    public mode = 4) {
  }

  setIndexBuffer(indexBuffer: VertexBuffer, byteOffset = 0, indexType = GL.UNSIGNED_SHORT) {
    this.indexBuffer = indexBuffer;
    this.indexByteOffset = byteOffset;
    this.indexType = indexType;
  }
}
