import { Vao, Vbo, Ibo, Program, Texture } from './font_classes.mjs';
import { mat4 } from './js/math/gl-matrix.mjs';

const VS = `#version 300 es
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

uniform mat4 projection;


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
  gl_Position = projection * vec4(pos, 0, 1);
  f_Uv = ATLAS_OFFSET + glyph(a_Uv, int(i_Unicode_FgBg.x)) / ATLAS_SIZE;
  f_Fg = extractUint32(i_Unicode_FgBg.z);
  f_Bg = extractUint32(i_Unicode_FgBg.w);
}
`;

const FS = `#version 300 es
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
`;

class Rect {
  vao: Vao;
  indices: Uint16Array;
  instances: Float32Array;
  instanceVbo: Vbo;
  constructor(gl: WebGL2RenderingContext) {
    // counter clock wise
    const vertices = new Float32Array([
      0, 1, 0, 1,
      0, 0, 0, 0,
      1, 0, 1, 0,
      1, 1, 1, 1,
    ]);
    const vbo = new Vbo(gl, vertices, 16);
    const attributes = [{
      location: 0,
      vbo,
      offset: 0,
      size: 2,
      type: gl.FLOAT,
    }, {
      location: 1,
      vbo,
      offset: 8,
      size: 2,
      type: gl.FLOAT,
    }]

    this.instances = new Float32Array(65535);
    this.instanceVbo = new Vbo(gl, this.instances, 32);
    const instanceAttributes = [{
      location: 2,
      vbo: this.instanceVbo,
      offset: 0,
      size: 4,
      type: gl.FLOAT,
    },
    {
      location: 3,
      vbo: this.instanceVbo,
      offset: 16,
      size: 4,
      type: gl.FLOAT,
    }
    ];

    this.indices = new Uint16Array([0, 1, 2, /**/ 2, 3, 0]);
    const ibo = new Ibo(gl, this.indices);
    this.vao = new Vao(gl, attributes, ibo, instanceAttributes);
  }

  draw(gl: WebGL2RenderingContext, count: number) {
    this.vao.draw(gl, count);
  }
}

class TextGrid {
  length = 0;
  fg = 0xFF0000FF;
  bg = 0xFFFF00FF;
  uintView: Uint32Array;

  constructor(private array: Float32Array,
    public cell_width: number = 24,
    public cell_height: number = 32) {
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
  }
}

async function main(url: string) {

  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;
  console.log(canvas.width, canvas.height);
  const gl = canvas.getContext('webgl2')!;

  const imageTexture = new Texture(gl);
  await imageTexture.loadAsync(gl, url);

  const projection = mat4.ortho(
    0, canvas.width,
    canvas.height, 0,
    -1, 1);

  const rect = new Rect(gl);
  const program = new Program(gl, VS, FS);
  const uniforms = program.uniformMap as {
    projection: WebGLUniformLocation;
  };

  // text
  const grid = new TextGrid(rect.instances);
  grid.puts(100, 100, '0123456789');
  grid.puts(100, 200, '~!@#$%^&*()_+=-:;{][]\'"?/<>,.');
  grid.puts(100, 300, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  grid.puts(100, 400, 'abcdefghijklmnopqrstuvwxyz');
  gl.bindBuffer(gl.ARRAY_BUFFER, rect.instanceVbo.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, rect.instances, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // clear
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  // font texture
  program.use(gl);
  console.log(uniforms.projection, projection.array);
  gl.uniformMatrix4fv(uniforms.projection, false, projection.array);
  gl.bindTexture(gl.TEXTURE_2D, imageTexture.texture);

  // draw instancing rects
  rect.draw(gl, grid.length);
}


document.addEventListener("DOMContentLoaded", (event) => {
  main('./assets/cozette_charmap.png');
});

