import { Material } from './material.mjs';


export class ArOcclusionMaterial extends Material {
  constructor() {
    super();
  }

  get materialName() {
    return 'ArOcclusion';
  }

  get vertexSource() {
    return `
uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;
    in vec3 POSITION;

    void main() {
      gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * vec4(POSITION, 1.0);
    }`;
  }

  get fragmentSource() {
    return `
      precision mediump float;
      out vec4 _Color;

      void main() {
        _Color = vec4(0, 0, 0, 0);
      }`;
  }
}
