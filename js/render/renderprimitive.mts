import { ATTRIB, ATTRIB_MASK, Buffer, PrimitiveAttribute, Primitive } from '../scene/geometry/primitive.mjs';
import { vec3, BoundingBox } from '../math/gl-matrix.mjs';
import { RenderMaterial } from './rendermaterial.mjs';

const GL = WebGLRenderingContext; // For enums


export class RenderBuffer {
  private _target: any;
  private _usage: any;
  private _length: number;
  private _buffer: any;
  private _promise: Promise<Awaited<this>>;
  constructor(private readonly _gl: WebGL2RenderingContex,
    target, usage, buffer, length = 0) {
    this._target = target;
    this._usage = usage;
    this._length = length;
    if (buffer instanceof Promise) {
      this._buffer = null;
      this._promise = buffer.then((buffer) => {
        this._buffer = buffer;
        return this;
      });
    } else {
      this._buffer = buffer;
      this._promise = Promise.resolve(this);
    }
  }

  waitForComplete() {
    return this._promise;
  }

  updateRenderBuffer(data: ArrayBuffer, offset = 0) {
    if (this._buffer) {
      let gl = this._gl;
      gl.bindBuffer(this._target, this._buffer);
      if (offset == 0 && this._length == data.byteLength) {
        gl.bufferData(this._target, data, this._usage);
      } else {
        gl.bufferSubData(this._target, offset, data);
      }
    } else {
      this.waitForComplete().then((_) => {
        this.updateRenderBuffer(data, offset);
      });
    }
  }
}


class RenderPrimitiveAttribute {
  _attrib_index: number;
  _componentCount: number;
  _componentType: number;
  _stride: number;
  _byteOffset: number;
  _normalized: boolean;
  constructor(primitiveAttribute: PrimitiveAttribute) {
    this._attrib_index = ATTRIB[primitiveAttribute.name];
    this._componentCount = primitiveAttribute.componentCount;
    this._componentType = primitiveAttribute.componentType;
    this._stride = primitiveAttribute.stride;
    this._byteOffset = primitiveAttribute.byteOffset;
    this._normalized = primitiveAttribute.normalized;
  }
}


class RenderPrimitiveAttributeBuffer {
  _attributes: RenderPrimitiveAttribute[];
  constructor(
    public readonly _buffer: RenderBuffer) {
    this._attributes = [];
  }
}


export class Vao {
  _activeFrameId: number;
  _instances: Node[];
  private _mode: any;
  private _elementCount: any;
  private _promise: null;
  private _vao: null;
  private _complete: boolean;
  private _attributeBuffers: RenderPrimitiveAttributeBuffer[];
  private _bb = new BoundingBox();
  private _indexBuffer: RenderBuffer | null = null;
  private _indexByteOffset = 0;
  private _indexType = 0;

  constructor(
    private readonly _gl: WebGL2RenderingContext,
    primitive: Primitive,
    public readonly material: RenderMaterial,
    private _attributeMask: number) {
    this._activeFrameId = 0;
    this._instances = [];

    this._mode = primitive.mode;
    this._elementCount = primitive.elementCount;
    this._promise = null;
    this._vao = null;
    this._complete = false;
    this._attributeBuffers = [];

    for (let attribute of primitive.attributes) {
      let renderAttribute = new RenderPrimitiveAttribute(attribute);
      let foundBuffer = false;
      const buffer = this._createRenderBuffer(attribute.buffer);
      for (let attributeBuffer of this._attributeBuffers) {
        if (attributeBuffer._buffer == buffer) {
          attributeBuffer._attributes.push(renderAttribute);
          foundBuffer = true;
          break;
        }
      }
      if (!foundBuffer) {
        let attributeBuffer = new RenderPrimitiveAttributeBuffer(buffer);
        attributeBuffer._attributes.push(renderAttribute);
        this._attributeBuffers.push(attributeBuffer);
      }
    }

    if (primitive.indexBuffer) {
      this._indexBuffer = this._createRenderBuffer(primitive.indexBuffer);
      this._indexByteOffset = primitive.indexByteOffset;
      this._indexType = primitive.indexType;
    }

    this._bb = primitive.bb.copy();

    this._promise = null;
    this._complete = false;

    this.waitForComplete(); // To flip the _complete flag.
  }

  _createRenderBuffer(buffer: Buffer) {
    let gl = this._gl;
    let glBuffer = gl.createBuffer();

    if (buffer.data instanceof Promise) {
      let renderBuffer = new RenderBuffer(gl, buffer.target, buffer.usage, buffer.data.then((data) => {
        gl.bindBuffer(buffer.target, glBuffer);
        gl.bufferData(buffer.target, data, buffer.usage);
        renderBuffer._length = data.byteLength;
        return glBuffer;
      }));
      return renderBuffer;
    } else {
      gl.bindBuffer(buffer.target, glBuffer);
      gl.bufferData(buffer.target, buffer.data, buffer.usage);
      return new RenderBuffer(gl, buffer.target, buffer.usage, glBuffer, buffer.data.byteLength);
    }
  }

  markActive(frameId: number) {
    if (this._complete && this._activeFrameId != frameId) {
      if (this.material) {
        if (!this.material.markActive(frameId)) {
          return;
        }
      }
      this._activeFrameId = frameId;
    }
  }

  get samplers() {
    return this.material._samplerDictionary;
  }

  get uniforms() {
    return this.material._uniform_dictionary;
  }

  waitForComplete() {
    if (!this._promise) {
      if (!this.material) {
        return Promise.reject('RenderPrimitive does not have a material');
      }

      let completionPromises = [];

      for (let attributeBuffer of this._attributeBuffers) {
        if (!attributeBuffer._buffer._buffer) {
          completionPromises.push(attributeBuffer._buffer._promise);
        }
      }

      if (this._indexBuffer && !this._indexBuffer._buffer) {
        completionPromises.push(this._indexBuffer._promise);
      }

      this._promise = Promise.all(completionPromises).then(() => {
        this._complete = true;
        return this;
      });
    }
    return this._promise;
  }

  bindPrimitive(gl: WebGL2RenderingContext) {
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
      gl.bindBuffer(gl.ARRAY_BUFFER, attributeBuffer._buffer._buffer);
      for (let attrib of attributeBuffer._attributes) {
        gl.vertexAttribPointer(
          attrib._attrib_index, attrib._componentCount, attrib._componentType,
          attrib._normalized, attrib._stride, attrib._byteOffset);
      }
    }

    if (this._indexBuffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer._buffer);
    } else {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
  }
}
