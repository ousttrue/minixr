import { ATTRIB, ATTRIB_MASK, Primitive } from '../scene/geometry/primitive.mjs';
import { Program } from './program.mjs';

const GL = WebGLRenderingContext; // For enums


export class Vbo {
  buffer: WebGLBuffer;
  private _length: number;
  constructor(gl: WebGL2RenderingContext,
    public readonly target: number, src: DataView,
    public readonly usage: number = GL.STATIC_DRAW) {
    this.buffer = gl.createBuffer()!;
    this.bind(gl);
    const bytes = new Uint8Array(src.buffer, src.byteOffset, src.byteLength);
    gl.bufferData(this.target, bytes, this.usage);
    this.unbind(gl);
    this._length = src.byteLength;
  }

  updateRenderBuffer(gl: WebGL2RenderingContext, data: DataView, offset = 0) {
    this.bind(gl);
    if (offset == 0 && data.byteOffset == 0 && this._length == data.byteLength) {
      gl.bufferData(this.target, data.buffer, this.usage);
    } else {
      gl.bufferSubData(this.target, offset, data);
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
  constructor(
    public readonly indexBuffer: Vbo,
    public readonly indexType: number,
    public readonly indexCount: number) { }
}


export class Vao {
  private _vao: WebGLVertexArrayObject;
  vboMap: Map<DataView, Vbo> = new Map();
  private _indexBuffer: Vbo | null = null;
  private _indexType: number = 0;
  private _indexOffset: number = 0;
  private _mode: number = GL.TRIANGLES;
  private _drawCount: number = 0;

  constructor(
    gl: WebGL2RenderingContext,
    primitive: Primitive,
    public readonly program: Program,
    vboList: Vbo[],
    attributeMask: number,
    ibo?: Ibo) {

    this._mode = primitive.options?.mode ?? GL.TRIANGLES;

    // VAO
    this._vao = gl.createVertexArray()!;
    console.log('create', this._vao);
    gl.bindVertexArray(this._vao);

    // IBO
    if (ibo) {
      ibo.indexBuffer.bind(gl);
      this._indexBuffer = ibo.indexBuffer;
      this._indexType = ibo?.indexType;
      this._drawCount = ibo.indexCount;
    }
    else {
      this._drawCount = primitive.vertexCount;
    }

    // VBO
    for (let attrib in ATTRIB) {
      if (attributeMask & ATTRIB_MASK[attrib]) {
        gl.enableVertexAttribArray(ATTRIB[attrib]);
      } else {
        gl.disableVertexAttribArray(ATTRIB[attrib]);
      }
    }
    for (let i = 0; i < primitive.attributes.length; ++i) {
      const attrib = primitive.attributes[i];
      const buffer = vboList[i];
      this.vboMap.set(attrib.buffer, buffer);
      buffer.bind(gl);
      gl.vertexAttribPointer(
        ATTRIB[attrib.name], attrib.componentCount, attrib.componentType,
        attrib.normalized, attrib.stride, attrib.byteOffset);
    }

    // clear
    gl.bindVertexArray(null);
    gl.bindBuffer(GL.ARRAY_BUFFER, null);
    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
  }

  draw(gl: WebGL2RenderingContext) {
    gl.bindVertexArray(this._vao);

    if (this._indexBuffer) {
      gl.drawElements(this._mode, this._drawCount,
        this._indexType, this._indexOffset);
    } else {
      gl.drawArrays(this._mode, 0, this._drawCount);
    }

    gl.getError();

    gl.bindVertexArray(null);
  }
}
