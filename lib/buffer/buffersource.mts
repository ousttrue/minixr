import { vec3, BoundingBox } from '../math/gl-matrix.mjs';


const GL = WebGL2RenderingContext; // For enums


export type BufferSourceArray = (
  Float32Array
  | Uint8Array | Uint16Array | Uint32Array
);


export class BufferSource {
  dirty = false;

  constructor(
    public readonly componentCount: number,
    public readonly array: BufferSourceArray,
    public readonly usage: number = GL.STATIC_DRAW,
  ) {
  }

  get glType(): number {
    if (this.array instanceof Uint16Array) {
      return GL.UNSIGNED_SHORT;
    }
    else if (this.array instanceof Uint8Array) {
      return GL.UNSIGNED_BYTE;
    }
    else if (this.array instanceof Uint32Array) {
      return GL.UNSIGNED_INT;
    }
    else {
      throw new Error("unknown");
    }
  }

  get length() {
    return this.array.length / this.componentCount;
  }

  get stride() {
    return this.array.byteLength / this.array.length * this.componentCount
  }

  updateBBFromPositions(bb: BoundingBox) {
    const floats = this.array as Float32Array;
    for (let i = 0; i < floats.length; i += this.componentCount) {
      if (this.componentCount == 2) {
        bb.expand(vec3.fromValues(floats[i], floats[i + 1], 0));
      }
      else {
        bb.expand(new vec3(floats.subarray(i, i + 3)));
      }
    }
    if (!bb.isFinite()) {
      console.log(`${bb}`);
    }
  }
}
