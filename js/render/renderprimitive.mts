import { ATTRIB, ATTRIB_MASK, PrimitiveAttribute, Primitive } from '../scene/geometry/primitive.mjs';
import { RenderMaterial } from './rendermaterial.mjs';

const GL = WebGLRenderingContext; // For enums


class RenderBuffer {
  buffer: WebGLBuffer;
  private _length: number;
  constructor(gl: WebGL2RenderingContext,
    public readonly target: number, src: Uint8Array,
    public readonly usage: number = GL.STATIC_DRAW) {
    this.buffer = gl.createBuffer()!;
    this.bind(gl);
    gl.bufferData(this.target, src, this.usage);
    this.unbind(gl);
    this._length = src.byteLength;
  }

  updateRenderBuffer(gl: WebGL2RenderingContext, data: ArrayBuffer, offset = 0) {
    this.bind(gl);
    if (offset == 0 && this._length == data.byteLength) {
      gl.bufferData(this.target, data, this.usage);
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


export class Vao {
  private _vao: WebGLVertexArrayObject;
  private _attributes: PrimitiveAttribute[] = [];
  private _buffers: RenderBuffer[] = [];
  private _indexBuffer: RenderBuffer | null = null;
  private _indexType: number = 0;
  private _indexOffset: number = 0;
  private _mode: number = GL.TRIANGLES;
  private _drawCount: number = 0;

  constructor(
    gl: WebGL2RenderingContext,
    primitive: Primitive,
    public readonly material: RenderMaterial,
    private _attributeMask: number) {

    // VBO
    for (let attribute of primitive.attributes) {
      this._attributes.push(attribute);
      const buffer = new RenderBuffer(gl, GL.ARRAY_BUFFER,
        attribute.buffer,
        primitive.options?.attributesUsage ?? GL.STATIC_DRAW);
      this._buffers.push(buffer);
    }

    // IBO
    if (primitive.indices) {
      this._indexBuffer = new RenderBuffer(gl, GL.ELEMENT_ARRAY_BUFFER,
        new Uint8Array(primitive.indices),
        primitive.options?.indicesUsage ?? GL.STATIC_DRAW);
      if (primitive.indices instanceof Uint16Array) {
        this._indexType = GL.UNSIGNED_SHORT;
      }
      else if (primitive.indices instanceof Uint8Array) {
        this._indexType = GL.UNSIGNED_BYTE;
      }
      else if (primitive.indices instanceof Uint32Array) {
        this._indexType = GL.UNSIGNED_INT;
      }
      else {
        throw new Error("unknown");
      }
      this._drawCount = primitive.indices.length;
    }
    else {
      this._drawCount = primitive.vertexCount;
    }
    this._mode = primitive.options?.mode ?? GL.TRIANGLES;

    // VAO
    this._vao = gl.createVertexArray()!;
    gl.bindVertexArray(this._vao);

    // If the active attributes have changed then update the active set.
    for (let attrib in ATTRIB) {
      if (this._attributeMask & ATTRIB_MASK[attrib]) {
        gl.enableVertexAttribArray(ATTRIB[attrib]);
      } else {
        gl.disableVertexAttribArray(ATTRIB[attrib]);
      }
    }

    // Bind the primitive attributes and indices.
    for (let attributeBuffer of this._attributeBuffers) {
      attributeBuffer._buffer.bind(gl);
      for (let attrib of attributeBuffer._attributes) {
        gl.vertexAttribPointer(
          attrib._attrib_index, attrib._componentCount, attrib._componentType,
          attrib._normalized, attrib._stride, attrib._byteOffset);
      }
    }

    if (this._indexBuffer) {
      this._indexBuffer.bind(gl);
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(GL.ARRAY_BUFFER, null);
    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, null);
  }

  draw(gl: WebGL2RenderingContext) {
    gl.bindVertexArray(this._vao);

    if (this._indexBuffer) {
      gl.drawElements(GL.TRIANGLES, this._drawCount,
        this._indexType, this._indexOffset);
    } else {
      gl.drawArrays(GL.TRIANGLES, 0, this._drawCount);
    }

    gl.getError();

    gl.bindVertexArray(null);
  }
}
