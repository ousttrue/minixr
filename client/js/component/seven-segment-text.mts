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
Renders simple text using a seven-segment LED style pattern. Only really good
for numbers and a limited number of other characters.
*/

import { Shader } from '../../../lib/materials/shader.mjs';
import { Material } from '../../../lib/materials/material.mjs';
import {
  Mesh, MeshVertexAttribute, SubMesh, Instancing
} from '../../../lib/buffer/mesh.mjs';
import { BufferSource } from '../../../lib/buffer/buffersource.mjs';
import { SevenSegmentDefinition } from './seven-segment-definition.mjs';
import { World } from '../../../lib/uecs/index.mjs';
import { Stats, now } from './stats-viewer.mjs';
import { mat4 } from '../../../lib/math/gl-matrix.mjs';

const GL = WebGLRenderingContext; // For enums

const SevenSegmentShader: Shader = {

  name: 'SEVEN_SEGMENT_TEXT',

  vertexSource: `
in vec3 a_Position;
in vec4 i_Cell;
in vec2 i_Char_Color;
out vec4 f_Color;

// TODO: pack to int[32]
uniform int ascii[128];

int getMask(int code)
{
  return ascii[code];
}

bool isVisible(int code, int segment)
{
  int mask = getMask(code);
  return (mask & (1 << segment)) != 0;
}

vec4 extractUint32(float src)
{
  uint rgba = floatBitsToUint(src);
  return vec4(
    float((rgba>>24) & uint(255)) / 255.0,
    float((rgba>>14) & uint(255)) / 255.0,
    float((rgba>> 8) & uint(255)) / 255.0,
    float((rgba>> 0) & uint(255)) / 255.0
  );
}

void main() {
  vec2 pos = i_Cell.xy + i_Cell.zw * a_Position.xy;
  bool visible = isVisible(floatBitsToInt(i_Char_Color.x), int(a_Position.z) % 7);
  // gl_Position = ViewProjection() * MODEL_MATRIX * vec4(pos, 0.01, 1);
  gl_Position = visible
    ? ViewProjection() * MODEL_MATRIX * vec4(pos, 0.04, 1.0)
    : vec4(0,0,0,0) // discard
    ;
  f_Color = extractUint32(i_Char_Color.y);
  // f_Color = vec4(1,1,1,1);
}`,

  fragmentSource: `
precision mediump float;
in vec4 f_Color;
out vec4 _Color;
void main() {
  _Color=f_Color;
}`,
}


/* Segment layout is as follows:

|-0-|
3   4
|-1-|
5   6
|-2-|

*/
class SevenSegment {

  vertices = new Float32Array(12 * 7);
  indices = new Uint16Array(6 * 7);
  ascii = new Int32Array(128);
  cells = new Float32Array(65535)
  charColors = new Uint32Array(65535)
  cellWidth = 0.08;
  cellHeight = this.cellWidth * 2;

  private _performanceMonitoring: boolean = false;
  private _prevGraphUpdateTime: number = now();
  private _fpsStep: number = this._performanceMonitoring ? 1000 : 250;
  private _fpsAverage: number = 0;
  primitive: Mesh;
  instancing: Instancing;
  cellsBuffer: BufferSource;
  charColorsBuffer: BufferSource;

  constructor(thickness = 0.1, margin = 0.05) {
    const l = 0 + margin
    const r = 1 - margin
    const cx = (l + r) * 0.5
    const t = 0
    const b = -1
    const cy = (t + b) * 0.5
    const tx = thickness * 2
    const ty = thickness

    this.defineSegment(0,
      l, t,
      r, t - ty);
    this.defineSegment(1,
      l, cy + ty * 0.5,
      r, cy - ty * 0.5);
    this.defineSegment(2,
      l, b + ty,
      r, b);

    this.defineSegment(3,
      l, t,
      l + tx, cy - ty * 0.5);
    this.defineSegment(5,
      l, cy + ty * 0.5,
      l + tx, b);

    this.defineSegment(4,
      r - tx, t,
      r, cy - ty * 0.5);
    this.defineSegment(6,
      r - tx, cy + ty * 0.5,
      r, b);

    for (const key in SevenSegmentDefinition) {
      this.defineAscii(key.codePointAt(0)!, SevenSegmentDefinition[key]);
    }

    const material = new Material('SevenSegmentShader', SevenSegmentShader);
    material.setUniform('ascii', this.ascii);

    // in vec2 a_Position;
    const vertexBuffer = new BufferSource(3, this.vertices);
    const vertexAttribs = [
      new MeshVertexAttribute('a_Position', vertexBuffer, 3, GL.FLOAT, 12, 0),
    ];

    this.cellsBuffer = new BufferSource(4, this.cells);
    this.charColorsBuffer = new BufferSource(2, this.charColors);
    const instanceAttribs = [
      new MeshVertexAttribute('i_Cell',
        this.cellsBuffer, 4, GL.FLOAT, 16, 0),
      new MeshVertexAttribute('i_Char_Color',
        this.charColorsBuffer, 2, GL.FLOAT, 8, 0)
    ]
    this.instancing = new Instancing(instanceAttribs);

    this.primitive = new Mesh(
      vertexAttribs, this.vertices.length / 2,
      [new SubMesh(material, this.indices.length)],
      new BufferSource(1, this.indices),
      this.instancing,
    );
  }

