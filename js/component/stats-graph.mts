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

import { Material } from '../materials/material.mjs';
import { Primitive, PrimitiveAttribute } from '../geometry/primitive.mjs';
import { vec3, BoundingBox, Transform } from '../math/gl-matrix.mjs';
import { Stats, now } from './stats-viewer.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';

const GL = WebGLRenderingContext; // For enums

const SEGMENTS = 30;
const MAX_FPS = 90;

class StatsMaterial extends Material {
  get materialName() {
    return 'STATS_VIEWER';
  }

  get vertexSource() {
    return `
uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;
in vec3 POSITION;
in vec3 COLOR_0;
out vec4 vColor;

void main() {
  vColor = vec4(COLOR_0, 1.0);
  gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * vec4(POSITION, 1.0);
}`;
  }

  get fragmentSource() {
    return `
precision mediump float;
in vec4 vColor;
out vec4 _Color;

void main() {
  _Color = vColor;
}`;
  }
}

function segmentToX(i: number): number {
  return ((0.9 / SEGMENTS) * i) - 0.45;
}

function fpsToY(value: number): number {
  return (Math.min(value, MAX_FPS) * (0.7 / MAX_FPS)) - 0.45;
}

function fpsToRGB(value: number): { r: Number, g: Number, b: Number } {
  return {
    r: Math.max(0.0, Math.min(1.0, 1.0 - (value / 60))),
    g: Math.max(0.0, Math.min(1.0, ((value - 15) / (MAX_FPS - 15)))),
    b: Math.max(0.0, Math.min(1.0, ((value - 15) / (MAX_FPS - 15)))),
  };
}


export class StatsGraph {
  fpsVertexBuffer: Float32Array;
  fpsIndexBuffer: Uint16Array;
  primitive: Primitive;

  private _performanceMonitoring: boolean = false;
  private _prevGraphUpdateTime: number = now();
  private _fpsStep: number = this._performanceMonitoring ? 1000 : 250;
  private _lastSegment: number = 0;
  private _fpsAverage: number = 0;

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

    this.fpsVertexBuffer = new Float32Array(fpsVerts);
    this.fpsIndexBuffer = new Uint16Array(fpsIndices);

    const fpsVertexBuffer = new DataView(this.fpsVertexBuffer.buffer);
    const fpsAttribs = [
      new PrimitiveAttribute('POSITION', fpsVertexBuffer, 3, GL.FLOAT, 24, 0),
      new PrimitiveAttribute('COLOR_0', fpsVertexBuffer, 3, GL.FLOAT, 24, 12),
    ];
    const material = new StatsMaterial()
    this.primitive = new Primitive(material,
      fpsAttribs, this.fpsVertexBuffer.length / 6, this.fpsIndexBuffer,
      { attributesUsage: GL.DYNAMIC_DRAW });
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
    let updateVerts = [
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
      this.fpsVertexBuffer.set(updateVerts, this._lastSegment * 24);
      updateVerts = [
        segmentToX(0), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(.25), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(0), fpsToY(0), 0.02, color.r, color.g, color.b,
        segmentToX(.25), fpsToY(0), 0.02, color.r, color.g, color.b,
      ];
      this.fpsVertexBuffer.set(updateVerts);
    } else {
      updateVerts.push(
        segmentToX(this._lastSegment + 1), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(this._lastSegment + 1.25), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(this._lastSegment + 1), fpsToY(0), 0.02, color.r, color.g, color.b,
        segmentToX(this._lastSegment + 1.25), fpsToY(0), 0.02, color.r, color.g, color.b
      );
      this.fpsVertexBuffer.set(updateVerts, this._lastSegment * 24);
    }

    this._lastSegment = (this._lastSegment + 1) % SEGMENTS;

    this.primitive.vertexUpdated = true;
  }

  static async factory(world: World, transform: Transform): Promise<void> {
    const graph = new StatsGraph();

    world.create(transform, graph.primitive, new Stats((time, stats) => {
      return graph.updateStats(time, stats);
    }));

    return Promise.resolve();
  }
}
