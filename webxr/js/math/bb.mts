import { vec3 } from './gl-matrix.mjs';

export class BoundingBox {
  constructor(
    public min = vec3.fromValues(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
    public max = vec3.fromValues(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)) {
  }

  toString(): string {
    return `[${this.min}, ${this.max}]`;
  }

  isFinite(): boolean {
    if (!isFinite(this.min.x)) return false;
    if (!isFinite(this.min.y)) return false;
    if (!isFinite(this.min.z)) return false;
    if (!isFinite(this.max.x)) return false;
    if (!isFinite(this.max.y)) return false;
    if (!isFinite(this.max.z)) return false;
    return true;
  }

  expand(p: vec3) {
    if (!isFinite(p.x)) {
      throw new Error("not isFinite !");
    }
    if (!isFinite(p.y)) {
      throw new Error("not isFinite !");
    }
    if (!isFinite(p.z)) {
      throw new Error("not isFinite !");
    }

    this.min.x = Math.min(this.min.x, p.x);
    this.min.y = Math.min(this.min.y, p.y);
    this.min.z = Math.min(this.min.z, p.z);
    this.max.x = Math.max(this.max.x, p.x);
    this.max.y = Math.max(this.max.y, p.y);
    this.max.z = Math.max(this.max.z, p.z);
  }

  copy(): BoundingBox {
    const bb = new BoundingBox();
    this.min.copy({ out: bb.min })
    this.max.copy({ out: bb.max })
    return bb;
  }

  contains(p: vec3): boolean {
    if (p.x < this.min.x) return false;
    if (p.y < this.min.y) return false;
    if (p.z < this.min.z) return false;
    if (p.x > this.max.x) return false;
    if (p.y > this.max.y) return false;
    if (p.z > this.max.z) return false;
    return true;
  }

  // setBounds(min: vec3, max: vec3) {
  //   min.copy({ out: this._min });
  //   max.copy({ out: this._max });
  // }
}

