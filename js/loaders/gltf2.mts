// Copyright 2018 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { PbrMaterial } from '../materials/pbr.mjs';
import { ImageTexture, ColorTexture } from '../materials/texture.mjs';
import { Primitive, PrimitiveAttribute } from '../geometry/primitive.mjs';
import * as GLTF2 from './GLTF.js';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { vec3, quat, mat4, Transform } from '../math/gl-matrix.mjs';

const GL = WebGLRenderingContext; // For enums

const GLB_MAGIC = 0x46546C67;
const CHUNK_TYPE = {
  JSON: 0x4E4F534A,
  BIN: 0x004E4942,
};

type IndexBuffer = Uint8Array | Uint16Array | Uint32Array;

function isAbsoluteUri(uri: string): boolean {
  const absRegEx = new RegExp('^' + window.location.protocol, 'i');
  return !!uri.match(absRegEx);
}

function isDataUri(uri: string): boolean {
  const dataRegEx = /^data:/;
  return !!uri.match(dataRegEx);
}

function resolveUri(uri: string, baseUrl: string): string {
  if (isAbsoluteUri(uri) || isDataUri(uri)) {
    return uri;
  }
  return baseUrl + uri;
}

function getComponentCount(type: string): number {
  switch (type) {
    case 'SCALAR': return 1;
    case 'VEC2': return 2;
    case 'VEC3': return 3;
    case 'VEC4': return 4;
    default: throw new Error("unknown");
  }
}

function getTypeSize(type: number): number {
  switch (type) {
    case GL.UNSIGNED_SHORT: return 2;
    case GL.FLOAT: return 4;
    default: throw new Error("unknown");
  }
}

function getItemSize(accessor: GLTF2.Accessor): number {
  return getComponentCount(accessor.type) * getTypeSize(accessor.componentType)
}

class Gltf2Mesh {
  primitives: Primitive[] = [];
  constructor() {
  }
}


/**
 * Gltf2SceneLoader
 * Loads glTF 2.0 scenes into a renderable node tree.
 */
export class Gltf2Loader {
  images: HTMLImageElement[] = [];
  textures: ImageTexture[] = [];
  materials: PbrMaterial[] = [];
  meshes: Gltf2Mesh[] = [];
  urlBytesMap: { [key: string]: Uint8Array } = {}

  constructor(
    public readonly json: GLTF2.GlTf,
    public readonly baseUrl: string,
    public readonly binaryChunk?: Uint8Array) {

    if (!json.asset) {
      throw new Error('Missing asset description.');
    }
    if (json.asset.minVersion != '2.0' && json.asset.version != '2.0') {
      throw new Error('Incompatible asset version.');
    }
  }

  static loadFromBinary(arrayBuffer: ArrayBuffer, baseUrl: string): Gltf2Loader {
    const headerView = new DataView(arrayBuffer, 0, 12);
    const magic = headerView.getUint32(0, true);
    const version = headerView.getUint32(4, true);
    const length = headerView.getUint32(8, true);

    if (magic != GLB_MAGIC) {
      throw new Error('Invalid magic string in binary header.');
    }

    if (version != 2) {
      throw new Error('Incompatible version in binary header.');
    }

    const chunks: { [key: string]: Uint8Array } = {};
    let chunkOffset = 12;
    while (chunkOffset < length) {
      const chunkHeaderView = new DataView(arrayBuffer, chunkOffset, 8);
      const chunkLength = chunkHeaderView.getUint32(0, true);
      const chunkType = chunkHeaderView.getUint32(4, true);
      chunks[chunkType] = new Uint8Array(arrayBuffer).subarray(chunkOffset + 8, chunkOffset + 8 + chunkLength);
      chunkOffset += chunkLength + 8;
    }

    if (!chunks[CHUNK_TYPE.JSON]) {
      throw new Error('File contained no json chunk.');
    }

    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(chunks[CHUNK_TYPE.JSON]);
    const json = JSON.parse(jsonString);
    return new Gltf2Loader(json, baseUrl, chunks[CHUNK_TYPE.BIN]);
  }

