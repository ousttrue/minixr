import { Node } from './node.mjs';
import { Material } from '../materials/material.mjs';
import { BoxBuilder } from '../geometry/box-builder.mjs';
import { vec3, vec4 } from '../../math/gl-matrix.mjs';

class MaterialUniformFloat4 {
  constructor(
    public readonly name: string,
    public readonly value: vec4) { }
}

class HoverMaterial extends Material {
  color = new MaterialUniformFloat4('uColor', vec4.fromValues(1, 1, 1, 1));
  constructor() {
    super();
  }

  get materialName() {
    return 'Hover';
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
      uniform vec4 uColor;

      vec4 fragment_main() {
        return vec4(vLight, 1.0) * uColor;
      }`;
  }

  bind(gl: WebGL2RenderingContext,
    uniformMap: { [key: string]: WebGLUniformLocation }) {
    gl.uniform4fv(uniformMap.uColor, this.color.value.array);
  }
}


export class Interaction extends Node {

  material = new HoverMaterial();

  constructor() {
    super("Interaction");

    this.action = 'passive';

    let builder = new BoxBuilder();
    builder.pushCube([0, 0, 0], 1);
    let primitive = builder.finishPrimitive(this.material);

    this.primitives.push(primitive);
    this.local.translation = vec3.fromValues(0, 0, -0.65);
    this.local.scale = vec3.fromValues(0.25, 0.25, 0.25);
  }

  protected _onUpdate(_time: number, delta: number) {
    this.local.matrix.rotateX(delta / 1000);
    this.local.matrix.rotateY(delta / 1500);
    this.local.invalidate();
  }

  onHoverStart(action: Node) {
    console.log('onHoverStart', action);
    this.material.color.value.set(1, 0, 0, 1);
  }

  onHoverEnd(action: Node) {
    console.log('onHoverEnd', action);
    this.material.color.value.set(1, 1, 1, 1);
  }
}
