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
Heavily inspired by Mr. Doobs stats.js, this FPS counter is rendered completely
with WebGL, allowing it to be shown in cases where overlaid HTML elements aren't
usable (like WebXR), or if you want the FPS counter to be rendered as part of
your scene.
*/

import { Shader } from '../../../lib/materials/shader.mjs';
import { Material } from '../../../lib/materials/material.mjs';
import { Primitive, PrimitiveAttribute } from '../../../lib/buffer/primitive.mjs';
import { vec3, mat4, BoundingBox } from '../../../lib/math/gl-matrix.mjs';
import { Stats, now } from './stats-viewer.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { BufferSource } from '../../../lib/buffer/buffersource.mjs';


const GL = WebGLRenderingContext; // For enums

const SEGMENTS = 30;
const MAX_FPS = 90;


const StatsShader: Shader = {
  name: 'STATS_VIEWER',

  vertexSource: `
in vec3 POSITION;
in vec3 COLOR_0;
out vec4 vColor;

void main() {
  vColor = vec4(COLOR_0, 1.0);
  gl_Position = ViewProjection() * MODEL_MATRIX * vec4(POSITION, 1.0);
}`,

  fragmentSource: `
precision mediump float;
in vec4 vColor;
out vec4 _Color;

void main() {
  _Color = vColor;
}`,
}


function segmentToX(i: number): number {
  return ((0.9 / SEGMENTS) * i) - 0.45;
}

function fpsToY(value: number): number {
  return (Math.min(value, MAX_FPS) * (0.7 / MAX_FPS)) - 0.45;
}

function fpsToRGB(value: number): { r: number, g: number, b: number } {
  return {
    r: Math.max(0.0, Math.min(1.0, 1.0 - (value / 60))),
    g: Math.max(0.0, Math.min(1.0, ((value - 15) / (MAX_FPS - 15)))),
    b: Math.max(0.0, Math.min(1.0, ((value - 15) / (MAX_FPS - 15)))),
  };
}


export class StatsGraph {
  vertices: Float32Array;
  indices: Uint16Array;
  primitive: Primitive;

  private _performanceMonitoring: boolean = false;
  private _prevGraphUpdateTime: number = now();
  private _fpsStep: number = this._performanceMonitoring ? 1000 : 250;
  private _lastSegment: number = 0;
  private _fpsAverage: number = 0;
  fpsVertexBuffer: BufferSource;

  constructor() {
    let fpsVerts = [];
    let fpsIndices = [];

    // Graph geometry
    for (let i = 0; i < SEGMENTS; ++i) {
      // Bar top
      fpsVerts.push(segmentToX(i), fpsToY(0), 0.02, 0.0, 1.0, 1.0);
      fpsVerts.push(segmentToX(i + 1), fpsToY(0), 0.02, 0.0, 1.0, 1.0);

      // Bar bottom
      fpsVerts.push(segmentToX(i), fpsToY(0), 0.02, 0.0, 1.0, 1.0);
      fpsVerts.push(segmentToX(i + 1), fpsToY(0), 0.02, 0.0, 1.0, 1.0);

      let idx = i * 4;
      fpsIndices.push(idx, idx + 3, idx + 1,
        idx + 3, idx, idx + 2);
    }

    function addBGSquare(
      left: number, bottom: number, right: number, top: number,
      z: number, r: number, g: number, b: number) {
      let idx = fpsVerts.length / 6;

      fpsVerts.push(left, bottom, z, r, g, b);
      fpsVerts.push(right, top, z, r, g, b);
      fpsVerts.push(left, top, z, r, g, b);
      fpsVerts.push(right, bottom, z, r, g, b);

      fpsIndices.push(idx, idx + 1, idx + 2,
        idx, idx + 3, idx + 1);
    }

    // Panel Background
    addBGSquare(-0.5, -0.5, 0.5, 0.5, 0.0, 0.0, 0.0, 0.125);

    // FPS Background
    addBGSquare(-0.45, -0.45, 0.45, 0.25, 0.01, 0.0, 0.0, 0.4);

    // 30 FPS line
    addBGSquare(-0.45, fpsToY(30), 0.45, fpsToY(32), 0.015, 0.5, 0.0, 0.5);

    // 60 FPS line
    addBGSquare(-0.45, fpsToY(60), 0.45, fpsToY(62), 0.015, 0.2, 0.0, 0.75);

    this.vertices = new Float32Array(fpsVerts);
    this.indices = new Uint16Array(fpsIndices);

    this.fpsVertexBuffer = new BufferSource(6, this.vertices, GL.DYNAMIC_DRAW);
    const fpsAttribs = [
      new PrimitiveAttribute('POSITION',
        this.fpsVertexBuffer, 3, GL.FLOAT, 24, 0),
      new PrimitiveAttribute('COLOR_0',
        this.fpsVertexBuffer, 3, GL.FLOAT, 24, 12),
    ];
    const material = new Material('StatsMaterial', StatsShader)
    this.primitive = new Primitive(material,
      fpsAttribs, this.vertices.length / 6,
      new BufferSource(1, this.indices));
    this.primitive.bb = new BoundingBox(vec3.fromValues(-0.5, -0.5, 0.0), vec3.fromValues(0.5, 0.5, 0.015));
  }

