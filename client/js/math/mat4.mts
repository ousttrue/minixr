import * as glMatrix from "./common.mjs";
import { vec3 } from './vec3.mjs';
import { quat } from './quat.mjs';

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 *
 * 00 01 02 03
 * 04 05 02 03
 * 08 09 10 11
 * 12 13 14 15
 */
export class mat4 {
  constructor(public array = new Float32Array(16)) { }
  get m00() { return this.array[0]; }
  get m01() { return this.array[1]; }
  get m02() { return this.array[2]; }
  get m03() { return this.array[3]; }
  get m10() { return this.array[4]; }
  get m11() { return this.array[5]; }
  get m12() { return this.array[6]; }
  get m13() { return this.array[7]; }
  get m20() { return this.array[8]; }
  get m21() { return this.array[9]; }
  get m22() { return this.array[10]; }
  get m23() { return this.array[11]; }
  get m30() { return this.array[12]; }
  get m31() { return this.array[13]; }
  get m32() { return this.array[14]; }
  get m33() { return this.array[15]; }
  set m00(n: number) { this.array[0] = n; }
  set m01(n: number) { this.array[1] = n; }
  set m02(n: number) { this.array[2] = n; }
  set m03(n: number) { this.array[3] = n; }
  set m10(n: number) { this.array[4] = n; }
  set m11(n: number) { this.array[5] = n; }
  set m12(n: number) { this.array[6] = n; }
  set m13(n: number) { this.array[7] = n; }
  set m20(n: number) { this.array[8] = n; }
  set m21(n: number) { this.array[9] = n; }
  set m22(n: number) { this.array[10] = n; }
  set m23(n: number) { this.array[11] = n; }
  set m30(n: number) { this.array[12] = n; }
  set m31(n: number) { this.array[13] = n; }
  set m32(n: number) { this.array[14] = n; }
  set m33(n: number) { this.array[15] = n; }
  equal(rhs: mat4): boolean {
    return (
      this.m00 == rhs.m00 && this.m01 == rhs.m01 && this.m02 == rhs.m02 && this.m03 == rhs.m03
      && this.m10 == rhs.m10 && this.m11 == rhs.m11 && this.m12 == rhs.m12 && this.m13 == rhs.m13
      && this.m20 == rhs.m20 && this.m21 == rhs.m21 && this.m22 == rhs.m22 && this.m23 == rhs.m23
      && this.m30 == rhs.m30 && this.m31 == rhs.m31 && this.m32 == rhs.m32 && this.m33 == rhs.m33
    );
  }

  /**
   * Set the components of a mat4 to the given values
   *
   */
  set(m00: number, m01: number, m02: number, m03: number,
    m10: number, m11: number, m12: number, m13: number,
    m20: number, m21: number, m22: number, m23: number,
    m30: number, m31: number, m32: number, m33: number) {
    this.array[0] = m00;
    this.array[1] = m01;
    this.array[2] = m02;
    this.array[3] = m03;
    this.array[4] = m10;
    this.array[5] = m11;
    this.array[6] = m12;
    this.array[7] = m13;
    this.array[8] = m20;
    this.array[9] = m21;
    this.array[10] = m22;
    this.array[11] = m23;
    this.array[12] = m30;
    this.array[13] = m31;
    this.array[14] = m32;
    this.array[15] = m33;
  }

  /**
   * Creates a new identity mat4
   */
  static fromValues(
    m00: number, m01: number, m02: number, m03: number,
    m10: number, m11: number, m12: number, m13: number,
    m20: number, m21: number, m22: number, m23: number,
    m30: number, m31: number, m32: number, m33: number,
    option?: { out: mat4 }
  ): mat4 {
    const dst = option?.out ?? new mat4();
    dst.set(m00, m01, m02, m03
      , m10, m11, m12, m13
      , m20, m21, m22, m23
      , m30, m31, m32, m33
    );
    return dst;
  }

  static zero(option?: { out: mat4 }): mat4 {
    const dst = option?.out ?? new mat4();
    dst.array.fill(0);
    return dst;
  }

  /**
   * Set a mat4 to the identity matrix
   */
  static identity(option?: { out: mat4 }): mat4 {
    const dst = option?.out ?? new mat4();
    dst.array[0] = 1;
    dst.array[1] = 0;
    dst.array[2] = 0;
    dst.array[3] = 0;
    dst.array[4] = 0;
    dst.array[5] = 1;
    dst.array[6] = 0;
    dst.array[7] = 0;
    dst.array[8] = 0;
    dst.array[9] = 0;
    dst.array[10] = 1;
    dst.array[11] = 0;
    dst.array[12] = 0;
    dst.array[13] = 0;
    dst.array[14] = 0;
    dst.array[15] = 1;
    return dst;
  }

  /**
   * Copy the values from one mat4 to another
   */
  copy(option?: { out: mat4 }): mat4 {
    const dst = option?.out ?? new mat4();
    dst.array.set(this.array);
    return dst;
  }

  /**
   * Transpose the values of a mat4
   *
   * @param {mat4} out the receiving matrix
   * @param {mat4} a the source matrix
   * @returns {mat4} out
   */
  transpose(option?: { out: mat4 }): mat4 {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    const dst = option?.out ?? new mat4();
    const out = dst.array;
    const a = this.array;
    let a01 = a[1], a02 = a[2], a03 = a[3];
    let a12 = a[6], a13 = a[7];
    let a23 = a[11];

    out[1] = a[4];
    out[2] = a[8];
    out[3] = a[12];
    out[4] = a01;
    out[6] = a[9];
    out[7] = a[13];
    out[8] = a02;
    out[9] = a12;
    out[11] = a[14];
    out[12] = a03;
    out[13] = a13;
    out[14] = a23;

    return dst;
  }

