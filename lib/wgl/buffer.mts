const GL = WebGL2RenderingContext;


export type ElementType = GL.UNSIGNED_BYTE | GL.UNSIGNED_SHORT | GL.UNSIGNED_INT;


export class WglBuffer implements Disposable {
  buffer: WebGLBuffer;
  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly type = GL.ARRAY_BUFFER,
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

  static create(gl: WebGL2RenderingContext,
    type: (GL.ARRAY_BUFFER | GL.ELEMENT_ARRAY_BUFFER),
    bytes: ArrayBuffer,
    componetType?: ElementType
  ): WglBuffer {
    const buffer = new WglBuffer(gl, type, componetType);
    buffer.upload(bytes);
    return buffer;
  }

  bind() {
    this.gl.bindBuffer(this.type, this.buffer);
  }

  upload(bytes: ArrayBuffer) {
    const gl = this.gl;
    gl.bindBuffer(this.type, this.buffer);
    gl.bufferData(this.type, bytes, gl.STATIC_DRAW);
    gl.bindBuffer(this.type, null);
  }
}
