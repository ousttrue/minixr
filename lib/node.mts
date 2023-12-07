import { vec3, quat, mat4 } from './math/gl-matrix.mjs';
import type { Skin } from '../lib/buffer/mesh.mjs';
import type { Mesh } from '../lib/buffer/mesh.mjs';


export class TrsNode {
  // local transform
  t: vec3 = vec3.fromValues(0, 0, 0);
  r: quat = quat.fromValues(0, 0, 0, 1);
  s: vec3 = vec3.fromValues(1, 1, 1);

  children: TrsNode[] = []
  constructor(
    public readonly name: string,
    // world matrix
    public readonly matrix: mat4,
  ) { }

  toString(): string {
    return `[${this.name}]`;
  }

  updateRecursive(parent?: mat4) {
    mat4.fromTRS(this.t, this.r, this.s, { out: this.matrix })
    if (parent) {
      parent.mul(this.matrix, { out: this.matrix })
    }
    for (const child of this.children) {
      child.updateRecursive(this.matrix);
    }
  }
}
