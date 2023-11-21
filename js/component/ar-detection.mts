import { Shader } from '../materials/shader.mjs';
import { Entity } from '../third-party/uecs-0.4.2/index.mjs';


export const ArOcclusionShader: Shader = {

  name: 'ArOcclusion',

  vertexSource: `
uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;
in vec3 POSITION;

void main() {
  gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * vec4(POSITION, 1.0);
}`,

  fragmentSource: `
precision mediump float;
out vec4 _Color;

void main() {
  _Color = vec4(0, 0, 0, 0);
}`,
}


export const ArOcclusionShaderDebug: Shader = {
  name: 'ArOcclusionDebug',

  vertexSource: `
uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;
in vec3 POSITION;
out vec2 f_XZ;

void main() {
  f_XZ = POSITION.xz;
  gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * vec4(POSITION, 1.0);
}`,

  fragmentSource: `
precision mediump float;
in vec2 f_XZ;
out vec4 _Color;

// float mod(float x, float y)
// {
//   return x - y * floor(x/y);
// }

void main() {
  _Color = vec4(mod(f_XZ.x, 1.0), mod(f_XZ.y, 1.0), 0, 1);
}`,
}

export type DetectedItem = {
  entity: Entity,
  time: number,
  counter: number,
}