  static async loadFromUrl(world: World, url: string): Promise<Gltf2Loader> {
    const response = await fetch(url);
    const i = url.lastIndexOf('/');
    const baseUrl = (i !== 0) ? url.substring(0, i + 1) : '';
    if (url.endsWith('.gltf')) {
      const json = await response.json();
      const loader = new Gltf2Loader(json, baseUrl);
      await loader.load();
      loader.build(world);
      return loader;
    } else if (url.endsWith('.glb')) {
      const arrayBuffer = await response.arrayBuffer()
      const loader = Gltf2Loader.loadFromBinary(arrayBuffer, baseUrl);
      await loader.load();
      loader.build(world);
      return loader;
    } else {
      throw new Error('Unrecognized file extension');
    }
  }

  private async _bytesFromBuffer(buffer: GLTF2.Buffer): Promise<Uint8Array> {
    if (buffer.uri) {
      const bytes = this.urlBytesMap[buffer.uri];
      if (bytes) {
        return bytes;
      }
      if (isDataUri(buffer.uri)) {
        // decode base64
        const base64String = this.json.uri.replace('data:application/octet-stream;base64,', '');
        const bytes = Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
        this.urlBytesMap[buffer.uri] = bytes;
        return bytes;
      }
      else {
        const response = await fetch(resolveUri(buffer.uri, this.baseUrl));
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        this.urlBytesMap[buffer.uri] = bytes;
        return bytes;
      }
    }
    else if (this.binaryChunk) {
      return this.binaryChunk;
    }
    else {
      throw new Error("invalid buffer");
    }
  }

  private async _bytesFromBufferView(bufferView: GLTF2.BufferView): Promise<Uint8Array> {
    if (!this.json.buffers) {
      throw new Error("no buffers");
    }
    const buffer = this.json.buffers[bufferView.buffer];
    const bytes = await this._bytesFromBuffer(buffer);
    const offset = bufferView.byteOffset ?? 0;
    return bytes.subarray(offset, offset + buffer.byteLength);
  }

  private _getTexture(textureInfo?: GLTF2.TextureInfo | GLTF2.MaterialNormalTextureInfo): ImageTexture | null {
    if (!textureInfo) {
      return null;
    }
    return this.textures[textureInfo.index];
  }

  private async _primitiveAttributeFromAccessor(name: string, accessorIndex: number): Promise<PrimitiveAttribute> {
    if (!this.json.accessors) {
      throw new Error('no accessors');
    }
    const accessor = this.json.accessors[accessorIndex];
    if (accessor.bufferView == null) {
      // spare ?
      throw new Error('no bufferViewId');
    }
    if (!this.json.bufferViews) {
      throw new Error('no bufferViews');
    }
    const bufferView = this.json.bufferViews[accessor.bufferView];
    const bytes = await this._bytesFromBufferView(bufferView);
    return new PrimitiveAttribute(
      name,
      new DataView(bytes.buffer,
        bytes.byteOffset + (accessor.byteOffset ?? 0),
        accessor.count * getItemSize(accessor)),
      getComponentCount(accessor.type),
      accessor.componentType,
      bufferView.byteStride ?? 0,
      accessor.byteOffset ?? 0,
      accessor.normalized ?? false
    );
  }

