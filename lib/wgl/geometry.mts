import type { WglBuffer, ElementType } from './buffer.mjs';


const GL = WebGL2RenderingContext;


export type VertexAttribute = {
  name: string,
  buffer: WglBuffer,
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
    indices?: WglBuffer) {
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