  updateStats(time: number, stats: Stats): boolean {
    if (time <= this._prevGraphUpdateTime + this._fpsStep) {
      return false;
    }

    let intervalTime = time - this._prevGraphUpdateTime;
    this._fpsAverage = Math.round(1000 / (intervalTime / stats.frames));

    // Draw both average and minimum FPS for this period
    // so that dropped frames are more clearly visible.
    this._updateGraph(stats.fpsMin, this._fpsAverage);

    if (this._performanceMonitoring) {
      console.log(`Average FPS: ${this._fpsAverage} Min FPS: ${stats.fpsMin}`);
    }

    this._prevGraphUpdateTime = time;
    return true;
  }

  private _updateGraph(valueLow: number, valueHigh: number) {
    let color = fpsToRGB(valueLow);
    // Draw a range from the low to high value. Artificially widen the
    // range a bit to ensure that near-equal values still remain
    // visible - the logic here should match that used by the
    // "60 FPS line" setup below. Hitting 60fps consistently will
    // keep the top half of the 60fps background line visible.
    let y0 = fpsToY(valueLow - 1);
    let y1 = fpsToY(valueHigh + 1);

    // Update the current segment with the new FPS value
    let updateVerts: number[] = [
      segmentToX(this._lastSegment), y1, 0.02, color.r, color.g, color.b,
      segmentToX(this._lastSegment + 1), y1, 0.02, color.r, color.g, color.b,
      segmentToX(this._lastSegment), y0, 0.02, color.r, color.g, color.b,
      segmentToX(this._lastSegment + 1), y0, 0.02, color.r, color.g, color.b,
    ];

    // Re-shape the next segment into the green "progress" line
    color.r = 0.2;
    color.g = 1.0;
    color.b = 0.2;

    if (this._lastSegment == SEGMENTS - 1) {
      // If we're updating the last segment we need to do two bufferSubDatas
      // to update the segment and turn the first segment into the progress line.
      this.vertices.set(updateVerts, this._lastSegment * 24);
      updateVerts = [
        segmentToX(0), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(.25), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(0), fpsToY(0), 0.02, color.r, color.g, color.b,
        segmentToX(.25), fpsToY(0), 0.02, color.r, color.g, color.b,
      ];
      this.vertices.set(updateVerts);
    } else {
      updateVerts.push(
        segmentToX(this._lastSegment + 1), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(this._lastSegment + 1.25), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(this._lastSegment + 1), fpsToY(0), 0.02, color.r, color.g, color.b,
        segmentToX(this._lastSegment + 1.25), fpsToY(0), 0.02, color.r, color.g, color.b
      );
      this.vertices.set(updateVerts, this._lastSegment * 24);
    }

    this._lastSegment = (this._lastSegment + 1) % SEGMENTS;

    this.fpsVertexBuffer.dirty = true;
  }

  static async factory(world: World, matrix: mat4): Promise<void> {
    const graph = new StatsGraph();

    world.create(matrix, graph.primitive, new Stats((time, stats) => {
      return graph.updateStats(time, stats);
    }));

    return Promise.resolve();
  }
}
