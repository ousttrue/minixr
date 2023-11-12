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

import { Node } from '../nodes/node.mjs';
import { PbrMaterial } from '../materials/pbr.mjs';
import { ImageTexture, ColorTexture } from '../materials/texture.mjs';
import { Primitive, PrimitiveAttribute } from '../geometry/primitive.mjs';
import { vec3, quat, mat4, BoundingBox } from '../../math/gl-matrix.mjs';
import * as GLTF2 from './GLTF.js';

const GL = WebGLRenderingContext; // For enums

const GLB_MAGIC = 0x46546C67;
const CHUNK_TYPE = {
  JSON: 0x4E4F534A,
  BIN: 0x004E4942,
};

function isAbsoluteUri(uri: string): boolean {
  let absRegEx = new RegExp('^' + window.location.protocol, 'i');
  return !!uri.match(absRegEx);
}

function isDataUri(uri: string): boolean {
  let dataRegEx = /^data:/;
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
    default: throw new Error("unknown");
  }
}

function getItemSize(accessor: GLTF2.Accessor): number {
  return getComponentCount(accessor.type) * getTypeSize(accessor.componentType)
}

/**
 * Gltf2SceneLoader
 * Loads glTF 2.0 scenes into a renderable node tree.
 */

export class Gltf2Loader {
  constructor() {
  }

  async loadFromUrl(url: string): Promise<Node> {
    const response = await fetch(url);
    let i = url.lastIndexOf('/');
    let baseUrl = (i !== 0) ? url.substring(0, i + 1) : '';
    if (url.endsWith('.gltf')) {
      const json = await response.json();
      return await this.loadFromJson(json, baseUrl);
    } else if (url.endsWith('.glb')) {
      const arrayBuffer = await response.arrayBuffer()
      return await this.loadFromBinary(arrayBuffer, baseUrl);
    } else {
      throw new Error('Unrecognized file extension');
    }
  }

  async loadFromBinary(arrayBuffer: ArrayBuffer, baseUrl: string): Promise<Node> {
    let headerView = new DataView(arrayBuffer, 0, 12);
    let magic = headerView.getUint32(0, true);
    let version = headerView.getUint32(4, true);
    let length = headerView.getUint32(8, true);

    if (magic != GLB_MAGIC) {
      throw new Error('Invalid magic string in binary header.');
    }

    if (version != 2) {
      throw new Error('Incompatible version in binary header.');
    }

    let chunks: { [key: string]: Uint8Array } = {};
    let chunkOffset = 12;
    while (chunkOffset < length) {
      let chunkHeaderView = new DataView(arrayBuffer, chunkOffset, 8);
      let chunkLength = chunkHeaderView.getUint32(0, true);
      let chunkType = chunkHeaderView.getUint32(4, true);
      chunks[chunkType] = new Uint8Array(arrayBuffer).subarray(chunkOffset + 8, chunkOffset + 8 + chunkLength);
      chunkOffset += chunkLength + 8;
    }

    if (!chunks[CHUNK_TYPE.JSON]) {
      throw new Error('File contained no json chunk.');
    }

    let decoder = new TextDecoder('utf-8');
    let jsonString = decoder.decode(chunks[CHUNK_TYPE.JSON]);
    let json = JSON.parse(jsonString);
    return await this.loadFromJson(json, baseUrl, chunks[CHUNK_TYPE.BIN]);
  }

