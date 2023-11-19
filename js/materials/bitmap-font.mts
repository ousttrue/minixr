import { Material } from './material.mjs';
import { BlobTexture } from './texture.mjs';

export class BitmapFontMaterial extends Material {

  get materialName() {
    return 'BitmapFont';
  }

  get vertexSource() {
    return `
precision mediump float;

uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;

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
  gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * vec4(pos, 0, 1);
  f_Uv = ATLAS_OFFSET + glyph(a_Uv, int(i_Unicode_FgBg.x)) / ATLAS_SIZE;
  f_Fg = extractUint32(i_Unicode_FgBg.z);
  f_Bg = extractUint32(i_Unicode_FgBg.w);
}
`;
  }

  get fragmentSource() {
    return `
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
`;
  }

  async loadTextureAsync() {
    const response = await fetch('../../../assets/cozette_charmap.png');
    const imageBlob = await response.blob();
    // this.imageBitmap = await createImageBitmap(imageBlob);
    // console.log(this.imageBitmap);

    const sampler = this.defineSampler('color')
    sampler.texture = new BlobTexture(imageBlob);

    await sampler.texture._promise;
  }
}
