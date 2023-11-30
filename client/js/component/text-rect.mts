import { Material } from '../materials/material.mjs';
import { Shader } from '../materials/shader.mjs';
import { Primitive, PrimitiveAttribute, BufferSource } from '../buffer/primitive.mjs';

const GL = WebGLRenderingContext; // For enums

export const CozetteShader: Shader = {
  name: "cozette",

  vertexSource: `
precision mediump float;
in vec2 a_Position;
in vec2 a_Uv;
// x, y, w, h
in vec4 i_Cell;
in vec4 i_Unicode_FgBg;
out vec2 f_Uv;
out vec4 f_Fg;
out vec4 f_Bg;

// cozette font. left, top, cell_width, cell_height
const vec2 ATLAS_LEFTTOP = vec2(95, 14);
const vec2 ATLAS_CELL_SIZE = vec2(14, 13);
const vec2 ATLAS_SIZE = vec2(364, 4864);
const vec2 ATLAS_OFFSET = vec2(0.5/364.0, 0.5/4864.0);

vec2 glyph(vec2 base, int unicode)
{
  float col = float(unicode % 16);
  float row = float(unicode / 16);
  return ATLAS_LEFTTOP
    + (vec2(col, row)+base) * ATLAS_CELL_SIZE
    ;
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
  vec2 pos = i_Cell.xy + i_Cell.zw * a_Position;
  gl_Position = ViewProjection() * MODEL_MATRIX * vec4(pos, 0, 1);
  f_Uv = ATLAS_OFFSET + glyph(a_Uv, int(i_Unicode_FgBg.x)) / ATLAS_SIZE;
  f_Fg = extractUint32(i_Unicode_FgBg.z);
  f_Bg = extractUint32(i_Unicode_FgBg.w);
}
`,

  fragmentSource: `
precision mediump float;
in vec2 f_Uv;
in vec4 f_Fg;
in vec4 f_Bg;
out vec4 o_FragColor;
uniform sampler2D color;
void main() {
  vec4 texcel= texture(color, f_Uv);
  
  // o_FragColor = texcel;
  o_FragColor = texcel.x<0.5 ? f_Fg : f_Bg;
}
`,
}

export class TextRect extends Node {
  positions: Float32Array;
  codepoints: Uint32Array;
  rows: number;
  cols: number;
  glyphWidth: number;
  glyphHeight: number;

  constructor(option: {
    cols: number,
    rows: number,
    glyphWidth: number,
    glyphHeight: number,
  }) {
    super('TextRect');
    this.cols = option.cols;
    this.rows = option.rows;
    this.glyphWidth = option.glyphWidth;
    this.glyphHeight = option.glyphHeight;

    // Build the spinning "hero" cubes
    const material = new Material("cozzete", CozetteShader);

    // x, y, u, v
    const vertices = new BufferSource(4, new Float32Array([
      0, 1, 0, 1,
      0, 0, 0, 0,
      1, 0, 1, 0,
      1, 1, 1, 1,
    ]));
    const attributes: PrimitiveAttribute[] = [
      new PrimitiveAttribute(
        'a_Position',
        vertices,
        2,
        GL.FLOAT,
        16,
        0)
      ,
      new PrimitiveAttribute(
        'a_Uv',
        vertices,
        2,
        GL.FLOAT,
        16, 8
      )]
    const indices = new Uint16Array([0, 1, 2, /**/ 2, 3, 0]);

    const cellCount = option.rows * option.cols;
    this.positions = new Float32Array(cellCount * 4);
    this.codepoints = new Uint32Array(cellCount * 4);
    const instanceAttributes = [
      new PrimitiveAttribute('i_Cell',
        new BufferSource(4, this.positions), 4, GL.FLOAT, 16, 0),
      new PrimitiveAttribute('i_Unicode_FgBg',
        new BufferSource(4, this.codepoints), 4, GL.FLOAT, 32, 0),
    ];

    const primitive = new Primitive(material, attributes, 4,
      new BufferSource(1, indices), {
      instanceAttributes,
    });

    // this.primitives.push(primitive);

    for (let y = 0; y < option.rows; ++y) {
      for (let x = 0; x < option.cols; ++x) {
        this.put({ row: y, col: x }, ' '.codePointAt(0)!);
      }
    }
  }

  put(pos: { row: number, col: number }, codepoint: number,
    fg: number = 0xFFFFFF, bg: number = 0x000000FF) {
    const index = (pos.row * this.cols + pos.col) * 4;
    this.codepoints[index] = codepoint;
    this.codepoints[index + 2] = fg;
    this.codepoints[index + 3] = bg;

    const x = pos.col + this.glyphWidth;
    const y = pos.row + this.glyphHeight;
    this.positions[index] = x;
    this.positions[index + 1] = y;
    this.positions[index + 2] = x + this.glyphWidth;
    this.positions[index + 3] = y + this.glyphHeight;
  }
}
