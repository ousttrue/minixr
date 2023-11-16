import { Material, RENDER_ORDER } from './material.mjs';

const BOUNDS_HEIGHT = 0.5; // Meters

const GL = WebGLRenderingContext; // For enums

class BoundsMaterial extends Material {
  constructor() {
    super();

    this.renderOrder = RENDER_ORDER.ADDITIVE;
    this.state.blend = true;
    this.state.blendFuncSrc = GL.SRC_ALPHA;
    this.state.blendFuncDst = GL.ONE;
    this.state.depthTest = false;
    this.state.cullFace = false;
  }

  get materialName() {
    return 'BOUNDS_RENDERER';
  }

  get vertexSource() {
    return `
    attribute vec3 POSITION;
    varying vec3 v_pos;
    vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
      v_pos = POSITION;
      return proj * view * model * vec4(POSITION, 1.0);
    }`;
  }

  get fragmentSource() {
    return `
    precision mediump float;
    varying vec3 v_pos;
    vec4 fragment_main() {
      return vec4(0.25, 1.0, 0.5, (${BOUNDS_HEIGHT} - v_pos.y) / ${BOUNDS_HEIGHT});
    }`;
  }
}
