import { mat3 } from './mat3.mjs';
import { mat4 } from './mat4.mjs';

/**
 * 3 Dimensional Vector
 */
export class vec3 {
  constructor(public array = new Float32Array(3)) { }
  get x() { return this.array[0]; }
  get y() { return this.array[1]; }
  get z() { return this.array[2]; }
  set x(n: number) { this.array[0] = n; }
  set y(n: number) { this.array[1] = n; }
  set z(n: number) { this.array[2] = n; }
  equal(rhs: vec3): boolean {
    return this.x == rhs.x && this.y == rhs.y && this.z == rhs.z;
  }

  toString(): string {
    return `[${this.x}, ${this.y}, ${this.y}]`;
  }

  /**
   * Creates a new vec3 initialized with values from an existing vector
   */
  copy(option?: { out: vec3 }): vec3 {
    const dst = option?.out ?? new vec3();
    dst.array.set(this.array);
    return dst;
  }

  /**
   * Set the components of a vec3 to the given values
   */
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Creates a vec3
   */
  static fromValues(x: number, y: number, z: number, option?: { out: vec3 }): vec3 {
    const dst = option?.out ?? new vec3();
    dst.set(x, y, z)
    return dst
  }

  /**
   * Adds two vec3's
   */
  add(b: vec3, option?: { out: vec3 }): vec3 {
    const dst = option?.out ?? new vec3();
    dst.x = this.x + b.x;
    dst.y = this.y + b.y;
    dst.z = this.z + b.z;
    return dst;
  }

  /**
   * Subtracts vector b from vector a
   */
  subtract(b: vec3, option?: { out: vec3 }): vec3 {
    const dst = option?.out ?? new vec3();
    dst.x = this.x - b.x;
    dst.y = this.y - b.y;
    dst.z = this.z - b.z;
    return dst;
  }

  // /**
  //  * Multiplies two vec3's
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a the first operand
  //  * @param {vec3} b the second operand
  //  * @returns {vec3} out
  //  */
  // export function multiply(out: vec3, a: vec3, b: vec3): vec3 {
  //   out[0] = a[0] * b[0];
  //   out[1] = a[1] * b[1];
  //   out[2] = a[2] * b[2];
  //   return out;
  // }

  // /**
  //  * Divides two vec3's
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a the first operand
  //  * @param {vec3} b the second operand
  //  * @returns {vec3} out
  //  */
  // export function divide(out: vec3, a: vec3, b: vec3): vec3 {
  //   out[0] = a[0] / b[0];
  //   out[1] = a[1] / b[1];
  //   out[2] = a[2] / b[2];
  //   return out;
  // }

  // /**
  //  * Math.ceil the components of a vec3
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a vector to ceil
  //  * @returns {vec3} out
  //  */
  // export function ceil(out: vec3, a: vec3): vec3 {
  //   out[0] = Math.ceil(a[0]);
  //   out[1] = Math.ceil(a[1]);
  //   out[2] = Math.ceil(a[2]);
  //   return out;
  // }

  // /**
  //  * Math.floor the components of a vec3
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a vector to floor
  //  * @returns {vec3} out
  //  */
  // export function floor(out: vec3, a: vec3): vec3 {
  //   out[0] = Math.floor(a[0]);
  //   out[1] = Math.floor(a[1]);
  //   out[2] = Math.floor(a[2]);
  //   return out;
  // }

  // /**
  //  * Returns the minimum of two vec3's
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a the first operand
  //  * @param {vec3} b the second operand
  //  * @returns {vec3} out
  //  */
  // export function min(out: vec3, a: vec3, b: vec3): vec3 {
  //   out[0] = Math.min(a[0], b[0]);
  //   out[1] = Math.min(a[1], b[1]);
  //   out[2] = Math.min(a[2], b[2]);
  //   return out;
  // }

  // /**
  //  * Returns the maximum of two vec3's
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a the first operand
  //  * @param {vec3} b the second operand
  //  * @returns {vec3} out
  //  */
  // export function max(out: vec3, a: vec3, b: vec3): vec3 {
  //   out[0] = Math.max(a[0], b[0]);
  //   out[1] = Math.max(a[1], b[1]);
  //   out[2] = Math.max(a[2], b[2]);
  //   return out;
  // }

