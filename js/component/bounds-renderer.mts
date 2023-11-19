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

/*
This file renders a passed in XRBoundedReferenceSpace object and attempts
to render geometry on the floor to indicate where the bounds is.
The bounds `geometry` is a series of DOMPointReadOnlys in
clockwise-order.
*/

import { Material, RENDER_ORDER } from '../material.mjs';
import { Node } from '../node.mjs';
import { Primitive, PrimitiveAttribute } from '../geometry/primitive.mjs';

const GL = WebGLRenderingContext; // For enums


export class BoundsRenderer extends Node {
  private _boundedRefSpace: any;
  constructor(boundedRefSpace: XRReferenceSpace) {
    super("BoundsRenderer");

    this._boundedRefSpace = boundedRefSpace;
  }

  get boundedRefSpace() {
    return this._boundedRefSpace;
  }

  set boundedRefSpace(refSpace: XRReferenceSpace) {
    if (this._boundedRefSpace) {
      this.primitives = [];
    }
    this._boundedRefSpace = refSpace;
    if (!refSpace) {
      return;
    }

    // @ts-ignore
    const geometry = refSpace.boundsGeometry as DOMPointReadOnly[];
    if (geometry.length === 0) {
      return;
    }

    let verts = [];
    let indices = [];

    // Tessellate the bounding points from XRStageBounds and connect
    // each point to a neighbor and 0,0,0.
    const pointCount = geometry.length;
    let lastIndex = -1;
    for (let i = 0; i < pointCount; i++) {
      const point = geometry[i];
      verts.push(point.x, 0, point.z);
      verts.push(point.x, BOUNDS_HEIGHT, point.z);

      lastIndex += 2;
      if (i > 0) {
        indices.push(lastIndex, lastIndex - 1, lastIndex - 2);
        indices.push(lastIndex - 2, lastIndex - 1, lastIndex - 3);
      }
    }

    if (pointCount > 1) {
      indices.push(1, 0, lastIndex);
      indices.push(lastIndex, 0, lastIndex - 1);
    }

    let vertexBuffer = new DataView(new Float32Array(verts).buffer);
    let indexBuffer = new Uint16Array(indices);
    let primitive = new Primitive(
      new BoundsMaterial(), [
      new PrimitiveAttribute('POSITION', vertexBuffer, 3, GL.FLOAT, 12, 0)],
      verts.length / 3,
      indexBuffer);
    this.primitives.push(primitive);
  }
}
