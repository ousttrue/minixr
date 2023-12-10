// Copyright 2018 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { mat3, vec3, mat4 } from './gl-matrix.mjs';

let normalMat = mat3.create();

const RAY_INTERSECTION_OFFSET = 0.02;

export class Ray {
  origin = new vec3();
  private = vec3.fromValues(0, 0, -1);
  inv_dir = new vec3();
  _dir = new vec3();
  sign: number[] = [];

  constructor(matrix: mat4 | null = null) {
    if (matrix) {
      this.origin.transformMat4(matrix);
      normalMat.fromMat4(matrix);
      this._dir.transformMat3(normalMat);
    }

    // To force the inverse and sign calculations.
    this.direction = this._dir;
  }

  get direction() {
    return this._dir;
  }

  set direction(value: vec3) {
    value.normalize({ out: this._dir });

    this.inv_dir.set(
      1.0 / this._dir.x,
      1.0 / this._dir.y,
      1.0 / this._dir.z);

    this.sign = [
      (this.inv_dir.x < 0) ? 1 : 0,
      (this.inv_dir.y < 0) ? 1 : 0,
      (this.inv_dir.z < 0) ? 1 : 0,
    ];
  }

  advance(distance: number): vec3 {
    return this.origin.muladd(this.direction, distance);
  }

  // Borrowed from:
  // eslint-disable-next-line max-len
  // https://www.scratchapixel.com/lessons/3d-basic-rendering/minimal-ray-tracer-rendering-simple-shapes/ray-box-intersection
  intersectsAABB(min: vec3, max: vec3): vec3 | null {
    let r = this;

    let bounds = [min, max];

    let tmin = (bounds[r.sign[0]][0] - r.origin[0]) * r.inv_dir[0];
    let tmax = (bounds[1 - r.sign[0]][0] - r.origin[0]) * r.inv_dir[0];
    let tymin = (bounds[r.sign[1]][1] - r.origin[1]) * r.inv_dir[1];
    let tymax = (bounds[1 - r.sign[1]][1] - r.origin[1]) * r.inv_dir[1];

    if ((tmin > tymax) || (tymin > tmax)) {
      return null;
    }
    if (tymin > tmin) {
      tmin = tymin;
    }
    if (tymax < tmax) {
      tmax = tymax;
    }

    let tzmin = (bounds[r.sign[2]][2] - r.origin[2]) * r.inv_dir[2];
    let tzmax = (bounds[1 - r.sign[2]][2] - r.origin[2]) * r.inv_dir[2];

    if ((tmin > tzmax) || (tzmin > tmax)) {
      return null;
    }
    if (tzmin > tmin) {
      tmin = tzmin;
    }
    if (tzmax < tmax) {
      tmax = tzmax;
    }

    let t = -1;
    if (tmin > 0 && tmax > 0) {
      t = Math.min(tmin, tmax);
    } else if (tmin > 0) {
      t = tmin;
    } else if (tmax > 0) {
      t = tmax;
    } else {
      // Intersection is behind the ray origin.
      return null;
    }

    // Push ray intersection point back along the ray a bit so that cursors
    // don't accidentally intersect with the hit surface.
    t -= RAY_INTERSECTION_OFFSET;

    // Return the point where the ray first intersected with the AABB.
    const intersectionPoint = this._dir.clone();
    intersectionPoint.scale(t);
    intersectionPoint.add(this.origin);
    return intersectionPoint;
  }
}
