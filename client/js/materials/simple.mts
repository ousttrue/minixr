import { Shader } from './shader.mjs';

export const SimpleShader: Shader = {
  name: 'simple',

  vertexSource: `
in vec3 POSITION;
in vec3 NORMAL;

out vec3 vLight;

const vec3 lightDir = vec3(0.75, 0.5, 1.0);
const vec3 ambientColor = vec3(0.5, 0.5, 0.5);
const vec3 lightColor = vec3(0.75, 0.75, 0.75);

void main() {
  vec3 normalRotated = vec3(MODEL_MATRIX * vec4(NORMAL, 0.0));
  float lightFactor = max(dot(normalize(lightDir), normalRotated), 0.0);
  vLight = ambientColor + (lightColor * lightFactor);
  gl_Position = ViewProjection() * MODEL_MATRIX * vec4(POSITION, 1.0);
}
`,

  fragmentSource: `
precision mediump float;
in vec3 vLight;
out vec4 _Color;

void main() {
  _Color = vec4(vLight, 1.0);
}`,
}