  // /**
  //  * Math.round the components of a vec3
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a vector to round
  //  * @returns {vec3} out
  //  */
  // export function round(out: vec3, a: vec3): vec3 {
  //   out[0] = Math.round(a[0]);
  //   out[1] = Math.round(a[1]);
  //   out[2] = Math.round(a[2]);
  //   return out;
  // }

  /**
   * Scales a vec3 by a scalar number
   */
  scale(b: number, option?: { out: vec3 }): vec3 {
    const dst = option?.out ?? new vec3();
    dst.x = this.x * b;
    dst.y = this.y * b;
    dst.z = this.z * b;
    return dst
  }

  /**
   * Adds two vec3's after scaling the second operand by a scalar value
   */
  muladd(b: vec3, scale: number, option?: { out: vec3 }): vec3 {
    const dst = option?.out ?? new vec3();
    dst.x = this.x + (b.x * scale);
    dst.y = this.y + (b.y * scale);
    dst.z = this.z + (b.z * scale);
    return dst;
  }

  // /**
  //  * Calculates the euclidian distance between two vec3's
  //  *
  //  * @param {vec3} a the first operand
  //  * @param {vec3} b the second operand
  //  * @returns {Number} distance between a and b
  //  */
  // export function distance(a: vec3, b: vec3): number {
  //   let x = b[0] - a[0];
  //   let y = b[1] - a[1];
  //   let z = b[2] - a[2];
  //   return Math.sqrt(x * x + y * y + z * z);
  // }

  // /**
  //  * Calculates the squared euclidian distance between two vec3's
  //  *
  //  * @param {vec3} a the first operand
  //  * @param {vec3} b the second operand
  //  * @returns {Number} squared distance between a and b
  //  */
  // export function squaredDistance(a: vec3, b: vec3): number {
  //   let x = b[0] - a[0];
  //   let y = b[1] - a[1];
  //   let z = b[2] - a[2];
  //   return x * x + y * y + z * z;
  // }

  // /**
  //  * Negates the components of a vec3
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a vector to negate
  //  * @returns {vec3} out
  //  */
  // export function negate(out: vec3, a: vec3): vec3 {
  //   out[0] = -a[0];
  //   out[1] = -a[1];
  //   out[2] = -a[2];
  //   return out;
  // }

  // /**
  //  * Returns the inverse of the components of a vec3
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a vector to invert
  //  * @returns {vec3} out
  //  */
  // export function inverse(out: vec3, a: vec3): vec3 {
  //   out[0] = 1.0 / a[0];
  //   out[1] = 1.0 / a[1];
  //   out[2] = 1.0 / a[2];
  //   return out;
  // }

  /**
   * Calculates the dot product of two vec3's
   */
  dot(b: vec3): number {
    return this.x * b.x + this.y * b.y + this.z * b.z;
  }

  /**
   * Calculates the length of a vec3
   */
  length(): number {
    return Math.sqrt(this.dot(this));
  }

  /**
   * Normalize a vec3
   */
  normalize(option?: { out: vec3 }): vec3 | undefined {
    const len = this.length();
    if (len > 0) {
      const dst = option?.out ?? new vec3();
      //TODO: evaluate use of glm_invsqrt here?
      const f = 1 / len;
      dst.x = this.x * f;
      dst.y = this.y * f;
      dst.z = this.z * f;
      return dst;
    }
  }

  // /**
  //  * Computes the cross product of two vec3's
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a the first operand
  //  * @param {vec3} b the second operand
  //  * @returns {vec3} out
  //  */
  // export function cross(out: vec3, a: vec3, b: vec3): vec3 {
  //   let ax = a[0], ay = a[1], az = a[2];
  //   let bx = b[0], by = b[1], bz = b[2];
  //
  //   out[0] = ay * bz - az * by;
  //   out[1] = az * bx - ax * bz;
  //   out[2] = ax * by - ay * bx;
  //   return out;
  // }