  async loadFromJson(json: GLTF2.GlTf, baseUrl: string, binaryChunk?: Uint8Array): Promise<Node> {
    if (!json.asset) {
      throw new Error('Missing asset description.');
    }

    if (json.asset.minVersion != '2.0' && json.asset.version != '2.0') {
      throw new Error('Incompatible asset version.');
    }

    let buffers = [];
    if (binaryChunk) {
      const gltfBuffer: GLTF2.Buffer = { byteLength: binaryChunk.byteLength };
      buffers[0] = new Gltf2Resource(gltfBuffer, baseUrl, binaryChunk);
    } else if (json.buffers) {
      for (let buffer of json.buffers) {
        buffers.push(new Gltf2Resource(buffer, baseUrl));
      }
    }

    let bufferViews: Gltf2BufferView[] = [];
    if (json.bufferViews) {
      for (let bufferView of json.bufferViews) {
        bufferViews.push(new Gltf2BufferView(bufferView, buffers));
      }
    }

    let images: Gltf2Resource[] = [];
    if (json.images) {
      for (let image of json.images) {
        images.push(new Gltf2Resource(image, baseUrl));
      }
    }

    let textures: ImageTexture[] = [];
    if (json.textures) {
      for (let texture of json.textures) {
        if (texture.source == null) {
          continue;
        }
        let image = images[texture.source];
        let glTexture = image.texture(bufferViews);
        if (texture.sampler != null) {
          //   let sampler = sampler[texture.sampler];
          //   glTexture.sampler.minFilter = sampler.minFilter;
          //   glTexture.sampler.magFilter = sampler.magFilter;
          //   glTexture.sampler.wrapS = sampler.wrapS;
          //   glTexture.sampler.wrapT = sampler.wrapT;
        }
        textures.push(glTexture);
      }
    }

    function getTexture(textureInfo: GLTF2.TextureInfo | GLTF2.MaterialNormalTextureInfo | undefined) {
      if (!textureInfo) {
        return null;
      }
      return textures[textureInfo.index];
    }

    let materials: PbrMaterial[] = [];
    if (json.materials) {
      for (let material of json.materials) {
        let glMaterial = new PbrMaterial();
        let pbr = material.pbrMetallicRoughness || {};

        glMaterial.baseColorFactor.value = pbr.baseColorFactor || [1, 1, 1, 1];
        glMaterial.baseColor.texture = getTexture(pbr.baseColorTexture);
        glMaterial.metallicRoughnessFactor.value = [
          pbr.metallicFactor || 1.0,
          pbr.roughnessFactor || 1.0,
        ];
        glMaterial.metallicRoughness.texture = getTexture(pbr.metallicRoughnessTexture);
        glMaterial.normal.texture = getTexture(material.normalTexture);
        glMaterial.occlusion.texture = getTexture(material.occlusionTexture);
        glMaterial.occlusionStrength.value = (material.occlusionTexture && material.occlusionTexture.strength) ?
          material.occlusionTexture.strength : 1.0;
        glMaterial.emissiveFactor.value = material.emissiveFactor || [0, 0, 0];
        glMaterial.emissive.texture = getTexture(material.emissiveTexture);
        if (glMaterial.emissive.texture == null && material.emissiveFactor) {
          glMaterial.emissive.texture = new ColorTexture(1.0, 1.0, 1.0, 1.0);
        }

        switch (material.alphaMode) {
          case 'BLEND':
            glMaterial.state.blend = true;
            break;
          case 'MASK':
            // Not really supported.
            glMaterial.state.blend = true;
            break;
          default: // Includes 'OPAQUE'
            glMaterial.state.blend = false;
        }

        // glMaterial.alpha_mode = material.alphaMode;
        // glMaterial.alpha_cutoff = material.alphaCutoff;
        glMaterial.state.cullFace = !(material.doubleSided);

        materials.push(glMaterial);
      }
    }

    let accessors: GLTF2.Accessor[] = json.accessors ?? [];

    let meshes: Gltf2Mesh[] = [];
    if (json.meshes) {
      for (let mesh of json.meshes) {
        let glMesh = new Gltf2Mesh();
        meshes.push(glMesh);

        for (let primitive of mesh.primitives) {
          let material = null;
          if (primitive.material != null) {
            material = materials[primitive.material];
          } else {
            // Create a "default" material if the primitive has none.
            material = new PbrMaterial();
          }

          let attributes = [];

          let min = null;
          let max = null;

          let vertexCount = 0;
          for (let name in primitive.attributes) {
            const accessor = accessors[primitive.attributes[name]];
            vertexCount = accessor.count;
            const bufferViewId = accessor.bufferView;
            if (bufferViewId == null) {
              continue;
            }
            const bufferView = bufferViews[bufferViewId];
            const bytes = await bufferView.dataViewAsync()
            let glAttribute = new PrimitiveAttribute(
              name,
              bytes,
              getComponentCount(accessor.type),
              accessor.componentType,
              bufferView.byteStride ?? 0,
              accessor.byteOffset ?? 0,
              accessor.normalized ?? false
            );

            if (name == 'POSITION') {
              min = accessor.min;
              max = accessor.max;
            }

            attributes.push(glAttribute);
          }

          let indexBuffer: Uint8Array | Uint16Array | Uint32Array | undefined = undefined;
          if (primitive.indices != null) {
            let accessor = accessors[primitive.indices];
            if (accessor.bufferView != null) {
              let bufferView = bufferViews[accessor.bufferView];
              const indexBytes = await bufferView.dataViewAsync();
              switch (accessor.componentType) {
                case GL.UNSIGNED_BYTE:
                  indexBuffer = new Uint8Array(indexBytes.buffer,
                    indexBytes.byteOffset + (accessor.byteOffset ?? 0)
                  ).subarray(0, accessor.count);
                  break;

                case GL.UNSIGNED_SHORT:
                  indexBuffer = new Uint16Array(indexBytes.buffer,
                    indexBytes.byteOffset + (accessor.byteOffset ?? 0)
                  ).subarray(0, accessor.count);
                  break;

                case GL.UNSIGNED_INT:
                  indexBuffer = new Uint32Array(indexBytes.buffer,
                    indexBytes.byteOffset + (accessor.byteOffset ?? 0)
                  ).subarray(0, accessor.count);
                  break;

                default:
                  throw new Error("unknown indices type");
              }
            }
          }

          let glPrimitive = new Primitive(
            material,
            attributes,
            vertexCount,
            indexBuffer, {
            mode: primitive.mode ?? GL.TRIANGLES
          });

          if (min && max) {
            glPrimitive.bb = new BoundingBox(
              vec3.fromValues(min[0], min[1], min[2]),
              vec3.fromValues(max[0], max[1], max[2]));
          }

          // After all the attributes have been processed, get a program that is
          // appropriate for both the material and the primitive attributes.
          glMesh.primitives.push(glPrimitive);
        }
      }
    }

    let sceneNode = new Node('gltf.scene');
    if (json.nodes && json.scenes) {
      let scene = json.scenes[json.scene ?? 0];
      if (scene.nodes) {
        for (let nodeId of scene.nodes) {
          let node = json.nodes[nodeId];
          sceneNode.addNode(
            this.processNodes(node, json.nodes, meshes));
        }
      }
    }

    return sceneNode;
  }

