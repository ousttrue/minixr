import { vec3 } from './gl-matrix.mjs';

export class BoundingBox {
  constructor(
    public min = vec3.fromValues(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
    public max = vec3.fromValues(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)) {
  }

  expand(x: number, y: number, z: number) {
    this.min.x = Math.min(this.min.x, x);
    this.min.y = Math.min(this.min.y, y);
    this.min.z = Math.min(this.min.z, z);
    this.max.x = Math.max(this.max.x, x);
    this.max.y = Math.max(this.max.y, y);
    this.max.z = Math.max(this.max.z, z);
  }

  copy(): BoundingBox {
    const bb = new BoundingBox();
    this.min.copy({ out: bb.min })
    this.max.copy({ out: bb.max })
    return bb;
  }

  // setBounds(min: vec3, max: vec3) {
  //   min.copy({ out: this._min });
  //   max.copy({ out: this._max });
  // }
}

