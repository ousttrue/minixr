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

import { Shader } from '../materials/shader.mjs';
import { Material } from '../materials/material.mjs';
import { BufferSource, Primitive, PrimitiveAttribute } from '../buffer/primitive.mjs';
import { MaterialState } from '../materials/materialstate.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { mat4 } from '../math/gl-matrix.mjs';


const GL = WebGL2RenderingContext; // For enums

const state = new MaterialState();
state.blend = true;
state.blendFuncSrc = GL.SRC_ALPHA;
state.blendFuncDst = GL.ONE;
state.depthTest = false;
state.cullFace = false;


const BoundsShader: Shader = {
  name: 'BOUNDS_RENDERER',

  vertexSource: `
in vec3 POSITION;

uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;

void main() {
  gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * vec4(POSITION, 1.0);
}`,

  fragmentSource: `
precision mediump float;
out vec4 _Color;

void main() {
  _Color = vec4(0.4, 0.4, 0.4, 1);
}`,
}

// 0 1
// 3 2
function createQuads(geometry: DOMPointReadOnly[]): [Float32Array, Uint16Array] {
  const vertices = new Float32Array([
    geometry[0].x, 0, geometry[0].y,
    geometry[1].x, 0, geometry[1].y,
    geometry[2].x, 0, geometry[2].y,
    geometry[3].x, 0, geometry[3].y,
  ]);
  const indices = new Uint16Array([0, 3, 2, 2, 1, 0])
  return [vertices, indices];
}

function createConvex(geometry: DOMPointReadOnly[]): [Float32Array, Uint16Array] {
  const verts = [];
  const indices = [];
  const BOUNDS_HEIGHT = 0.5;

  // Tessellate the bounding points from XRStageBounds and connect
  // each point to a neighbor and 0,0,0.
  let lastIndex = -1;
  for (const point of geometry) {
    lastIndex += 2;
    if (verts.length > 0) {
      indices.push(lastIndex, lastIndex - 1, lastIndex - 2);
      indices.push(lastIndex - 2, lastIndex - 1, lastIndex - 3);
    }

    verts.push(point.x, 0, point.z);
    verts.push(point.x, BOUNDS_HEIGHT, point.z);
  }

  const pointCount = geometry.length;
  if (pointCount > 1) {
    indices.push(1, 0, lastIndex);
    indices.push(lastIndex, 0, lastIndex - 1);
  }

  const vertexBuffer = new Float32Array(verts);
  const indexBuffer = new Uint16Array(indices);
  return [vertexBuffer, indexBuffer];
}

export class BoundsRenderer {

  static get requiredFeature(): string {
    return 'bounded-floor';
  }

  static async factory(world: World, space: XRBoundedReferenceSpace): Promise<void> {

    const geometry = space.boundsGeometry;
    if (!geometry) {
      return;
    }

    if (geometry.length == 0) {
      console.warn('empty boundsGeometry');
      return;
    }

    console.log(`BoundsRenderer: create:`, geometry);
    // geometry is clockwise 2d points

    const [vertices, indices] = (geometry.length == 4)
      ? createQuads(geometry)
      : createConvex(geometry)
      ;

    let primitive = new Primitive(
      new Material('bounds', BoundsShader), [
      new PrimitiveAttribute('POSITION', new BufferSource(3, vertices), 3, GL.FLOAT, 12, 0)],
      vertices.length / 3,
      new BufferSource(1, indices));

    world.create(new mat4(), primitive);

    return Promise.resolve();
  }
}
