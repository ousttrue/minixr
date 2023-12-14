import type { WglBuffer } from './buffer.mjs';
import type { DrawMode } from '../buffer/mesh.mjs';


const GL = WebGL2RenderingContext;


export type VertexAttribute = {
  name: string,
  buffer: WglBuffer,
  componentType: number,
  componentCount: number,
  bufferStride: number,
  bufferOffset: number,
}


export class WglVao implements Disposable {
  vao: WebGLVertexArrayObject;
  attributeBinds: string[] = [];
  constructor(
    public readonly gl: WebGL2RenderingContext,
    public readonly attributes: VertexAttribute[],
    public readonly indices?: WglBuffer,
    public readonly instances: VertexAttribute[] = [],
  ) {
    this.vao = gl.createVertexArray()!;
    if (!this.vao) {
      throw new Error('createVertexArray');
    }

    gl.bindVertexArray(this.vao);
    let location = 0
    for (let i = 0; i < attributes.length; ++i, ++location) {
      const a = attributes[i];
      // const location = program.attrib[a.name];
      gl.bindBuffer(GL.ARRAY_BUFFER, a.buffer.buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, a.componentCount, a.componentType, false,
        a.bufferStride, a.bufferOffset);
      gl.vertexAttribDivisor(location, 0)
      this.attributeBinds.push(a.name);
    }
    if (instances) {
      for (let i = 0; i < instances.length; ++i, ++location) {
        const a = instances[i];
        // const location = program.attrib[a.name];
        gl.bindBuffer(GL.ARRAY_BUFFER, a.buffer.buffer);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, a.componentCount, a.componentType, false,
          a.bufferStride, a.bufferOffset);
        gl.vertexAttribDivisor(location, 1)
        this.attributeBinds.push(a.name);
      }
    }
    console.log(this.attributeBinds);

    if (indices) {
      gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indices.buffer);
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(GL.ARRAY_BUFFER, null);
    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    for (let location = 0; location < attributes.length; ++location) {
      gl.disableVertexAttribArray(location);
    }
  }

  [Symbol.dispose](): void {
    this.gl.deleteVertexArray(this.vao);
  }

  bind() {
    this.gl.bindVertexArray(this.vao);
  }

  unbind() {
    this.gl.bindVertexArray(null);
  }

  draw(mode: DrawMode, count: number, offset: number = 0) {
    if (this.indices) {
      this.gl.drawElements(mode, count, this.indices.componentType!, offset);
    }
    else {
      this.gl.drawArrays(mode, offset, count);
    }
  }

  drawInstancing(mode: DrawMode, count: number, offset: number, instanceCount: number) {
    if (this.indices) {
      this.gl.drawElementsInstanced(mode, count,
        this.indices.componentType!, offset, instanceCount);
    } else {
      this.gl.drawArraysInstanced(mode, offset, count, instanceCount);
    }
  }
}