  // /**
  //  * Performs a linear interpolation between two vec3's
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a the first operand
  //  * @param {vec3} b the second operand
  //  * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
  //  * @returns {vec3} out
  //  */
  // export function lerp(out: vec3, a: vec3, b: vec3, t: number): vec3 {
  //   let ax = a[0];
  //   let ay = a[1];
  //   let az = a[2];
  //   out[0] = ax + t * (b[0] - ax);
  //   out[1] = ay + t * (b[1] - ay);
  //   out[2] = az + t * (b[2] - az);
  //   return out;
  // }
  //
  // /**
  //  * Performs a hermite interpolation with two control points
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a the first operand
  //  * @param {vec3} b the second operand
  //  * @param {vec3} c the third operand
  //  * @param {vec3} d the fourth operand
  //  * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
  //  * @returns {vec3} out
  //  */
  // export function hermite(out: vec3, a: vec3, b: vec3, c: vec3, d: vec3, t: number): vec3 {
  //   let factorTimes2 = t * t;
  //   let factor1 = factorTimes2 * (2 * t - 3) + 1;
  //   let factor2 = factorTimes2 * (t - 2) + t;
  //   let factor3 = factorTimes2 * (t - 1);
  //   let factor4 = factorTimes2 * (3 - 2 * t);
  //
  //   out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  //   out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  //   out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  //
  //   return out;
  // }
  //
  // /**
  //  * Performs a bezier interpolation with two control points
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a the first operand
  //  * @param {vec3} b the second operand
  //  * @param {vec3} c the third operand
  //  * @param {vec3} d the fourth operand
  //  * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
  //  * @returns {vec3} out
  //  */
  // export function bezier(out: vec3, a: vec3, b: vec3, c: vec3, d: vec3, t: number): vec3 {
  //   let inverseFactor = 1 - t;
  //   let inverseFactorTimesTwo = inverseFactor * inverseFactor;
  //   let factorTimes2 = t * t;
  //   let factor1 = inverseFactorTimesTwo * inverseFactor;
  //   let factor2 = 3 * t * inverseFactorTimesTwo;
  //   let factor3 = 3 * factorTimes2 * inverseFactor;
  //   let factor4 = factorTimes2 * t;
  //
  //   out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
  //   out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
  //   out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
  //
  //   return out;
  // }
  //
  // /**
  //  * Generates a random vector with the given scale
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
  //  * @returns {vec3} out
  //  */
  // export function random(out: vec3, scale: number): vec3 {
  //   scale = scale || 1.0;
  //
  //   let r = glMatrix.RANDOM() * 2.0 * Math.PI;
  //   let z = (glMatrix.RANDOM() * 2.0) - 1.0;
  //   let zScale = Math.sqrt(1.0 - z * z) * scale;
  //
  //   out[0] = Math.cos(r) * zScale;
  //   out[1] = Math.sin(r) * zScale;
  //   out[2] = z * scale;
  //   return out;
  // }