  defineSegment(id: number,
    left: number, top: number, right: number, bottom: number) {
    /*
     * 0 1
     * 3 2
     */
    let vOffset = id * 12;
    this.vertices[vOffset++] = left;
    this.vertices[vOffset++] = top;
    this.vertices[vOffset++] = id;
    this.vertices[vOffset++] = right;
    this.vertices[vOffset++] = top;
    this.vertices[vOffset++] = id;
    this.vertices[vOffset++] = right;
    this.vertices[vOffset++] = bottom;
    this.vertices[vOffset++] = id;
    this.vertices[vOffset++] = left;
    this.vertices[vOffset++] = bottom;
    this.vertices[vOffset++] = id;

    const idx = id * 4;
    let iOffset = id * 6;
    /* 0 1 ccw
     *   2
     */
    this.indices[iOffset++] = idx;
    this.indices[iOffset++] = idx + 2;
    this.indices[iOffset++] = idx + 1;
    /* 0
     * 3 2 ccw
     */
    this.indices[iOffset++] = idx;
    this.indices[iOffset++] = idx + 3;
    this.indices[iOffset++] = idx + 2;
  }

  defineAscii(code: number, def: string) {
    const lines = def.split('\n')
    const bits: number[] = [
      lines[1][1] ?? ' ',
      lines[3][1] ?? ' ',
      lines[5][1] ?? ' ',
      lines[2][0] ?? ' ',
      lines[2][2] ?? ' ',
      lines[4][0] ?? ' ',
      lines[4][2] ?? ' ',
    ].map(x => x == ' ' ? 0 : 1)
    const mask =
      (bits[0] << 0)
      | (bits[1] << 1)
      | (bits[2] << 2)
      | (bits[3] << 3)
      | (bits[4] << 4)
      | (bits[5] << 5)
      | (bits[6] << 6)
      ;
    // console.log(lines, bits);
    this.ascii[code] = mask;
  }

  updateStats(time: number, stats: Stats): boolean {
    if (time <= this._prevGraphUpdateTime + this._fpsStep) {
      return false;
    }

    let intervalTime = time - this._prevGraphUpdateTime;
    this._fpsAverage = Math.round(1000 / (intervalTime / stats.frames));

    // Draw both average and minimum FPS for this period
    // so that dropped frames are more clearly visible.
    // this._updateGraph(stats.fpsMin, this._fpsAverage);
    this.puts(0, 0.45, `${this._fpsAverage.toString().padEnd(3)}FP5`);

    if (this._performanceMonitoring) {
      console.log(`Average FPS: ${this._fpsAverage} Min FPS: ${stats.fpsMin}`);
    }

    this._prevGraphUpdateTime = time;
    return true;
  }

  puts(x: number, y: number, text: string) {
    this.instancing.instanceCount = 0
    let i = 0;
    let j = 0;
    for (const c of text) {
      this.cells[i] = x
      this.cells[i + 1] = y
      this.cells[i + 2] = this.cellWidth
      this.cells[i + 3] = this.cellHeight
      this.charColors[j] = c.codePointAt(0) ?? 0;
      this.charColors[j + 1] = 0xFFFF00FF
      x += this.cellWidth;
      i += 4;
      j += 2;
      ++this.instancing.instanceCount;
    }
    this.cellsBuffer.dirty = true;
    this.charColorsBuffer.dirty = true;
  }
}

export class SevenSegmentText {

  static async factory(world: World, matrix: mat4): Promise<void> {

    const segment = new SevenSegment();
    segment.puts(0, 0, '0123456789')

    world.create(matrix, segment.primitive, new Stats((time, stats) => {
      return segment.updateStats(time, stats);
    }));

    return Promise.resolve();
  }
}
