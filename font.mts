import { Vao, Vbo, Ibo, Program, Texture } from './font_classes.mjs';
import { mat4 } from './js/math/gl-matrix.mjs';

const VS = `#version 300 es
precision mediump float;
in vec2 a_Position;
in vec2 a_Uv;
// x, y, unicode copdepoint
in vec4 a_Instance;
out vec2 f_Uv;

// cozette font. left, top, cell_width, cell_height
const vec2 ATLAS_LEFTTOP = vec2(94, 13);
const vec2 ATLAS_CELL_SIZE = vec2(14, 13);
const vec2 ATLAS_SIZE = vec2(364, 4864);
const vec2 ATLAS_OFFSET = vec2(0.5/364.0, 0.5/4864.0);

const vec2 RENDER_SIZE = vec2(24, 52);

uniform mat4 projection;


vec2 glyph(vec2 base, int unicode)
{
  float col = float(unicode % 16);
  float row = float(unicode / 16);
  return ATLAS_LEFTTOP
    + vec2(col, row) * ATLAS_CELL_SIZE
    + base * ATLAS_CELL_SIZE;
}

void main() {
  vec2 pos = a_Instance.xy + a_Position * RENDER_SIZE;
  gl_Position = projection * vec4(pos, 0, 1);
  f_Uv = ATLAS_OFFSET + glyph(a_Uv, int(a_Instance.z)) / ATLAS_SIZE;
}
`;

const FS = `#version 300 es
precision mediump float;
in vec2 f_Uv;
out vec4 o_FragColor;
uniform sampler2D color;
void main() {
  vec4 texcel= texture(color, f_Uv);
  o_FragColor = texcel;
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
    this.instanceVbo = new Vbo(gl, this.instances, 16);
    const instance = {
      location: 2,
      vbo: this.instanceVbo,
      offset: 0,
      size: 3,
      type: gl.FLOAT,
    };
    this.indices = new Uint16Array([0, 1, 2, /**/ 2, 3, 0]);
    const ibo = new Ibo(gl, this.indices);
    this.vao = new Vao(gl, attributes, ibo, instance);
  }

  draw(gl: WebGL2RenderingContext, count: number) {
    this.vao.draw(gl, count);
  }
}

class TextGrid {
  length = 0;
  constructor(private array: Float32Array) { }

  puts(x: number, y: number, line: string) {
    let offset = 0;
    for (const c of line) {
      this.array.set([x, y, c.codePointAt(0)!], offset);
      offset += 4;
      x += 50;
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
  grid.puts(100, 100, '012ABCabc');
  // rect.vao.updateInstance(grid.array);
  gl.bindBuffer(gl.ARRAY_BUFFER, rect.instanceVbo.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, rect.instances, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  program.use(gl);
  console.log(uniforms.projection, projection.array);
  gl.uniformMatrix4fv(uniforms.projection, false, projection.array);
  gl.bindTexture(gl.TEXTURE_2D, imageTexture.texture);
  // TODO: Texture
  rect.draw(gl, grid.length);
}


document.addEventListener("DOMContentLoaded", (event) => {
  main('./assets/cozette_charmap.png');
});

