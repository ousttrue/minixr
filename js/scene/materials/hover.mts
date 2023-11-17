import { Material } from './material.mjs';
import { vec4 } from '../../math/gl-matrix.mjs';


class MaterialUniformFloat4 {
  constructor(
    public readonly name: string,
    public readonly value: vec4) { }
}

export class HoverMaterial extends Material {
  color = new MaterialUniformFloat4('uColor', vec4.fromValues(1, 1, 1, 1));
  constructor() {
    super();
  }

  get materialName() {
    return 'Hover';
  }

  get vertexSource() {
    return `
uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;
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
      gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * vec4(POSITION, 1.0);
    }`;
  }

  get fragmentSource() {
    return `
      precision mediump float;
      in vec3 vLight;
      out vec4 _Color;
      uniform vec4 uColor;

      void main() {
        _Color = vec4(vLight, 1.0) * uColor;
      }`;
  }

  bind(gl: WebGL2RenderingContext,
    uniformMap: { [key: string]: WebGLUniformLocation }) {
    gl.uniform4fv(uniformMap.uColor, this.color.value.array);
  }
}