  private async _indexBufferFromAccessor(accessorIndex?: number): Promise<IndexBuffer | undefined> {
    if (accessorIndex == null) {
      return Promise.resolve(undefined);
    }
    if (!this.json.accessors) {
      throw new Error("no accessors");
    }

    let accessor = this.json.accessors[accessorIndex];
    if (accessor.bufferView != null && this.json.bufferViews) {
      const bufferView = this.json.bufferViews[accessor.bufferView];
      const indexBytes = await this._bytesFromBufferView(bufferView);
      switch (accessor.componentType) {
        case GL.UNSIGNED_BYTE:
          return new Uint8Array(indexBytes.buffer,
            indexBytes.byteOffset + (accessor.byteOffset ?? 0)
          ).subarray(0, accessor.count);

        case GL.UNSIGNED_SHORT:
          return new Uint16Array(indexBytes.buffer,
            indexBytes.byteOffset + (accessor.byteOffset ?? 0)
          ).subarray(0, accessor.count);

        case GL.UNSIGNED_INT:
          return new Uint32Array(indexBytes.buffer,
            indexBytes.byteOffset + (accessor.byteOffset ?? 0)
          ).subarray(0, accessor.count);

        default:
          throw new Error("unknown indices type");
      }
    }
    else {
      throw new Error("accessor.bufferView==null");
    }
  }

  async load(): Promise<void> {

    if (this.json.images) {
      for (let glImage of this.json.images) {
        // images.push(new Gltf2Resource(image, baseUrl));
        const image = new Image();
        if (glImage.uri) {
          if (isDataUri(glImage.uri)) {
            image.src = glImage.uri;
          } else {
            image.src = `${this.baseUrl}${glImage.uri}`;
          }
        } else if (glImage.bufferView != null && this.json.bufferViews) {
          // this._texture.genDataKey();
          // let view = bufferViews[this.json.bufferView];
          const bufferView = this.json.bufferViews[glImage.bufferView];
          const bytes = await this._bytesFromBufferView(bufferView);
          // const bytes = await view.bytesAsync();
          const blob = new Blob([bytes], { type: glImage.mimeType });
          image.src = window.URL.createObjectURL(blob);
        }
        this.images.push(image);
      }
    }

    if (this.json.textures) {
      for (let texture of this.json.textures) {
        if (texture.source == null) {
          throw new Error("invalid texture");
        }
        let image = this.images[texture.source];
        const glTexture = new ImageTexture(image);
        if (texture.sampler != null && this.json.samplers) {
          const sampler = this.json.samplers[texture.sampler];
          glTexture.sampler.minFilter = sampler.minFilter!;
          glTexture.sampler.magFilter = sampler.magFilter!;
          glTexture.sampler.wrapS = sampler.wrapS!;
          glTexture.sampler.wrapT = sampler.wrapT!;
        }
        this.textures.push(glTexture);
      }
    }

    if (this.json.materials) {
      for (const glMaterial of this.json.materials) {
        const pbr = new PbrMaterial();
        const metallicROughness = glMaterial.pbrMetallicRoughness || {};

        pbr.baseColorFactor.value = metallicROughness.baseColorFactor || [1, 1, 1, 1];
        pbr.baseColor.texture = this._getTexture(metallicROughness.baseColorTexture);
        pbr.metallicRoughnessFactor.value = [
          metallicROughness.metallicFactor || 1.0,
          metallicROughness.roughnessFactor || 1.0,
        ];
        pbr.metallicRoughness.texture = this._getTexture(metallicROughness.metallicRoughnessTexture);
        pbr.normal.texture = this._getTexture(glMaterial.normalTexture);
        pbr.occlusion.texture = this._getTexture(glMaterial.occlusionTexture);
        pbr.occlusionStrength.value = (glMaterial.occlusionTexture && glMaterial.occlusionTexture.strength) ?
          glMaterial.occlusionTexture.strength : 1.0;
        pbr.emissiveFactor.value = glMaterial.emissiveFactor || [0, 0, 0];
        pbr.emissive.texture = this._getTexture(glMaterial.emissiveTexture);
        if (pbr.emissive.texture == null && glMaterial.emissiveFactor) {
          pbr.emissive.texture = new ColorTexture(1.0, 1.0, 1.0, 1.0);
        }

        switch (glMaterial.alphaMode) {
          case 'BLEND':
            pbr.state.blend = true;
            break;
          case 'MASK':
            // Not really supported.
            pbr.state.blend = true;
            break;
          default: // Includes 'OPAQUE'
            pbr.state.blend = false;
        }

        // glMaterial.alpha_mode = material.alphaMode;
        // glMaterial.alpha_cutoff = material.alphaCutoff;
        pbr.state.cullFace = !(glMaterial.doubleSided);

        this.materials.push(pbr);
      }
    }

    if (this.json.meshes) {
      for (const glMesh of this.json.meshes) {
        const mesh = new Gltf2Mesh();
        this.meshes.push(mesh);

        for (const glPrimitive of glMesh.primitives) {
          const material = (glPrimitive.material != null)
            ? this.materials[glPrimitive.material]
            // Create a "default" material if the primitive has none.
            : new PbrMaterial();
          ;

          // TODO:
          // determine shader defines by material & primitive combination 
          // const attributeMask = primitive.getAttributeMask();
          // getProgramDefines(attributeMask);
          // getAttributeMask(): number {
          //   let attributeMask = 0;
          //   for (let attribute of this.attributes) {
          //     attributeMask |= ATTRIB_MASK[attribute.name];
          //   }
          //   return attributeMask;
          // }

          // let min = null;
          // let max = null;

          const attributes: PrimitiveAttribute[] = [];
          let vertexCount = 0;
          for (const name in glPrimitive.attributes) {
            const attribute = await this._primitiveAttributeFromAccessor(name, glPrimitive.attributes[name]);

            // if (name == 'POSITION') {
            //   min = accessor.min;
            //   max = accessor.max;
            // }

            attributes.push(attribute);
          }

          const indexBuffer = await this._indexBufferFromAccessor(glPrimitive.indices);

          const primitive = new Primitive(
            material,
            attributes,
            // TODO:
            vertexCount,
            indexBuffer, { mode: glPrimitive.mode ?? GL.TRIANGLES });

          // if (min && max) {
          //   glPrimitive.bb = new BoundingBox(
          //     vec3.fromValues(min[0], min[1], min[2]),
          //     vec3.fromValues(max[0], max[1], max[2]));
          // }

          // After all the attributes have been processed, get a program that is
          // appropriate for both the material and the primitive attributes.
          mesh.primitives.push(primitive);
        }
      }
    }
  }

