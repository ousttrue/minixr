import { Mesh, SubMesh, MeshVertexAttribute, Instancing } from '../../../lib/buffer/primitive.mjs';
import { BufferSource } from '../../../lib/buffer/buffersource.mjs';
import { vec3, mat4 } from '../../../lib/math/gl-matrix.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { Shader, RENDER_ORDER } from '../../../lib/materials/shader.mjs';
import { Material } from '../../../lib/materials/material.mjs';
import { BlobTexture, ImageTexture } from '../../../lib/materials/texture.mjs';


const GL = WebGLRenderingContext; // For enums


export const BitmapFontShader: Shader = {
  name: 'BitmapFont',
  vertexSource: `
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
  // o_FragColor = vec4(1,0,0,1);
}
`,
}


export async function loadTextureAsync(): Promise<BlobTexture> {
  const img = document.getElementById("cozette") as HTMLImageElement;
  // const imageBlob = await response.blob();
  return new ImageTexture(img);
}


export class TextGrid {
  length = 0;
  fg = 0xFF0000FF;
  bg = 0xFFFF00FF;
  uintView: Uint32Array;

  constructor(private array: Float32Array,
    private readonly callback: (n: number) => void,
    public cell_width: number = 0.024,
    public cell_height: number = 0.032) {
    this.uintView = new Uint32Array(array.buffer,
      array.byteOffset, array.byteLength / 4);
  }

  puts(x: number, y: number, line: string, option?: { fg: number, bg: number }) {
    let offset = this.length * 8;
    for (const c of line) {
      this.array.set([
        x, y, this.cell_width, this.cell_height,
        c.codePointAt(0)!, 0,
      ], offset);
      this.uintView.set([
        this.fg, this.bg,
      ], offset + 6);

      offset += 8;
      x += this.cell_width;
      this.length += 1;
    }

    this.callback(this.length);
  }
}


export async function bitmapFontFactory(world: World, pos: vec3): Promise<TextGrid> {
  const material = new Material('BitmapFontMaterial', BitmapFontShader)
  material.setTexture('color', await loadTextureAsync());

  // counter clock wise
  const vertices = new BufferSource(4, new Float32Array([
    0, 1, 0, 0,
    0, 0, 0, 1,
    1, 0, 1, 1,
    1, 1, 1, 0,
  ]));
  const attributes = [
    new MeshVertexAttribute(
      'a_Position', vertices, 2, GL.FLOAT,
      16, 0
    ),
    new MeshVertexAttribute(
      'a_Uv', vertices, 2, GL.FLOAT,
      16, 8
    )]

  const ibo = new Uint16Array([0, 1, 2, /**/ 2, 3, 0]);

  const instances = new Float32Array(65535);
  const instancesView = new BufferSource(1, instances);
  const instanceAttributes = [
    new MeshVertexAttribute(
      'i_Cell', instancesView, 4, GL.FLOAT,
      32, 0,
    ),
    new MeshVertexAttribute(
      'i_Unicode_FgBg', instancesView, 4, GL.FLOAT,
      32, 16)
  ];

  const instancing = new Instancing(instanceAttributes);
  const primitive = new Mesh(
    attributes, 4,
    [new SubMesh(material, ibo.length)],
    new BufferSource(1, ibo),
    {},
    instancing
  );

  const grid = new TextGrid(instances, (count) => instancing.instanceCount = count);

  const matrix = mat4.fromTranslation(pos.x, pos.y, pos.z);
  world.create(matrix, primitive);

  return Promise.resolve(grid)
}
