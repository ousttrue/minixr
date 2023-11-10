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

import { VertexBuffer, Primitive, PrimitiveAttribute } from './primitive.mjs';
import { Material } from '../material.mjs';
import { mat3, vec3, BoundingBox } from '../../math/gl-matrix.mjs';

const GL = WebGLRenderingContext; // For enums

const tempVec3 = new vec3();

export class PrimitiveStream {
  private _vertices: never[] = [];
  private _indices: number[] = [];
  private _geometryStarted: boolean = false;
  private _vertexOffset: number = 0;
  private _vertexIndex: number = 0;
  private _highIndex: number = 0;

  private _flipWinding: boolean = false;
  set flipWinding(value: boolean) {
    if (this._geometryStarted) {
      throw new Error(`Cannot change flipWinding before ending the current geometry.`);
    }
    this._flipWinding = value;
  }
  get flipWinding(): boolean {
    return this._flipWinding;
  }

  private _invertNormals: boolean = false;
  set invertNormals(value: boolean) {
    if (this._geometryStarted) {
      throw new Error(`Cannot change invertNormals before ending the current geometry.`);
    }
    this._invertNormals = value;
  }
  get invertNormals(): boolean {
    return this._invertNormals;
  }

  private _transform: null = null;
  private _normalTransform: null = null;
  set transform(value) {
    if (this._geometryStarted) {
      throw new Error(`Cannot change transform before ending the current geometry.`);
    }
    this._transform = value;
    if (this._transform) {
      if (!this._normalTransform) {
        this._normalTransform = mat3.create();
      }
      mat3.fromMat4(this._normalTransform, this._transform);
    }
  }
  get transform() {
    return this._transform;
  }

  private _bb = new BoundingBox();
  constructor() {
  }

  startGeometry() {
    if (this._geometryStarted) {
      throw new Error(`Attempted to start a new geometry before the previous one was ended.`);
    }

    this._geometryStarted = true;
    this._vertexIndex = 0;
    this._highIndex = 0;
  }

  endGeometry() {
    if (!this._geometryStarted) {
      throw new Error(`Attempted to end a geometry before one was started.`);
    }

    if (this._highIndex >= this._vertexIndex) {
      throw new Error(`Geometry contains indices that are out of bounds.
                       (Contains an index of ${this._highIndex} when the vertex count is ${this._vertexIndex})`);
    }

    this._geometryStarted = false;
    this._vertexOffset += this._vertexIndex;
    // TODO: Anything else need to be done to finish processing here?
  }

  pushVertex(x: number, y: number, z: number, u = 0, v = 0, nx = 0, ny = 0, nz = 1) {
    if (!this._geometryStarted) {
      throw new Error(`Cannot push vertices before calling startGeometry().`);
    }

    // Transform the incoming vertex if we have a transformation matrix
    if (this._transform) {
      tempVec3.x = x;
      tempVec3.y = y;
      tempVec3.z = z;
      vec3.transformMat4(tempVec3, tempVec3, this._transform);
      x = tempVec3.x;
      y = tempVec3.y;
      z = tempVec3.z;

      tempVec3[0] = nx;
      tempVec3[1] = ny;
      tempVec3[2] = nz;
      vec3.transformMat3(tempVec3, tempVec3, this._normalTransform);
      nx = tempVec3[0];
      ny = tempVec3[1];
      nz = tempVec3[2];
    }

    if (this._invertNormals) {
      nx *= -1.0;
      ny *= -1.0;
      nz *= -1.0;
    }

    this._vertices.push(x, y, z, u, v, nx, ny, nz);

    this._bb.expand(x, y, z);

    return this._vertexIndex++;
  }

  get nextVertexIndex() {
    return this._vertexIndex;
  }

  pushTriangle(idxA: number, idxB: number, idxC: number) {
    if (!this._geometryStarted) {
      throw new Error(`Cannot push triangles before calling startGeometry().`);
    }

    this._highIndex = Math.max(this._highIndex, idxA, idxB, idxC);

    idxA += this._vertexOffset;
    idxB += this._vertexOffset;
    idxC += this._vertexOffset;

    if (this._flipWinding) {
      this._indices.push(idxC, idxB, idxA);
    } else {
      this._indices.push(idxA, idxB, idxC);
    }
  }

  clear() {
    if (this._geometryStarted) {
      throw new Error(`Cannot clear before ending the current geometry.`);
    }

    this._vertices = [];
    this._indices = [];
    this._vertexOffset = 0;
    this._bb = new BoundingBox();
  }

  finishPrimitive(material: Material) {
    if (!this._vertexOffset) {
      throw new Error(`Attempted to call finishPrimitive() before creating any geometry.`);
    }

    let vertexBuffer = new VertexBuffer(GL.ARRAY_BUFFER, new Float32Array(this._vertices));
    let indexBuffer = new VertexBuffer(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._indices));

    let attribs = [
      new PrimitiveAttribute('POSITION', vertexBuffer, 3, GL.FLOAT, 32, 0),
      new PrimitiveAttribute('TEXCOORD_0', vertexBuffer, 2, GL.FLOAT, 32, 12),
      new PrimitiveAttribute('NORMAL', vertexBuffer, 3, GL.FLOAT, 32, 20),
    ];

    let primitive = new Primitive(material, attribs, this._indices.length);
    primitive.setIndexBuffer(indexBuffer);
    primitive.bb = this._bb

    return primitive;
  }
}

export class GeometryBuilderBase {
  private _stream: PrimitiveStream;
  constructor(primitiveStream = null) {
    if (primitiveStream) {
      this._stream = primitiveStream;
    } else {
      this._stream = new PrimitiveStream();
    }
  }

  set primitiveStream(value) {
    this._stream = value;
  }

  get primitiveStream() {
    return this._stream;
  }

  finishPrimitive(material: Material) {
    return this._stream.finishPrimitive(material);
  }

  clear() {
    this._stream.clear();
  }
}