  /**
   * Transforms the vec3 with a mat4.
   * 4th vector component is implicitly '1'
   */
  transformMat4(_m: mat4, option?: { out: vec3 }): vec3 {
    const dst = option?.out ?? new vec3();
    const m = _m.array;
    const x = this.array[0];
    const y = this.array[1];
    const z = this.array[2];
    let w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1.0;
    dst.array[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    dst.array[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    dst.array[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return dst;
  }

  /**
   * Transforms the vec3 with a mat3.
   */
  transformMat3(_m: mat3) {
    const m = _m.array;
    const x = this.array[0];
    const y = this.array[1];
    const z = this.array[2];
    this.array[0] = x * m[0] + y * m[3] + z * m[6];
    this.array[1] = x * m[1] + y * m[4] + z * m[7];
    this.array[2] = x * m[2] + y * m[5] + z * m[8];
  }

  // /**
  //  * Transforms the vec3 with a quat
  //  * Can also be used for dual quaternions. (Multiply it with the real part)
  //  *
  //  * @param {vec3} out the receiving vector
  //  * @param {vec3} a the vector to transform
  //  * @param {quat} q quaternion to transform with
  //  * @returns {vec3} out
  //  */
  // export function transformQuat(out: vec3, a: vec3, q: quat): vec3 {
  //   // benchmarks: https://jsperf.com/quaternion-transform-vec3-implementations-fixed
  //   let qx = q[0], qy = q[1], qz = q[2], qw = q[3];
  //   let x = a[0], y = a[1], z = a[2];
  //   // var qvec = [qx, qy, qz];
  //   // var uv = vec3.cross([], qvec, a);
  //   let uvx = qy * z - qz * y,
  //     uvy = qz * x - qx * z,
  //     uvz = qx * y - qy * x;
  //   // var uuv = vec3.cross([], qvec, uv);
  //   let uuvx = qy * uvz - qz * uvy,
  //     uuvy = qz * uvx - qx * uvz,
  //     uuvz = qx * uvy - qy * uvx;
  //   // vec3.scale(uv, uv, 2 * w);
  //   let w2 = qw * 2;
  //   uvx *= w2;
  //   uvy *= w2;
  //   uvz *= w2;
  //   // vec3.scale(uuv, uuv, 2);
  //   uuvx *= 2;
  //   uuvy *= 2;
  //   uuvz *= 2;
  //   // return vec3.add(out, a, vec3.add(out, uv, uuv));
  //   out[0] = x + uvx + uuvx;
  //   out[1] = y + uvy + uuvy;
  //   out[2] = z + uvz + uuvz;
  //   return out;
  // }
  //
  // /**
  //  * Rotate a 3D vector around the x-axis
  //  * @param {vec3} out The receiving vec3
  //  * @param {vec3} a The vec3 point to rotate
  //  * @param {vec3} b The origin of the rotation
  //  * @param {Number} c The angle of rotation
  //  * @returns {vec3} out
  //  */
  // export function rotateX(out: vec3, a: vec3, b: vec3, c: number): vec3 {
  //   let p = [], r = [];
  //   //Translate point to the origin
  //   p[0] = a[0] - b[0];
  //   p[1] = a[1] - b[1];
  //   p[2] = a[2] - b[2];
  //
  //   //perform rotation
  //   r[0] = p[0];
  //   r[1] = p[1] * Math.cos(c) - p[2] * Math.sin(c);
  //   r[2] = p[1] * Math.sin(c) + p[2] * Math.cos(c);
  //
  //   //translate to correct position
  //   out[0] = r[0] + b[0];
  //   out[1] = r[1] + b[1];
  //   out[2] = r[2] + b[2];
  //
  //   return out;
  // }
  //
  // /**
  //  * Rotate a 3D vector around the y-axis
  //  * @param {vec3} out The receiving vec3
  //  * @param {vec3} a The vec3 point to rotate
  //  * @param {vec3} b The origin of the rotation
  //  * @param {Number} c The angle of rotation
  //  * @returns {vec3} out
  //  */
  // export function rotateY(out: vec3, a: vec3, b: vec3, c: number): vec3 {
  //   let p = [], r = [];
  //   //Translate point to the origin
  //   p[0] = a[0] - b[0];
  //   p[1] = a[1] - b[1];
  //   p[2] = a[2] - b[2];
  //
  //   //perform rotation
  //   r[0] = p[2] * Math.sin(c) + p[0] * Math.cos(c);
  //   r[1] = p[1];
  //   r[2] = p[2] * Math.cos(c) - p[0] * Math.sin(c);
  //
  //   //translate to correct position
  //   out[0] = r[0] + b[0];
  //   out[1] = r[1] + b[1];
  //   out[2] = r[2] + b[2];
  //
  //   return out;
  // }
  //
  // /**
  //  * Rotate a 3D vector around the z-axis
  //  * @param {vec3} out The receiving vec3
  //  * @param {vec3} a The vec3 point to rotate
  //  * @param {vec3} b The origin of the rotation
  //  * @param {Number} c The angle of rotation
  //  * @returns {vec3} out
  //  */
  // export function rotateZ(out: vec3, a: vec3, b: vec3, c: number): vec3 {
  //   let p = [], r = [];
  //   //Translate point to the origin
  //   p[0] = a[0] - b[0];
  //   p[1] = a[1] - b[1];
  //   p[2] = a[2] - b[2];
  //
  //   //perform rotation
  //   r[0] = p[0] * Math.cos(c) - p[1] * Math.sin(c);
  //   r[1] = p[0] * Math.sin(c) + p[1] * Math.cos(c);
  //   r[2] = p[2];
  //
  //   //translate to correct position
  //   out[0] = r[0] + b[0];
  //   out[1] = r[1] + b[1];
  //   out[2] = r[2] + b[2];
  //
  //   return out;
  // }
  //
  // /**
  //  * Get the angle between two 3D vectors
  //  * @param {vec3} a The first operand
  //  * @param {vec3} b The second operand
  //  * @returns {Number} The angle in radians
  //  */
  // export function angle(a: vec3, b: vec3): number {
  //   let tempA = fromValues(a[0], a[1], a[2]);
  //   let tempB = fromValues(b[0], b[1], b[2]);
  //
  //   normalize(tempA, tempA);
  //   normalize(tempB, tempB);
  //
  //   let cosine = dot(tempA, tempB);
  //
  //   if (cosine > 1.0) {
  //     return 0;
  //   }
  //   else if (cosine < -1.0) {
  //     return Math.PI;
  //   } else {
  //     return Math.acos(cosine);
  //   }
  // }
  //
  // /**
  //  * Returns a string representation of a vector
  //  *
  //  * @param {vec3} a vector to represent as a string
  //  * @returns {String} string representation of the vector
  //  */
  // export function str(a: vec3): string {
  //   return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
  // }
  //
  // /**
  //  * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
  //  *
  //  * @param {vec3} a The first vector.
  //  * @param {vec3} b The second vector.
  //  * @returns {Boolean} True if the vectors are equal, false otherwise.
  //  */
  // export function exactEquals(a: vec3, b: vec3): boolean {
  //   return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  // }
  //
  // /**
  //  * Returns whether or not the vectors have approximately the same elements in the same position.
  //  *
  //  * @param {vec3} a The first vector.
  //  * @param {vec3} b The second vector.
  //  * @returns {Boolean} True if the vectors are equal, false otherwise.
  //  */
  // export function equals(a: vec3, b: vec3): boolean {
  //   let a0 = a[0], a1 = a[1], a2 = a[2];
  //   let b0 = b[0], b1 = b[1], b2 = b[2];
  //   return (Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
  //     Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
  //     Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)));
  // }
  //
  // /**
  //  * Alias for {@link vec3.subtract}
  //  * @function
  //  */
  // export const sub = subtract;
  //
  // /**
  //  * Alias for {@link vec3.multiply}
  //  * @function
  //  */
  // export const mul = multiply;
  //
  // /**
  //  * Alias for {@link vec3.divide}
  //  * @function
  //  */
  // export const div = divide;
  //
  // /**
  //  * Alias for {@link vec3.distance}
  //  * @function
  //  */
  // export const dist = distance;
  //
  // /**
  //  * Alias for {@link vec3.squaredDistance}
  //  * @function
  //  */
  // export const sqrDist = squaredDistance;
  //
  // /**
  //  * Alias for {@link vec3.length}
  //  * @function
  //  */
  // export const len = length;
  //
  // /**
  //  * Alias for {@link vec3.squaredLength}
  //  * @function
  //  */
  // export const sqrLen = squaredLength;
  //
  // /**
  //  * Perform some operation over an array of vec3s.
  //  *
  //  * @param {Array} a the array of vectors to iterate over
  //  * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
  //  * @param {Number} offset Number of elements to skip at the beginning of the array
  //  * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
  //  * @param {Function} fn Function to call for each vector in the array
  //  * @param {Object} [arg] additional argument to pass to fn
  //  * @returns {Array} a
  //  * @function
  //  */
  // export const forEach = (function() {
  //   let vec = create();
  //
  //   return function(a: string | any[], stride: number, offset: number, count: number, fn: (arg0: Float32Array, arg1: Float32Array, arg2: any) => void, arg: any) {
  //     let i, l;
  //     if (!stride) {
  //       stride = 3;
  //     }
  //
  //     if (!offset) {
  //       offset = 0;
  //     }
  //
  //     if (count) {
  //       l = Math.min((count * stride) + offset, a.length);
  //     } else {
  //       l = a.length;
  //     }
  //
  //     for (i = offset; i < l; i += stride) {
  //       vec[0] = a[i]; vec[1] = a[i + 1]; vec[2] = a[i + 2];
  //       fn(vec, vec, arg);
  //       a[i] = vec[0]; a[i + 1] = vec[1]; a[i + 2] = vec[2];
  //     }
  //
  //     return a;
  //   };
  // })();
}

// function Distance(nodeA: Node, nodeB: Node): number {
//   return Math.sqrt(
//     Math.pow(nodeA.local.translation.x - nodeB.local.translation.x, 2) +
//     Math.pow(nodeA.local.translation.y - nodeB.local.translation.y, 2) +
//     Math.pow(nodeA.local.translation.z - nodeB.local.translation.z, 2));
// }


