import { Material, MaterialSampler } from './material.mjs';

class CubeSeaMaterial extends Material {
  baseColor: MaterialSampler;
  constructor(public heavy = false) {
    super();
    this.baseColor = this.defineSampler('baseColor');
  }

  get materialName() {
    return 'CUBE_SEA';
  }

  get vertexSource() {
    return `
precision mediump float;
uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;

    in vec3 POSITION;
    in vec2 TEXCOORD_0;
    in vec3 NORMAL;

    out vec2 vTexCoord;
    out vec3 vLight;

    const vec3 lightDir = vec3(0.75, 0.5, 1.0);
    const vec3 ambientColor = vec3(0.5, 0.5, 0.5);
    const vec3 lightColor = vec3(0.75, 0.75, 0.75);

    void main() {
      vec3 normalRotated = vec3(MODEL_MATRIX * vec4(NORMAL, 0.0));
      float lightFactor = max(dot(normalize(lightDir), normalRotated), 0.0);
      vLight = ambientColor + (lightColor * lightFactor);
      vTexCoord = TEXCOORD_0;
      gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * vec4(POSITION, 1.0);
    }`;
  }

  get fragmentSource() {
    return `
      precision mediump float;
      uniform sampler2D baseColor;
      in vec2 vTexCoord;
      in vec3 vLight;
      out vec4 _Color;

      void main() {
        _Color = vec4(vLight, 1.0) * texture(baseColor, vTexCoord);
      }`;
  }
}