  /**
   * Inverts a mat4
   */
  invert(option?: { out: mat4 }): mat4 | null {
    const dst = option?.out ?? new mat4();
    const a = this.array;
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    let b00 = a00 * a11 - a01 * a10;
    let b01 = a00 * a12 - a02 * a10;
    let b02 = a00 * a13 - a03 * a10;
    let b03 = a01 * a12 - a02 * a11;
    let b04 = a01 * a13 - a03 * a11;
    let b05 = a02 * a13 - a03 * a12;
    let b06 = a20 * a31 - a21 * a30;
    let b07 = a20 * a32 - a22 * a30;
    let b08 = a20 * a33 - a23 * a30;
    let b09 = a21 * a32 - a22 * a31;
    let b10 = a21 * a33 - a23 * a31;
    let b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
      return null;
    }
    det = 1.0 / det;

    dst.array[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    dst.array[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    dst.array[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    dst.array[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    dst.array[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    dst.array[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    dst.array[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    dst.array[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    dst.array[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    dst.array[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    dst.array[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    dst.array[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    dst.array[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    dst.array[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    dst.array[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    dst.array[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return dst;
  }

  // /**
  //  * Calculates the adjugate of a mat4
  //  *
  //  * @param {mat4} out the receiving matrix
  //  * @param {mat4} a the source matrix
  //  * @returns {mat4} out
  //  */
  // export function adjoint(out: mat4, a: mat4): mat4 {
  //   let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  //   let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  //   let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  //   let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  //
  //   out[0] = (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
  //   out[1] = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
  //   out[2] = (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
  //   out[3] = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
  //   out[4] = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
  //   out[5] = (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
  //   out[6] = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
  //   out[7] = (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
  //   out[8] = (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
  //   out[9] = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
  //   out[10] = (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
  //   out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
  //   out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
  //   out[13] = (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
  //   out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
  //   out[15] = (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
  //   return out;
  // }
  //
  // /**
  //  * Calculates the determinant of a mat4
  //  *
  //  * @param {mat4} a the source matrix
  //  * @returns {Number} determinant of a
  //  */
  // export function determinant(a: mat4): number {
  //   let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  //   let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  //   let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  //   let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  //
  //   let b00 = a00 * a11 - a01 * a10;
  //   let b01 = a00 * a12 - a02 * a10;
  //   let b02 = a00 * a13 - a03 * a10;
  //   let b03 = a01 * a12 - a02 * a11;
  //   let b04 = a01 * a13 - a03 * a11;
  //   let b05 = a02 * a13 - a03 * a12;
  //   let b06 = a20 * a31 - a21 * a30;
  //   let b07 = a20 * a32 - a22 * a30;
  //   let b08 = a20 * a33 - a23 * a30;
  //   let b09 = a21 * a32 - a22 * a31;
  //   let b10 = a21 * a33 - a23 * a31;
  //   let b11 = a22 * a33 - a23 * a32;
  //
  //   // Calculate the determinant
  //   return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  // }

  /**
   * Multiplies two mat4s
   */
  mul(_b: mat4, option?: { out: mat4 }): mat4 {
    const dst = option?.out ?? new mat4();
    const out = dst.array;

    const a = this.array;
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    const b = _b.array;
    const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
    const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
    const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
    const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

    out[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
    out[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;

    out[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
    out[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
    out[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
    out[7] = b10 * a03 + b11 * a13 + b22 * a23 + b13 * a33;

    out[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
    out[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
    out[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
    out[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;

    out[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
    out[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
    out[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
    out[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
    return dst;
  }

  // /**
  //  * Translate a mat4 by the given vector
  //  *
  //  * @param {mat4} out the receiving matrix
  //  * @param {mat4} a the matrix to translate
  //  * @param {vec3} v vector to translate by
  //  * @returns {mat4} out
  //  */
  // export function translate(out: mat4, a: mat4, v: vec3): mat4 {
  //   let x = v[0], y = v[1], z = v[2];
  //   let a00, a01, a02, a03;
  //   let a10, a11, a12, a13;
  //   let a20, a21, a22, a23;
  //
  //   if (a === out) {
  //     out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
  //     out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
  //     out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
  //     out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  //   } else {
  //     a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
  //     a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
  //     a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];
  //
  //     out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
  //     out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
  //     out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;
  //
  //     out[12] = a00 * x + a10 * y + a20 * z + a[12];
  //     out[13] = a01 * x + a11 * y + a21 * z + a[13];
  //     out[14] = a02 * x + a12 * y + a22 * z + a[14];
  //     out[15] = a03 * x + a13 * y + a23 * z + a[15];
  //   }
  //
  //   return out;
  // }

  // /**
  //  * Scales the mat4 by the dimensions in the given vec3 not using vectorization
  //  *
  //  * @param {mat4} out the receiving matrix
  //  * @param {mat4} a the matrix to scale
  //  * @param {vec3} v the vec3 to scale the matrix by
  //  * @returns {mat4} out
  //  **/
  // export function scale(out: mat4, a: mat4, v: vec3): mat4 {
  //   let x = v[0], y = v[1], z = v[2];
  //
  //   out[0] = a[0] * x;
  //   out[1] = a[1] * x;
  //   out[2] = a[2] * x;
  //   out[3] = a[3] * x;
  //   out[4] = a[4] * y;
  //   out[5] = a[5] * y;
  //   out[6] = a[6] * y;
  //   out[7] = a[7] * y;
  //   out[8] = a[8] * z;
  //   out[9] = a[9] * z;
  //   out[10] = a[10] * z;
  //   out[11] = a[11] * z;
  //   out[12] = a[12];
  //   out[13] = a[13];
  //   out[14] = a[14];
  //   out[15] = a[15];
  //   return out;
  // }
  //
  // /**
  //  * Rotates a mat4 by the given angle around the given axis
  //  *
  //  * @param {mat4} out the receiving matrix
  //  * @param {mat4} a the matrix to rotate
  //  * @param {Number} rad the angle to rotate the matrix by
  //  * @param {vec3} axis the axis to rotate around
  //  * @returns {mat4} out
  //  */
  // export function rotate(out: mat4, a: mat4, rad: number, axis: vec3): mat4 | null {
  //   let x = axis[0], y = axis[1], z = axis[2];
  //   let len = Math.sqrt(x * x + y * y + z * z);
  //   let s, c, t;
  //   let a00, a01, a02, a03;
  //   let a10, a11, a12, a13;
  //   let a20, a21, a22, a23;
  //   let b00, b01, b02;
  //   let b10, b11, b12;
  //   let b20, b21, b22;
  //
  //   if (len < glMatrix.EPSILON) { return null; }
  //
  //   len = 1 / len;
  //   x *= len;
  //   y *= len;
  //   z *= len;
  //
  //   s = Math.sin(rad);
  //   c = Math.cos(rad);
  //   t = 1 - c;
  //
  //   a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
  //   a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
  //   a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];
  //
  //   // Construct the elements of the rotation matrix
  //   b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
  //   b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
  //   b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;
  //
  //   // Perform rotation-specific matrix multiplication
  //   out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  //   out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  //   out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  //   out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  //   out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  //   out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  //   out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  //   out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  //   out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  //   out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  //   out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  //   out[11] = a03 * b20 + a13 * b21 + a23 * b22;
  //
  //   if (a !== out) { // If the source and destination differ, copy the unchanged last row
  //     out[12] = a[12];
  //     out[13] = a[13];
  //     out[14] = a[14];
  //     out[15] = a[15];
  //   }
  //   return out;
  // }

  /**
   * Rotates a matrix by the given angle around the X axis
   */
  rotateX(rad: number) {
    let s = Math.sin(rad);
    let c = Math.cos(rad);
    let a10 = this.array[4];
    let a11 = this.array[5];
    let a12 = this.array[6];
    let a13 = this.array[7];
    let a20 = this.array[8];
    let a21 = this.array[9];
    let a22 = this.array[10];
    let a23 = this.array[11];
    // Perform axis-specific matrix multiplication
    this.array[4] = a10 * c + a20 * s;
    this.array[5] = a11 * c + a21 * s;
    this.array[6] = a12 * c + a22 * s;
    this.array[7] = a13 * c + a23 * s;
    this.array[8] = a20 * c - a10 * s;
    this.array[9] = a21 * c - a11 * s;
    this.array[10] = a22 * c - a12 * s;
    this.array[11] = a23 * c - a13 * s;
  }

  /**
   * Rotates a matrix by the given angle around the Y axis
   */
  rotateY(rad: number) {
    let s = Math.sin(rad);
    let c = Math.cos(rad);
    let a00 = this.array[0];
    let a01 = this.array[1];
    let a02 = this.array[2];
    let a03 = this.array[3];
    let a20 = this.array[8];
    let a21 = this.array[9];
    let a22 = this.array[10];
    let a23 = this.array[11];
    // Perform axis-specific matrix multiplication
    this.array[0] = a00 * c - a20 * s;
    this.array[1] = a01 * c - a21 * s;
    this.array[2] = a02 * c - a22 * s;
    this.array[3] = a03 * c - a23 * s;
    this.array[8] = a00 * s + a20 * c;
    this.array[9] = a01 * s + a21 * c;
    this.array[10] = a02 * s + a22 * c;
    this.array[11] = a03 * s + a23 * c;
  }

  // /**
  //  * Rotates a matrix by the given angle around the Z axis
  //  *
  //  * @param {mat4} out the receiving matrix
  //  * @param {mat4} a the matrix to rotate
  //  * @param {Number} rad the angle to rotate the matrix by
  //  * @returns {mat4} out
  //  */
  // export function rotateZ(out: mat4, a: mat4, rad: number): mat4 {
  //   let s = Math.sin(rad);
  //   let c = Math.cos(rad);
  //   let a00 = a[0];
  //   let a01 = a[1];
  //   let a02 = a[2];
  //   let a03 = a[3];
  //   let a10 = a[4];
  //   let a11 = a[5];
  //   let a12 = a[6];
  //   let a13 = a[7];
  //
  //   if (a !== out) { // If the source and destination differ, copy the unchanged last row
  //     out[8] = a[8];
  //     out[9] = a[9];
  //     out[10] = a[10];
  //     out[11] = a[11];
  //     out[12] = a[12];
  //     out[13] = a[13];
  //     out[14] = a[14];
  //     out[15] = a[15];
  //   }
  //
  //   // Perform axis-specific matrix multiplication
  //   out[0] = a00 * c + a10 * s;
  //   out[1] = a01 * c + a11 * s;
  //   out[2] = a02 * c + a12 * s;
  //   out[3] = a03 * c + a13 * s;
  //   out[4] = a10 * c - a00 * s;
  //   out[5] = a11 * c - a01 * s;
  //   out[6] = a12 * c - a02 * s;
  //   out[7] = a13 * c - a03 * s;
  //   return out;
  // }

  /**
   * Creates a matrix from a vector translation
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.translate(dest, dest, vec);
   *
   */
  static fromTranslation(x: number, y: number, z: number, option?: { out: mat4 }): mat4 {
    const dst = option?.out ?? new mat4();
    dst.array[0] = 1;
    dst.array[1] = 0;
    dst.array[2] = 0;
    dst.array[3] = 0;
    dst.array[4] = 0;
    dst.array[5] = 1;
    dst.array[6] = 0;
    dst.array[7] = 0;
    dst.array[8] = 0;
    dst.array[9] = 0;
    dst.array[10] = 1;
    dst.array[11] = 0;
    dst.array[12] = x;
    dst.array[13] = y;
    dst.array[14] = z;
    dst.array[15] = 1;
    return dst;
  }

  /**
   * Creates a matrix from a vector scaling
   * This is equivalent to (but much faster than):
   *
   * @param {vec3} v Scaling vector
   */
  static fromScaling(v: vec3, option?: { out: mat4 }): mat4 {
    const dst = option?.out ?? new mat4();
    const out = dst.array;
    out[0] = v.x;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v.y;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v.z;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return dst;
  }

  /**
   * Creates a matrix from a given angle around a given axis
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.rotate(dest, dest, rad, axis);
   */
  static fromRotation(rad: number, axis: vec3, option?: { out: mat4 }): mat4 | null {
    const dst = option?.out ?? new mat4();
    let x = axis.x;
    let y = axis.y;
    let z = axis.z;
    let len = Math.sqrt(x * x + y * y + z * z);
    let s, c, t;

    if (len < glMatrix.EPSILON) { return null; }

    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    // Perform rotation-specific matrix multiplication
    const out = dst.array;
    out[0] = x * x * t + c;
    out[1] = y * x * t + z * s;
    out[2] = z * x * t - y * s;
    out[3] = 0;
    out[4] = x * y * t - z * s;
    out[5] = y * y * t + c;
    out[6] = z * y * t + x * s;
    out[7] = 0;
    out[8] = x * z * t + y * s;
    out[9] = y * z * t - x * s;
    out[10] = z * z * t + c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return dst;
  }

  /**
   * Creates a matrix from the given angle around the X axis
   * This is equivalent to (but much faster than):
   */
  static fromXRotation(rad: number, option?: { out: mat4 }): mat4 {
    let s = Math.sin(rad);
    let c = Math.cos(rad);
    const dst = option?.out ?? new mat4();
    const out = dst.array;
    // Perform axis-specific matrix multiplication
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = c;
    out[6] = s;
    out[7] = 0;
    out[8] = 0;
    out[9] = -s;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return dst;
  }

  /**
   * Creates a matrix from the given angle around the Y axis
   * This is equivalent to (but much faster than):
   */
  static fromYRotation(rad: number, option?: { out: mat4 }): mat4 {
    let s = Math.sin(rad);
    let c = Math.cos(rad);
    const dst = option?.out ?? new mat4();
    const out = dst.array;
    // Perform axis-specific matrix multiplication
    out[0] = c;
    out[1] = 0;
    out[2] = -s;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return dst;
  }

  //
  // /**
  //  * Creates a matrix from the given angle around the Z axis
  //  * This is equivalent to (but much faster than):
  //  *
  //  *     mat4.identity(dest);
  //  *     mat4.rotateZ(dest, dest, rad);
  //  *
  //  * @param {mat4} out mat4 receiving operation result
  //  * @param {Number} rad the angle to rotate the matrix by
  //  * @returns {mat4} out
  //  */
  // export function fromZRotation(out: mat4, rad: number): mat4 {
  //   let s = Math.sin(rad);
  //   let c = Math.cos(rad);
  //
  //   // Perform axis-specific matrix multiplication
  //   out[0] = c;
  //   out[1] = s;
  //   out[2] = 0;
  //   out[3] = 0;
  //   out[4] = -s;
  //   out[5] = c;
  //   out[6] = 0;
  //   out[7] = 0;
  //   out[8] = 0;
  //   out[9] = 0;
  //   out[10] = 1;
  //   out[11] = 0;
  //   out[12] = 0;
  //   out[13] = 0;
  //   out[14] = 0;
  //   out[15] = 1;
  //   return out;
  // }

  /**
   * Creates a matrix from a quaternion rotation and vector translation
   * This is equivalent to (but much faster than):
   *
   *     mat4.identity(dest);
   *     mat4.translate(dest, vec);
   *     let quatMat = mat4.create();
   *     quat4.toMat4(quat, quatMat);
   *     mat4.multiply(dest, quatMat);
   */
  static fromRotationTranslation(q: quat, v: vec3, option?: { out: mat4 }): mat4 {
    // Quaternion math
    const dst = option?.out ?? new mat4();
    let x = q.x, y = q.y, z = q.z, w = q.w;
    let x2 = x + x;
    let y2 = y + y;
    let z2 = z + z;

    let xx = x * x2;
    let xy = x * y2;
    let xz = x * z2;
    let yy = y * y2;
    let yz = y * z2;
    let zz = z * z2;
    let wx = w * x2;
    let wy = w * y2;
    let wz = w * z2;

    const out = dst.array;
    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v.x;
    out[13] = v.y;
    out[14] = v.z;
    out[15] = 1;

    return dst;
  }

  // /**
  //  * Creates a new mat4 from a dual quat.
  //  *
  //  * @param {mat4} out Matrix
  //  * @param {quat2} a Dual Quaternion
  //  * @returns {mat4} mat4 receiving operation result
  //  */
  // export function fromQuat2(out: mat4, a: quat2): mat4 {
  //   let translation = new Float32Array(3);
  //   let bx = -a[0], by = -a[1], bz = -a[2], bw = a[3],
  //     ax = a[4], ay = a[5], az = a[6], aw = a[7];
  //
  //   let magnitude = bx * bx + by * by + bz * bz + bw * bw;
  //   //Only scale if it makes sense
  //   if (magnitude > 0) {
  //     translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
  //     translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
  //     translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
  //   } else {
  //     translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
  //     translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
  //     translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
  //   }
  //   fromRotationTranslation(out, a, translation);
  //   return out;
  // }

  getX(option?: { out: vec3 }): vec3 {
    if (option?.out) {
      const dst = option?.out;
      // copy
      dst.array.set(this.array.subarray(0, 3));
      return dst;
    }
    else {
      // reference
      return new vec3(this.array.subarray(0, 3));
    }
  }

  getY(option?: { out: vec3 }): vec3 {
    if (option?.out) {
      const dst = option?.out;
      // copy
      dst.array.set(this.array.subarray(4, 7));
      return dst;
    }
    else {
      // reference
      return new vec3(this.array.subarray(4, 7));
    }
  }

  getZ(option?: { out: vec3 }): vec3 {
    if (option?.out) {
      const dst = option?.out;
      // copy
      dst.array.set(this.array.subarray(8, 11));
      return dst;
    }
    else {
      // reference
      return new vec3(this.array.subarray(8, 11));
    }
  }

  /**
   * Returns the translation vector component of a transformation
   *  matrix. If a matrix is built with fromRotationTranslation,
   *  the returned vector will be the same as the translation vector
   *  originally supplied.
   */
  getTranslation(option?: { out: vec3 }): vec3 {
    if (option?.out) {
      const dst = option?.out;
      // copy
      dst.array.set(this.array.subarray(12, 15));
      return dst;
    }
    else {
      // reference
      return new vec3(this.array.subarray(12, 15));
    }
  }

  // /**
  //  * Returns the scaling factor component of a transformation
  //  *  matrix. If a matrix is built with fromRotationTranslationScale
  //  *  with a normalized Quaternion paramter, the returned vector will be
  //  *  the same as the scaling vector
  //  *  originally supplied.
  //  * @param  {vec3} out Vector to receive scaling factor component
  //  * @param  {mat4} mat Matrix to be decomposed (input)
  //  * @return {vec3} out
  //  */
  // export function getScaling(out: vec3, mat: mat4): vec3 {
  //   let m11 = mat[0];
  //   let m12 = mat[1];
  //   let m13 = mat[2];
  //   let m21 = mat[4];
  //   let m22 = mat[5];
  //   let m23 = mat[6];
  //   let m31 = mat[8];
  //   let m32 = mat[9];
  //   let m33 = mat[10];
  //
  //   out[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
  //   out[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
  //   out[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);
  //
  //   return out;
  // }

  /**
   * Returns a quaternion representing the rotational component
   *  of a transformation matrix. If a matrix is built with
   *  fromRotationTranslation, the returned quaternion will be the
   *  same as the quaternion originally supplied.
   * @param {quat} out Quaternion to receive the rotation component
   * @param {mat4} mat Matrix to be decomposed (input)
   * @return {quat} out
   */
  getRotation(): quat {
    // Algorithm taken from http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
    const mat = this.array;
    let trace = mat[0] + mat[5] + mat[10];
    let S = 0;

    const out = new Float32Array(4);
    if (trace > 0) {
      S = Math.sqrt(trace + 1.0) * 2;
      out[3] = 0.25 * S;
      out[0] = (mat[6] - mat[9]) / S;
      out[1] = (mat[8] - mat[2]) / S;
      out[2] = (mat[1] - mat[4]) / S;
    } else if ((mat[0] > mat[5]) && (mat[0] > mat[10])) {
      S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2;
      out[3] = (mat[6] - mat[9]) / S;
      out[0] = 0.25 * S;
      out[1] = (mat[1] + mat[4]) / S;
      out[2] = (mat[8] + mat[2]) / S;
    } else if (mat[5] > mat[10]) {
      S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2;
      out[3] = (mat[8] - mat[2]) / S;
      out[0] = (mat[1] + mat[4]) / S;
      out[1] = 0.25 * S;
      out[2] = (mat[6] + mat[9]) / S;
    } else {
      S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2;
      out[3] = (mat[1] - mat[4]) / S;
      out[0] = (mat[8] + mat[2]) / S;
      out[1] = (mat[6] + mat[9]) / S;
      out[2] = 0.25 * S;
    }
    return new quat(out);
  }

  /**
   * Creates a matrix from a quaternion rotation, vector translation and vector scale
   * This is equivalent to (but much faster than):
   */
  static fromTRS(v: vec3, q: quat, s: vec3, option?: { out: mat4 }) {
    // Quaternion math
    const x = q.x;
    const y = q.y;
    const z = q.z;
    const w = q.w;
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;

    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    const sx = s.x;
    const sy = s.y;
    const sz = s.z;

    const dst = option?.out ?? new mat4();
    const out = dst.array;
    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v.x;
    out[13] = v.y;
    out[14] = v.z;
    out[15] = 1;
    return dst;
  }

  // /**
  //  * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
  //  * This is equivalent to (but much faster than):
  //  *
  //  *     mat4.identity(dest);
  //  *     mat4.translate(dest, vec);
  //  *     mat4.translate(dest, origin);
  //  *     let quatMat = mat4.create();
  //  *     quat4.toMat4(quat, quatMat);
  //  *     mat4.multiply(dest, quatMat);
  //  *     mat4.scale(dest, scale)
  //  *     mat4.translate(dest, negativeOrigin);
  //  */
  // static fromRotationTranslationScaleOrigin(out: mat4, q: quat4, v: vec3, s: vec3, o: vec3): mat4 {
  //   // Quaternion math
  //   let x = q[0], y = q[1], z = q[2], w = q[3];
  //   let x2 = x + x;
  //   let y2 = y + y;
  //   let z2 = z + z;
  //
  //   let xx = x * x2;
  //   let xy = x * y2;
  //   let xz = x * z2;
  //   let yy = y * y2;
  //   let yz = y * z2;
  //   let zz = z * z2;
  //   let wx = w * x2;
  //   let wy = w * y2;
  //   let wz = w * z2;
  //
  //   let sx = s[0];
  //   let sy = s[1];
  //   let sz = s[2];
  //
  //   let ox = o[0];
  //   let oy = o[1];
  //   let oz = o[2];
  //
  //   let out0 = (1 - (yy + zz)) * sx;
  //   let out1 = (xy + wz) * sx;
  //   let out2 = (xz - wy) * sx;
  //   let out4 = (xy - wz) * sy;
  //   let out5 = (1 - (xx + zz)) * sy;
  //   let out6 = (yz + wx) * sy;
  //   let out8 = (xz + wy) * sz;
  //   let out9 = (yz - wx) * sz;
  //   let out10 = (1 - (xx + yy)) * sz;
  //
  //   out[0] = out0;
  //   out[1] = out1;
  //   out[2] = out2;
  //   out[3] = 0;
  //   out[4] = out4;
  //   out[5] = out5;
  //   out[6] = out6;
  //   out[7] = 0;
  //   out[8] = out8;
  //   out[9] = out9;
  //   out[10] = out10;
  //   out[11] = 0;
  //   out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
  //   out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
  //   out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
  //   out[15] = 1;
  //
  //   return out;
  // }

  /**
   * Calculates a 4x4 matrix from the given quaternion
   *
   * @param {quat} q Quaternion to create matrix from
   */
  static fromQuat(q: quat, option?: { out: mat4 }): mat4 {
    let x = q.x, y = q.y, z = q.z, w = q.w;
    let x2 = x + x;
    let y2 = y + y;
    let z2 = z + z;

    let xx = x * x2;
    let yx = y * x2;
    let yy = y * y2;
    let zx = z * x2;
    let zy = z * y2;
    let zz = z * z2;
    let wx = w * x2;
    let wy = w * y2;
    let wz = w * z2;

    const dst = option?.out ?? new mat4();
    const out = dst.array;
    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return dst;
  }

  // /**
  //  * Generates a frustum matrix with the given bounds
  //  *
  //  * @param {mat4} out mat4 frustum matrix will be written into
  //  * @param {Number} left Left bound of the frustum
  //  * @param {Number} right Right bound of the frustum
  //  * @param {Number} bottom Bottom bound of the frustum
  //  * @param {Number} top Top bound of the frustum
  //  * @param {Number} near Near bound of the frustum
  //  * @param {Number} far Far bound of the frustum
  //  * @returns {mat4} out
  //  */
  // export function frustum(out: mat4, left: number, right: number, bottom: number, top: number, near: number, far: number): mat4 {
  //   let rl = 1 / (right - left);
  //   let tb = 1 / (top - bottom);
  //   let nf = 1 / (near - far);
  //   out[0] = (near * 2) * rl;
  //   out[1] = 0;
  //   out[2] = 0;
  //   out[3] = 0;
  //   out[4] = 0;
  //   out[5] = (near * 2) * tb;
  //   out[6] = 0;
  //   out[7] = 0;
  //   out[8] = (right + left) * rl;
  //   out[9] = (top + bottom) * tb;
  //   out[10] = (far + near) * nf;
  //   out[11] = -1;
  //   out[12] = 0;
  //   out[13] = 0;
  //   out[14] = (far * near * 2) * nf;
  //   out[15] = 0;
  //   return out;
  // }

  /**
   * Generates a perspective projection matrix with the given bounds.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   */
  static perspective(
    fovy: number, aspect: number,
    near: number, far: number,
    option?: { out: mat4 }): mat4 {

    const dst = option?.out ?? new mat4();
    const out = dst.array;

    let f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (far - near);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = -(far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    out[14] = -(2 * far * near) * nf;
    return dst;
  }

  // /**
  //  * Generates a perspective projection matrix with the given field of view.
  //  * This is primarily useful for generating projection matrices to be used
  //  * with the still experiemental WebVR API.
  //  *
  //  * @param {mat4} out mat4 frustum matrix will be written into
  //  * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
  //  * @param {number} near Near bound of the frustum
  //  * @param {number} far Far bound of the frustum
  //  * @returns {mat4} out
  //  */
  // export function perspectiveFromFieldOfView(out: mat4, fov: object, near: number, far: number): mat4 {
  //   let upTan = Math.tan(fov.upDegrees * Math.PI / 180.0);
  //   let downTan = Math.tan(fov.downDegrees * Math.PI / 180.0);
  //   let leftTan = Math.tan(fov.leftDegrees * Math.PI / 180.0);
  //   let rightTan = Math.tan(fov.rightDegrees * Math.PI / 180.0);
  //   let xScale = 2.0 / (leftTan + rightTan);
  //   let yScale = 2.0 / (upTan + downTan);
  //
  //   out[0] = xScale;
  //   out[1] = 0.0;
  //   out[2] = 0.0;
  //   out[3] = 0.0;
  //   out[4] = 0.0;
  //   out[5] = yScale;
  //   out[6] = 0.0;
  //   out[7] = 0.0;
  //   out[8] = -((leftTan - rightTan) * xScale * 0.5);
  //   out[9] = ((upTan - downTan) * yScale * 0.5);
  //   out[10] = far / (near - far);
  //   out[11] = -1.0;
  //   out[12] = 0.0;
  //   out[13] = 0.0;
  //   out[14] = (far * near) / (near - far);
  //   out[15] = 0.0;
  //   return out;
  // }

  /**
   * Generates a orthogonal projection matrix with the given bounds
   */
  static ortho(left: number, right: number,
    bottom: number, top: number,
    near: number, far: number, option?: { out: mat4 }): mat4 {
    const dst = option?.out ?? new mat4();
    const out = dst.array;
    let lr = 1 / (left - right);
    let bt = 1 / (bottom - top);
    let nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return dst;
  }

  // /**
  //  * Generates a look-at matrix with the given eye position, focal point, and up axis.
  //  * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
  //  *
  //  * @param {mat4} out mat4 frustum matrix will be written into
  //  * @param {vec3} eye Position of the viewer
  //  * @param {vec3} center Point the viewer is looking at
  //  * @param {vec3} up vec3 pointing up
  //  * @returns {mat4} out
  //  */
  // export function lookAt(out: mat4, eye: vec3, center: vec3, up: vec3): mat4 {
  //   let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  //   let eyex = eye[0];
  //   let eyey = eye[1];
  //   let eyez = eye[2];
  //   let upx = up[0];
  //   let upy = up[1];
  //   let upz = up[2];
  //   let centerx = center[0];
  //   let centery = center[1];
  //   let centerz = center[2];
  //
  //   if (Math.abs(eyex - centerx) < glMatrix.EPSILON &&
  //     Math.abs(eyey - centery) < glMatrix.EPSILON &&
  //     Math.abs(eyez - centerz) < glMatrix.EPSILON) {
  //     return identity(out);
  //   }
  //
  //   z0 = eyex - centerx;
  //   z1 = eyey - centery;
  //   z2 = eyez - centerz;
  //
  //   len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
  //   z0 *= len;
  //   z1 *= len;
  //   z2 *= len;
  //
  //   x0 = upy * z2 - upz * z1;
  //   x1 = upz * z0 - upx * z2;
  //   x2 = upx * z1 - upy * z0;
  //   len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
  //   if (!len) {
  //     x0 = 0;
  //     x1 = 0;
  //     x2 = 0;
  //   } else {
  //     len = 1 / len;
  //     x0 *= len;
  //     x1 *= len;
  //     x2 *= len;
  //   }
  //
  //   y0 = z1 * x2 - z2 * x1;
  //   y1 = z2 * x0 - z0 * x2;
  //   y2 = z0 * x1 - z1 * x0;
  //
  //   len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
  //   if (!len) {
  //     y0 = 0;
  //     y1 = 0;
  //     y2 = 0;
  //   } else {
  //     len = 1 / len;
  //     y0 *= len;
  //     y1 *= len;
  //     y2 *= len;
  //   }
  //
  //   out[0] = x0;
  //   out[1] = y0;
  //   out[2] = z0;
  //   out[3] = 0;
  //   out[4] = x1;
  //   out[5] = y1;
  //   out[6] = z1;
  //   out[7] = 0;
  //   out[8] = x2;
  //   out[9] = y2;
  //   out[10] = z2;
  //   out[11] = 0;
  //   out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  //   out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  //   out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  //   out[15] = 1;
  //
  //   return out;
  // }
  //
  // /**
  //  * Generates a matrix that makes something look at something else.
  //  *
  //  * @param {mat4} out mat4 frustum matrix will be written into
  //  * @param {vec3} eye Position of the viewer
  //  * @param {vec3} center Point the viewer is looking at
  //  * @param {vec3} up vec3 pointing up
  //  * @returns {mat4} out
  //  */
  // export function targetTo(out: mat4, eye: vec3, target, up: vec3): mat4 {
  //   let eyex = eye[0],
  //     eyey = eye[1],
  //     eyez = eye[2],
  //     upx = up[0],
  //     upy = up[1],
  //     upz = up[2];
  //
  //   let z0 = eyex - target[0],
  //     z1 = eyey - target[1],
  //     z2 = eyez - target[2];
  //
  //   let len = z0 * z0 + z1 * z1 + z2 * z2;
  //   if (len > 0) {
  //     len = 1 / Math.sqrt(len);
  //     z0 *= len;
  //     z1 *= len;
  //     z2 *= len;
  //   }
  //
  //   let x0 = upy * z2 - upz * z1,
  //     x1 = upz * z0 - upx * z2,
  //     x2 = upx * z1 - upy * z0;
  //
  //   len = x0 * x0 + x1 * x1 + x2 * x2;
  //   if (len > 0) {
  //     len = 1 / Math.sqrt(len);
  //     x0 *= len;
  //     x1 *= len;
  //     x2 *= len;
  //   }
  //
  //   out[0] = x0;
  //   out[1] = x1;
  //   out[2] = x2;
  //   out[3] = 0;
  //   out[4] = z1 * x2 - z2 * x1;
  //   out[5] = z2 * x0 - z0 * x2;
  //   out[6] = z0 * x1 - z1 * x0;
  //   out[7] = 0;
  //   out[8] = z0;
  //   out[9] = z1;
  //   out[10] = z2;
  //   out[11] = 0;
  //   out[12] = eyex;
  //   out[13] = eyey;
  //   out[14] = eyez;
  //   out[15] = 1;
  //   return out;
  // };
  //
  // /**
  //  * Returns a string representation of a mat4
  //  *
  //  * @param {mat4} a matrix to represent as a string
  //  * @returns {String} string representation of the matrix
  //  */
  // export function str(a: mat4): string {
  //   return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
  //     a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
  //     a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' +
  //     a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
  // }
  //
  // /**
  //  * Returns Frobenius norm of a mat4
  //  *
  //  * @param {mat4} a the matrix to calculate Frobenius norm of
  //  * @returns {Number} Frobenius norm
  //  */
  // export function frob(a: mat4): number {
  //   return (Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2)))
  // }
  //
  // /**
  //  * Adds two mat4's
  //  *
  //  * @param {mat4} out the receiving matrix
  //  * @param {mat4} a the first operand
  //  * @param {mat4} b the second operand
  //  * @returns {mat4} out
  //  */
  // export function add(out: mat4, a: mat4, b: mat4): mat4 {
  //   out[0] = a[0] + b[0];
  //   out[1] = a[1] + b[1];
  //   out[2] = a[2] + b[2];
  //   out[3] = a[3] + b[3];
  //   out[4] = a[4] + b[4];
  //   out[5] = a[5] + b[5];
  //   out[6] = a[6] + b[6];
  //   out[7] = a[7] + b[7];
  //   out[8] = a[8] + b[8];
  //   out[9] = a[9] + b[9];
  //   out[10] = a[10] + b[10];
  //   out[11] = a[11] + b[11];
  //   out[12] = a[12] + b[12];
  //   out[13] = a[13] + b[13];
  //   out[14] = a[14] + b[14];
  //   out[15] = a[15] + b[15];
  //   return out;
  // }
  //
  // /**
  //  * Subtracts matrix b from matrix a
  //  *
  //  * @param {mat4} out the receiving matrix
  //  * @param {mat4} a the first operand
  //  * @param {mat4} b the second operand
  //  * @returns {mat4} out
  //  */
  // export function subtract(out: mat4, a: mat4, b: mat4): mat4 {
  //   out[0] = a[0] - b[0];
  //   out[1] = a[1] - b[1];
  //   out[2] = a[2] - b[2];
  //   out[3] = a[3] - b[3];
  //   out[4] = a[4] - b[4];
  //   out[5] = a[5] - b[5];
  //   out[6] = a[6] - b[6];
  //   out[7] = a[7] - b[7];
  //   out[8] = a[8] - b[8];
  //   out[9] = a[9] - b[9];
  //   out[10] = a[10] - b[10];
  //   out[11] = a[11] - b[11];
  //   out[12] = a[12] - b[12];
  //   out[13] = a[13] - b[13];
  //   out[14] = a[14] - b[14];
  //   out[15] = a[15] - b[15];
  //   return out;
  // }
  //
  // /**
  //  * Multiply each element of the matrix by a scalar.
  //  *
  //  * @param {mat4} out the receiving matrix
  //  * @param {mat4} a the matrix to scale
  //  * @param {Number} b amount to scale the matrix's elements by
  //  * @returns {mat4} out
  //  */
  // export function multiplyScalar(out: mat4, a: mat4, b: number): mat4 {
  //   out[0] = a[0] * b;
  //   out[1] = a[1] * b;
  //   out[2] = a[2] * b;
  //   out[3] = a[3] * b;
  //   out[4] = a[4] * b;
  //   out[5] = a[5] * b;
  //   out[6] = a[6] * b;
  //   out[7] = a[7] * b;
  //   out[8] = a[8] * b;
  //   out[9] = a[9] * b;
  //   out[10] = a[10] * b;
  //   out[11] = a[11] * b;
  //   out[12] = a[12] * b;
  //   out[13] = a[13] * b;
  //   out[14] = a[14] * b;
  //   out[15] = a[15] * b;
  //   return out;
  // }
  //
  // /**
  //  * Adds two mat4's after multiplying each element of the second operand by a scalar value.
  //  *
  //  * @param {mat4} out the receiving vector
  //  * @param {mat4} a the first operand
  //  * @param {mat4} b the second operand
  //  * @param {Number} scale the amount to scale b's elements by before adding
  //  * @returns {mat4} out
  //  */
  // export function multiplyScalarAndAdd(out: mat4, a: mat4, b: mat4, scale: number): mat4 {
  //   out[0] = a[0] + (b[0] * scale);
  //   out[1] = a[1] + (b[1] * scale);
  //   out[2] = a[2] + (b[2] * scale);
  //   out[3] = a[3] + (b[3] * scale);
  //   out[4] = a[4] + (b[4] * scale);
  //   out[5] = a[5] + (b[5] * scale);
  //   out[6] = a[6] + (b[6] * scale);
  //   out[7] = a[7] + (b[7] * scale);
  //   out[8] = a[8] + (b[8] * scale);
  //   out[9] = a[9] + (b[9] * scale);
  //   out[10] = a[10] + (b[10] * scale);
  //   out[11] = a[11] + (b[11] * scale);
  //   out[12] = a[12] + (b[12] * scale);
  //   out[13] = a[13] + (b[13] * scale);
  //   out[14] = a[14] + (b[14] * scale);
  //   out[15] = a[15] + (b[15] * scale);
  //   return out;
  // }
  //
  // /**
  //  * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
  //  *
  //  * @param {mat4} a The first matrix.
  //  * @param {mat4} b The second matrix.
  //  * @returns {Boolean} True if the matrices are equal, false otherwise.
  //  */
  // export function exactEquals(a: mat4, b: mat4): boolean {
  //   return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] &&
  //     a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] &&
  //     a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] &&
  //     a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
  // }
  //
  // /**
  //  * Returns whether or not the matrices have approximately the same elements in the same position.
  //  *
  //  * @param {mat4} a The first matrix.
  //  * @param {mat4} b The second matrix.
  //  * @returns {Boolean} True if the matrices are equal, false otherwise.
  //  */
  // export function equals(a: mat4, b: mat4): boolean {
  //   let a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
  //   let a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7];
  //   let a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11];
  //   let a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];
  //
  //   let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  //   let b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7];
  //   let b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11];
  //   let b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
  //
  //   return (Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a0), Math.abs(b0)) &&
  //     Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a1), Math.abs(b1)) &&
  //     Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a2), Math.abs(b2)) &&
  //     Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a3), Math.abs(b3)) &&
  //     Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a4), Math.abs(b4)) &&
  //     Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a5), Math.abs(b5)) &&
  //     Math.abs(a6 - b6) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a6), Math.abs(b6)) &&
  //     Math.abs(a7 - b7) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a7), Math.abs(b7)) &&
  //     Math.abs(a8 - b8) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a8), Math.abs(b8)) &&
  //     Math.abs(a9 - b9) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a9), Math.abs(b9)) &&
  //     Math.abs(a10 - b10) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a10), Math.abs(b10)) &&
  //     Math.abs(a11 - b11) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a11), Math.abs(b11)) &&
  //     Math.abs(a12 - b12) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a12), Math.abs(b12)) &&
  //     Math.abs(a13 - b13) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a13), Math.abs(b13)) &&
  //     Math.abs(a14 - b14) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a14), Math.abs(b14)) &&
  //     Math.abs(a15 - b15) <= glMatrix.EPSILON * Math.max(1.0, Math.abs(a15), Math.abs(b15)));
  // }
}

// /**
//  * Alias for {@link mat4.multiply}
//  * @function
//  */
// export const mul = multiply;
//
// /**
//  * Alias for {@link mat4.subtract}
//  * @function
//  */
// export const sub = subtract;
