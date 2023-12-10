import { vec3, quat, mat4, Transform } from './math/gl-matrix.mjs';


export class TrsNode {
  // local transform
  transform: Transform = new Transform();

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
    this.transform.matrix.copy({ out: this.matrix })
    if (parent) {
      parent.mul(this.matrix, { out: this.matrix })
    }
    for (const child of this.children) {
      child.updateRecursive(this.matrix);
    }
  }
}
