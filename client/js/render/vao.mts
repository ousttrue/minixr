import { Primitive } from '../../../lib/buffer/primitive.mjs';
import { BufferSource } from '../../../lib/buffer/buffersource.mjs';
import { Program } from './program.mjs';

const GL = WebGLRenderingContext; // For enums


export class Vbo {
  buffer: WebGLBuffer;
  private _length: number;
  constructor(gl: WebGL2RenderingContext,
    public readonly target: number, src: BufferSource,
    public readonly usage: number = GL.STATIC_DRAW) {
    this.buffer = gl.createBuffer()!;
    this.bind(gl);
    gl.bufferData(this.target, src.array, this.usage);
    this.unbind(gl);
    this._length = src.array.byteLength;
  }

  updateRenderBuffer(
    gl: WebGL2RenderingContext, data: BufferSource, offset = 0) {
    this.bind(gl);
    if (offset == 0
      && data.array.byteOffset == 0
      && this._length == data.array.byteLength) {
      gl.bufferData(this.target, data.array, this.usage);
    } else {
      gl.bufferSubData(this.target, offset, data.array);
    }
    this.unbind(gl);
  }

  bind(gl: WebGL2RenderingContext) {
    gl.bindBuffer(this.target, this.buffer);
  }
  unbind(gl: WebGL2RenderingContext) {
    gl.bindBuffer(this.target, null);
  }
}


export class Ibo {
  public readonly indexType: number;
  public readonly indexCount: number;
  constructor(
    public readonly indexBuffer: Vbo,
    indices: BufferSource,
  ) {
    this.indexCount = indices.array.length;
    this.indexType = indices.glType;
  }
}


export class Vao {
  private _vao: WebGLVertexArrayObject;
  vboMap: Map<BufferSource, Vbo> = new Map();
  private _indexBuffer: Vbo | null = null;
  private _indexType: number = 0;
  private _indexOffset: number = 0;
  private _mode: number = GL.TRIANGLES;

  constructor(
    gl: WebGL2RenderingContext,
    program: Program,
    primitive: Primitive,
    vboList: Vbo[],
    public readonly ibo?: Ibo,
    instanceList: Vbo[] = []) {

    this._mode = primitive.options?.mode ?? GL.TRIANGLES;

    // VAO
    this._vao = gl.createVertexArray()!;
    // console.log('create', this._vao);
    gl.bindVertexArray(this._vao);

    // VBO
    for (let i = 0; i < primitive.attributes.length; ++i) {
      const attrib = primitive.attributes[i];
      const buffer = vboList[i];
      this.vboMap.set(attrib.source, buffer);
      const location = program.attrib[attrib.name];
      if (location == null) {
        // console.warn(attrib);
      }
      else {
        gl.enableVertexAttribArray(location);
        buffer.bind(gl);
        gl.vertexAttribPointer(
          location, attrib.componentCount, attrib.componentType,
          attrib.normalized, attrib.stride, attrib.byteOffset);
        gl.vertexAttribDivisor(location, 0)
      }
    }

    // IBO
    if (ibo) {
      ibo.indexBuffer.bind(gl);
      this._indexBuffer = ibo.indexBuffer;
      this._indexType = ibo.indexType;
    }

    for (let i = 0; i < instanceList.length; ++i) {
      const attrib = primitive.options?.instanceAttributes![i]!;
      const buffer = instanceList[i]!;
      this.vboMap.set(attrib.source, buffer);
      const location = program.attrib[attrib.name];
      if (location == null) {
        console.warn(attrib);
      }
      else {
        gl.enableVertexAttribArray(location);
        buffer.bind(gl);
        gl.vertexAttribPointer(
          location, attrib.componentCount, attrib.componentType,
          attrib.normalized, attrib.stride, attrib.byteOffset);
        gl.vertexAttribDivisor(location, 1)
      }
    }

    // clear
    gl.bindVertexArray(null);
    gl.bindBuffer(GL.ARRAY_BUFFER, null);
    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
    for (let i = 0; i < (primitive.attributes.length + instanceList.length); ++i) {
      gl.disableVertexAttribArray(i);
    }
  }

  bind(gl: WebGL2RenderingContext) {
    gl.bindVertexArray(this._vao);
  }

  draw(gl: WebGL2RenderingContext, drawCount: number, instanceCount: number = 0) {
    if (instanceCount > 0) {
      if (this._indexBuffer) {
        gl.drawElementsInstanced(this._mode, drawCount,
          this._indexType, this._indexOffset, instanceCount);
      } else {
        gl.drawArraysInstanced(this._mode, 0, drawCount, instanceCount);
      }
    }
    else {
      if (this._indexBuffer) {
        gl.drawElements(this._mode, drawCount,
          this._indexType, this._indexOffset);
      } else {
        gl.drawArrays(this._mode, 0, drawCount);
      }
    }
  }
}
