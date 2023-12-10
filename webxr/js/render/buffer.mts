import { ElementType } from '../buffer/buffersource.mjs';


const GL = WebGL2RenderingContext;


// ARRAY_BUFFER: 0x8892;
// ELEMENT_ARRAY_BUFFER: 0x8893;
// UNIFORM_BUFFER: 0x8A11;
export type BufferType = 0x8892 | 0x8893 | 0x8A11;

export class WglBuffer implements Disposable {
  buffer: WebGLBuffer;
  lastLength = 0;
  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly type: BufferType,
    public readonly componentType?: ElementType,
  ) {
    this.buffer = gl.createBuffer()!;
    if (!this.buffer) {
      throw new Error('createBuffer');
    }
  }

  [Symbol.dispose](): void {
    this.gl.deleteBuffer(this.buffer);
  }

  // static create(gl: WebGL2RenderingContext,
  //   type: BufferType,
  //   bytes: ArrayBuffer,
  //   componetType?: ElementType
  // ): WglBuffer {
  //   const buffer = new WglBuffer(gl, type, componetType);
  //   buffer.upload(bytes);
  //   return buffer;
  // }

  bind() {
    this.gl.bindBuffer(this.type, this.buffer);
  }

  unbind(gl: WebGL2RenderingContext) {
    gl.bindBuffer(this.type, null);
  }

  upload(bytes: ArrayBuffer) {
    const gl = this.gl;
    gl.bindBuffer(this.type, this.buffer);
    gl.bufferData(this.type, bytes, gl.STATIC_DRAW);
    gl.bindBuffer(this.type, null);
    this.lastLength = bytes.byteLength;
  }
  // updateRenderBuffer(
  //   gl: WebGL2RenderingContext, data: BufferSource, offset = 0) {
  //   this.bind(gl);
  //   if (offset == 0
  //     && data.array.byteOffset == 0
  //     && this._length == data.array.byteLength) {
  //     gl.bufferData(this.target, data.array, this.usage);
  //   } else {
  //     gl.bufferSubData(this.target, offset, data.array);
  //   }
  //   this.unbind(gl);
  // }
}