  build(world: World) {
    // const sceneNode = new Node('gltf.scene');
    if (this.json.nodes && this.json.scenes) {
      const scene = this.json.scenes[this.json.scene ?? 0];
      if (scene.nodes) {
        for (const nodeId of scene.nodes) {
          const glNode = this.json.nodes[nodeId];
          this._processNodes(world, glNode);
        }
      }
    }
  }

  private _processNodes(world: World, glNode: GLTF2.Node, parent?: Transform) {
    const transform = new Transform();
    // if (glNode.matrix) {
    //   transform.matrix = new mat4(new Float32Array(glNode.matrix));
    // } else if (glNode.translation || glNode.rotation || glNode.scale) {
    //   if (glNode.translation) {
    //     transform.translation = new vec3(new Float32Array(glNode.translation));
    //   }
    //
    //   if (glNode.rotation) {
    //     transform.rotation = new quat(new Float32Array(glNode.rotation));
    //   }
    //
    //   if (glNode.scale) {
    //     transform.scale = new vec3(new Float32Array(glNode.scale));
    //   }
    // }

    let prims = 0;
    if (glNode.mesh != null) {
      const mesh = this.meshes[glNode.mesh];
      for (const primitive of mesh.primitives) {

        world.create(transform, primitive);
        ++prims;
      }
    }

    if (glNode.children && this.json.nodes) {
      for (const nodeId of glNode.children) {
        const glChildNode = this.json.nodes[nodeId];
        this._processNodes(world, glChildNode, transform);
      }
    }
  }
}
