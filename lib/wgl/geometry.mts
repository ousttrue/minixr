const GL = WebGL2RenderingContext;


type ElementType = GL.UNSIGNED_BYTE | GL.UNSIGNED_SHORT | GL.UNSIGNED_INT;


export class Buffer implements Disposable {
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
  ): Buffer {
    const buffer = new Buffer(gl, type, componetType);
    buffer.upload(bytes);
    return buffer;
  }

  upload(bytes: ArrayBuffer) {
    const gl = this.gl;
    gl.bindBuffer(this.type, this.buffer);
    gl.bufferData(this.type, bytes, gl.STATIC_DRAW);
    gl.bindBuffer(this.type, null);
  }
}


export type VertexAttribute = {
  name: string,
  buffer: Buffer,
  componentType: number,
  componentCount: number,
  bufferStride: number,
  bufferOffset: number,
}


export class Vao implements Disposable {
  vao: WebGLVertexArrayObject;
  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly elementType?: ElementType,
  ) {
    this.vao = gl.createVertexArray()!;
    if (!this.vao) {
      throw new Error('createVertexArray');
    }
  }

  [Symbol.dispose](): void {
    this.gl.deleteVertexArray(this.vao);
  }

  static create(gl: WebGL2RenderingContext,
    attributes: VertexAttribute[],
    indices?: Buffer) {
    const vao = new Vao(gl, indices?.componentType);
    gl.bindVertexArray(vao.vao);
    let location = 0;
    for (const a of attributes) {
      gl.bindBuffer(GL.ARRAY_BUFFER, a.buffer.buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, a.componentCount, a.componentType, false,
        a.bufferStride, a.bufferOffset);
      ++location;
    }

    if (indices) {
      gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indices.buffer);
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(GL.ARRAY_BUFFER, null);
    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    return vao;
  }

  bind() {
    this.gl.bindVertexArray(this.vao);
  }

  unbind() {
    this.gl.bindVertexArray(null);
  }

  draw(count: number, offset: number = 0) {
    if (this.elementType) {
      this.gl.drawElements(GL.TRIANGLES, count, this.elementType, offset);
    }
    else {
      this.gl.drawArrays(GL.TRIANGLES, offset, count);
    }
  }
}
