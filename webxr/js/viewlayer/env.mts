import {
  vec3, vec4, mat4, OrbitView, PerspectiveProjection
} from '../math/gl-matrix.mjs';


export class Env {
  buffer: Float32Array = new Float32Array(16 * 4 + 4 + 4);
  view: OrbitView;
  projection: PerspectiveProjection;
  lightPosDir: vec4;
  lightColor: vec4;

  constructor() {
    this.view = new OrbitView(
      new mat4(this.buffer.subarray(0, 16)),
      vec3.fromValues(0, 0, 5));

    this.projection = new PerspectiveProjection(
      new mat4(this.buffer.subarray(32, 48)));

    this.lightPosDir = new vec4(this.buffer.subarray(64, 68));
    this.lightPosDir.set(1, 1, 1, 0);
    this.lightColor = new vec4(this.buffer.subarray(68, 72));
  }
}