  processNodes(node: GLTF2.Node, nodes: GLTF2.Node[], meshes: Gltf2Mesh[]) {
    let glNode = new Node(node.name);

    if (node.mesh != null) {
      let mesh = meshes[node.mesh];
      for (let primitive of mesh.primitives) {
        glNode.primitives.push(primitive);
      }
    }

    if (node.matrix) {
      glNode.local.matrix = new mat4(new Float32Array(node.matrix));
    } else if (node.translation || node.rotation || node.scale) {
      if (node.translation) {
        glNode.local.translation = new vec3(new Float32Array(node.translation));
      }

      if (node.rotation) {
        glNode.local.rotation = new quat(new Float32Array(node.rotation));
      }

      if (node.scale) {
        glNode.local.scale = new vec3(new Float32Array(node.scale));
      }
    }

    if (node.children) {
      for (let nodeId of node.children) {
        let node = nodes[nodeId];
        glNode.addNode(this.processNodes(node, nodes, meshes));
      }
    }

    return glNode;
  }
}

class Gltf2Mesh {
  primitives: Primitive[] = [];
  constructor() {
  }
}

class Gltf2BufferView {
  buffer: Gltf2Resource;
  byteOffset: number;
  byteLength: number;
  byteStride: number;
  private _viewPromise: Promise<Uint8Array> | null = null;
  constructor(json: GLTF2.BufferView, buffers: Gltf2Resource[]) {
    this.buffer = buffers[json.buffer];
    this.byteLength = json.byteLength;
    this.byteOffset = json.byteOffset || 0;
    this.byteStride = json.byteStride || 0;
  }

  bytesAsync(): Promise<Uint8Array> {
    if (!this._viewPromise) {
      this._viewPromise = this.buffer.bytesAsync().then((data) => {
        if (data.byteLength < this.byteLength) {
          throw Error("not enugh byteLength");
        }
        return data.subarray(this.byteOffset, this.byteOffset + this.byteLength);
      });
    }
    return this._viewPromise;
  }

  async dataViewAsync(): Promise<DataView> {
    const data = await this.bytesAsync();
    return new DataView(data.buffer, data.byteOffset, data.byteLength);
  }
}

class Gltf2Resource {
  private _dataPromise: Promise<Uint8Array> | null = null;
  private _texture: ImageTexture | null = null;
  constructor(public json: GLTF2.Buffer, public baseUrl: string,
    data?: Uint8Array) {
    if (data) {
      this._dataPromise = Promise.resolve(data);
    }
  }

  async bytesAsync(): Promise<Uint8Array> {
    if (this._dataPromise) {
      return this._dataPromise;
    }

    if (!this.json.uri) {
      throw Error("no uri");
    }

    if (isDataUri(this.json.uri)) {
      // decode base64
      let base64String = this.json.uri.replace('data:application/octet-stream;base64,', '');
      let binaryArray = Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
      this._dataPromise = Promise.resolve(binaryArray);
      return await this._dataPromise;
    }

    this._dataPromise = fetch(resolveUri(this.json.uri, this.baseUrl))
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => new Uint8Array(arrayBuffer));
    return this._dataPromise;
  }

  async textureAsync(bufferViews: Gltf2BufferView[]): Promise<ImageTexture> {
    if (!this._texture) {
      let img = new Image();
      this._texture = new ImageTexture(img);
      if (this.json.uri) {
        if (isDataUri(this.json.uri)) {
          img.src = this.json.uri;
        } else {
          img.src = `${this.baseUrl}${this.json.uri}`;
        }
      } else {
        this._texture.genDataKey();
        let view = bufferViews[this.json.bufferView];
        const bytes = await view.bytesAsync();
        let blob = new Blob([bytes], { type: this.json.mimeType });
        img.src = window.URL.createObjectURL(blob);
      }
    }
    return this._texture;
  }
}
