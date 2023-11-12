import { Material, MaterialSampler } from './material.mjs';

export class SimpleMaterial extends Material {
  baseColor: MaterialSampler;
  constructor() {
    super();
    this.baseColor = this.defineSampler('baseColor');
  }

  get materialName() {
    return 'simple';
  }

  get vertexSource() {
    return `
    attribute vec3 POSITION;
    attribute vec3 NORMAL;

    varying vec3 vLight;

    const vec3 lightDir = vec3(0.75, 0.5, 1.0);
    const vec3 ambientColor = vec3(0.5, 0.5, 0.5);
    const vec3 lightColor = vec3(0.75, 0.75, 0.75);

    vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
      vec3 normalRotated = vec3(model * vec4(NORMAL, 0.0));
      float lightFactor = max(dot(normalize(lightDir), normalRotated), 0.0);
      vLight = ambientColor + (lightColor * lightFactor);
      return proj * view * model * vec4(POSITION, 1.0);
    }`;
  }

  get fragmentSource() {
    return `
      precision mediump float;
      varying vec3 vLight;

      vec4 fragment_main() {
        return vec4(vLight, 1.0);
      }`;
  }
}
