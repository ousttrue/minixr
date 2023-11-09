import { vec3, BoundingBox } from '../../math/gl-matrix.mjs';
import { ATTRIB, ATTRIB_MASK } from './material.mjs';
import { Primitive } from './primitive.mjs';
import { RenderMaterial } from './rendermaterial.mjs';


class RenderPrimitiveAttribute {
  constructor(primitiveAttribute) {
    this._attrib_index = ATTRIB[primitiveAttribute.name];
    this._componentCount = primitiveAttribute.componentCount;
    this._componentType = primitiveAttribute.componentType;
    this._stride = primitiveAttribute.stride;
    this._byteOffset = primitiveAttribute.byteOffset;
    this._normalized = primitiveAttribute.normalized;
  }
}


class RenderPrimitiveAttributeBuffer {
  constructor(buffer) {
    this._buffer = buffer;
    this._attributes = [];
  }
}


export class RenderPrimitive {
  _activeFrameId: number;
  _instances: Node[];
  private _material: RenderMaterial;
  private _mode: any;
  private _elementCount: any;
  private _promise: null;
  private _vao: null;
  private _complete: boolean;
  private _attributeBuffers: never[];
  private _attributeMask: number;
  private _bb = new BoundingBox();
  private _indexBuffer: RenderBuffer | null = null;

  constructor(primitive: Primitive) {
    this._activeFrameId = 0;
    this._instances = [];
    this._material = null;
    this.setPrimitive(primitive);
  }

  setPrimitive(primitive: Primitive) {
    this._mode = primitive.mode;
    this._elementCount = primitive.elementCount;
    this._promise = null;
    this._vao = null;
    this._complete = false;
    this._attributeBuffers = [];
    this._attributeMask = 0;

    for (let attribute of primitive.attributes) {
      this._attributeMask |= ATTRIB_MASK[attribute.name];
      let renderAttribute = new RenderPrimitiveAttribute(attribute);
      let foundBuffer = false;
      for (let attributeBuffer of this._attributeBuffers) {
        if (attributeBuffer._buffer == attribute.buffer) {
          attributeBuffer._attributes.push(renderAttribute);
          foundBuffer = true;
          break;
        }
      }
      if (!foundBuffer) {
        let attributeBuffer = new RenderPrimitiveAttributeBuffer(attribute.buffer);
        attributeBuffer._attributes.push(renderAttribute);
        this._attributeBuffers.push(attributeBuffer);
      }
    }

    this._indexBuffer = null;
    this._indexByteOffset = 0;
    this._indexType = 0;

    if (primitive.indexBuffer) {
      this._indexByteOffset = primitive.indexByteOffset;
      this._indexType = primitive.indexType;
      this._indexBuffer = primitive.indexBuffer;
    }

    this._bb = primitive.bb.copy();

    if (this._material != null) {
      this.waitForComplete(); // To flip the _complete flag.
    }
  }

  setRenderMaterial(material?: RenderMaterial) {
    this._material = material;
    this._promise = null;
    this._complete = false;

    if (this._material != null) {
      this.waitForComplete(); // To flip the _complete flag.
    }
  }

  markActive(frameId: number) {
    if (this._complete && this._activeFrameId != frameId) {
      if (this._material) {
        if (!this._material.markActive(frameId)) {
          return;
        }
      }
      this._activeFrameId = frameId;
    }
  }

  get samplers() {
    return this._material._samplerDictionary;
  }

  get uniforms() {
    return this._material._uniform_dictionary;
  }

  waitForComplete() {
    if (!this._promise) {
      if (!this._material) {
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

  bindPrimitive(gl: WebGL2RenderingContext, attribMask) {
    // If the active attributes have changed then update the active set.
    if (attribMask != this._attributeMask) {
      for (let attrib in ATTRIB) {
        if (this._attributeMask & ATTRIB_MASK[attrib]) {
          gl.enableVertexAttribArray(ATTRIB[attrib]);
        } else {
          gl.disableVertexAttribArray(ATTRIB[attrib]);
        }
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
