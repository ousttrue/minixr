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

import { vec3 } from '../math/gl-matrix.mjs';

export class PrimitiveAttribute {
  name: any;
  buffer: any;
  componentCount: any;
  componentType: any;
  stride: any;
  byteOffset: any;
  normalized: boolean;
  constructor(name: string, buffer, componentCount: number, componentType: number, stride: number, byteOffset: number) {
    this.name = name;
    this.buffer = buffer;
    this.componentCount = componentCount || 3;
    this.componentType = componentType || 5126; // gl.FLOAT;
    this.stride = stride || 0;
    this.byteOffset = byteOffset || 0;
    this.normalized = false;
  }
}

export class Primitive {
  indexBuffer: null = null;
  indexByteOffset: number = 0;
  indexType: number = 0;
  private _min: vec3 | null = null;
  private _max: vec3 | null = null;
  constructor(public attributes = [], public elementCount = 0, public mode = 4) {
  }

  setIndexBuffer(indexBuffer, byteOffset: number | undefined, indexType: number | undefined) {
    this.indexBuffer = indexBuffer;
    this.indexByteOffset = byteOffset || 0;
    this.indexType = indexType || 5123; // gl.UNSIGNED_SHORT;
  }

  setBounds(min: vec3, max: vec3) {
    this._min = min.clone();
    this._max = max.clone();
  }
}
