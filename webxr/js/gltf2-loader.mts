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

import { PbrMaterial } from './materials/pbr.mjs';
import { Material } from './materials/material.mjs';
import { ImageTexture, ColorTexture } from './materials/texture.mjs';
import { Mesh, SubMesh, MeshVertexAttribute, Skin } from './buffer/mesh.mjs';
import { BufferSource } from './buffer/buffersource.mjs';
import type * as GLTF2 from './GLTF2.d.ts';
import { Glb } from './glb.mjs';
import { vec2, vec3, vec4, quat, mat4 } from './math/gl-matrix.mjs';

const GL = WebGLRenderingContext; // For enums

const DEFAULT_MATERIAL = new PbrMaterial('glTF-default-material')

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
    case 'MAT4': return 16;
    default: throw new Error(`unknown: ${type}`);
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

function hasSkinning(primitives: Mesh[]) {
  for (const primitive of primitives) {
    for (const attrib of primitive.attributes) {
      if (attrib.name == 'JOINTS_0') {
        return true;
      }
    }
  }
  return false;
}

function toInterleavedSubmesh(primitives: Mesh[],
  totalVertexCount: number, totalIndexCount: number): Mesh {

  // create interleaved vertex(POSITION + NORMAL + TEXCOORD_0)
  const components = 8;
  const stride = components * 4;
  const vertices = new BufferSource(
    components, new Float32Array(totalVertexCount * components));
  const indices = totalIndexCount > 0
    ? new Uint16Array(totalIndexCount)
    : null
    ;
  const attributes = [
    new MeshVertexAttribute(
      'POSITION',
      vertices,
      3,
      GL.FLOAT,
      stride,
      0,
      false
    ),
    new MeshVertexAttribute(
      'NORMAL',
      vertices,
      3,
      GL.FLOAT,
      stride,
      12,
      false
    ),
    new MeshVertexAttribute(
      'TEXCOORD_0',
      vertices,
      2,
      GL.FLOAT,
      stride,
      24,
      false
    ),
  ]
  if (hasSkinning(primitives)) {
    // joints(xyzw), weights(xyzw)
    const skinning = new BufferSource(
      8, new Float32Array(totalVertexCount * 8));
    attributes.push(new MeshVertexAttribute(
      'JOINTS_0',
      skinning,
      4,
      GL.FLOAT,
      32,
      0,
      false
    ));
    attributes.push(new MeshVertexAttribute(
      'WEIGHTS_0',
      skinning,
      4,
      GL.FLOAT,
      32,
      16,
      false
    ));
  }
  const mesh = new Mesh(attributes,
    totalVertexCount,
    primitives.map(x => new SubMesh(
      x.submeshes[0].material,
      x.submeshes[0].drawCount)),
    indices ? new BufferSource(1, indices) : undefined,
  );

  let vertexOffset = 0;
  let indexOffset = 0;
  for (const primitive of primitives) {
    for (const attr of primitive.attributes) {
      mesh.setVertices(vertexOffset, attr);
    }
    if (primitive.indices) {
      mesh.setIndices(vertexOffset, indexOffset, primitive.indices);
      indexOffset += primitive.indices.length;
    }
    vertexOffset += primitive.vertexCount;
    mesh.bb.expand(primitive.bb.min)
    mesh.bb.expand(primitive.bb.max)
  }

  return mesh;
}


/**
 * Gltf2SceneLoader
 * Loads glTF 2.0 scenes into a renderable node tree.
 */
export class Gltf2Loader {
  images: HTMLImageElement[] = [];
  textures: ImageTexture[] = [];
  materials: Material[] = [];
  meshes: Mesh[] = [];
  skins: Skin[] = [];
  urlBytesMap: { [key: string]: Uint8Array } = {}

  constructor(
    public readonly json: GLTF2.GlTf,
    public readonly data: {
      baseUrl?: string,
      binaryChunk?: Uint8Array,
    },
  ) {
    if (!json.asset) {
      throw new Error('Missing asset description.');
    }
    if (json.asset.minVersion != '2.0' && json.asset.version != '2.0') {
      throw new Error('Incompatible asset version.');
    }
  }

  static loadFromBinary(arrayBuffer: ArrayBuffer, baseUrl: string): Gltf2Loader {
    const glb = Glb.parse(arrayBuffer);
    return new Gltf2Loader(glb.json, { baseUrl, binaryChunk: glb.bin ?? undefined });
  }

  static async loadFromUrl(url: string): Promise<Gltf2Loader> {
    const response =
      (url.startsWith('http://') || url.startsWith('https://'))
        ? await fetch(url, { mode: "cors" })
        : await fetch(url)
      ;
    const i = url.lastIndexOf('/');
    const baseUrl = (i !== 0) ? url.substring(0, i + 1) : '';
    if (url.endsWith('.gltf')) {
      const json = await response.json();
      const loader = new Gltf2Loader(json, { baseUrl });
      await loader.load();
      return loader;
    } else if (url.endsWith('.glb')) {
      const arrayBuffer = await response.arrayBuffer()
      const loader = Gltf2Loader.loadFromBinary(arrayBuffer, baseUrl);
      await loader.load();
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
        if (this.data.baseUrl) {
          const response = await fetch(resolveUri(buffer.uri, this.data.baseUrl));
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          this.urlBytesMap[buffer.uri] = bytes;
          return bytes;
        }
        else {
          throw new Error("no baseUrl");
        }
      }
    }
    else if (this.data.binaryChunk) {
      return this.data.binaryChunk;
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

  async bufferSourceFromAccessor(accessor: GLTF2.Accessor):
    Promise<BufferSource> {
    if (!this.json.bufferViews) {
      throw new Error("no bufferViews");
    }
    if (accessor.bufferView == null) {
      throw new Error("not impl");
    }

    const bufferView = this.json.bufferViews[accessor.bufferView];
    if (bufferView.byteStride != null) {
      if (bufferView.byteStride != getItemSize(accessor)) {
        throw new Error("interleaved not impl");
      }
    }

    let bytes = await this._bytesFromBufferView(bufferView);
    bytes = bytes.subarray(accessor.byteOffset ?? 0);

    const componentCount = getComponentCount(accessor.type)

    switch (accessor.componentType) {
      case GL.FLOAT:
        return new BufferSource(componentCount, new Float32Array(
          bytes.buffer, bytes.byteOffset, accessor.count * componentCount
        ));

      case GL.UNSIGNED_BYTE:
        return new BufferSource(componentCount, new Uint8Array(
          bytes.buffer, bytes.byteOffset, accessor.count * componentCount
        ));

      case GL.UNSIGNED_SHORT:
        return new BufferSource(componentCount, new Uint16Array(
          bytes.buffer, bytes.byteOffset, accessor.count * componentCount
        ));

      case GL.UNSIGNED_INT:
        return new BufferSource(componentCount, new Uint32Array(
          bytes.buffer, bytes.byteOffset, accessor.count * componentCount
        ));

      default:
        throw new Error("not impl");
    }
  }

  private _getTexture(textureInfo?: GLTF2.TextureInfo | GLTF2.MaterialNormalTextureInfo): ImageTexture | null {
    if (!textureInfo) {
      return null;
    }
    return this.textures[textureInfo.index];
  }

  private async _primitiveAttributeFromAccessor(name: string, accessor: GLTF2.Accessor): Promise<MeshVertexAttribute> {
    const bufferSource = await this.bufferSourceFromAccessor(accessor);

    return new MeshVertexAttribute(
      name,
      bufferSource,
      getComponentCount(accessor.type),
      accessor.componentType,
      bufferSource.stride,
      0,
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
            image.src = `${this.data.baseUrl}${glImage.uri}`;
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
        await glTexture.waitForComplete();
        this.textures.push(glTexture);
      }
    }

    if (this.json.materials) {
      for (const glMaterial of this.json.materials) {
        const pbr = new PbrMaterial(glMaterial.name);
        const metallicROughness = glMaterial.pbrMetallicRoughness || {};

        pbr.setUniform('baseColorFactor',
          metallicROughness.baseColorFactor ?? [1, 1, 1, 1]);
        pbr.setTexture('baseColorTex', this._getTexture(metallicROughness.baseColorTexture));
        pbr.setUniform('metallicFactor', metallicROughness.metallicFactor ?? 1.0)
        pbr.setUniform('roughnessFactor', metallicROughness.roughnessFactor ?? 1.0)
        pbr.setTexture('metallicRoughnessTex', this._getTexture(metallicROughness.metallicRoughnessTexture));
        pbr.setTexture('normalTex', this._getTexture(glMaterial.normalTexture));
        pbr.setTexture('occlusionTex', this._getTexture(glMaterial.occlusionTexture));
        pbr.setUniform('occlusionStrength',
          (glMaterial.occlusionTexture && glMaterial.occlusionTexture.strength)
            ? glMaterial.occlusionTexture.strength
            : 1.0);
        pbr.setUniform('emissiveFactor', glMaterial.emissiveFactor ?? [0, 0, 0]);
        pbr.setTexture('emissiveTex', this._getTexture(glMaterial.emissiveTexture));
        if (!pbr._textureMap.emissive && glMaterial.emissiveFactor) {
          pbr.setTexture('emissiveTex', new ColorTexture(1.0, 1.0, 1.0, 1.0));
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

        const primitives: Mesh[] = []
        let totalVertexCount = 0;
        let totalIndexCount = 0;
        for (const glPrimitive of glMesh.primitives) {
          const material = (glPrimitive.material != null)
            ? this.materials[glPrimitive.material]
            // Create a "default" material if the primitive has none.
            : DEFAULT_MATERIAL;
          ;

          let min = null;
          let max = null;
          const attributes: MeshVertexAttribute[] = [];
          let vertexCount = 0;
          for (const name in glPrimitive.attributes) {
            if (!this.json.accessors) {
              throw new Error('no accessors');
            }
            const accessorIndex = glPrimitive.attributes[name];
            const accessor = this.json.accessors[accessorIndex];
            const attribute = await this._primitiveAttributeFromAccessor(name, accessor);
            // console.log(attribute.toString());
            if (name == 'POSITION') {
              min = accessor.min;
              max = accessor.max;
              vertexCount = accessor.count;
              totalVertexCount += vertexCount;
            }
            attributes.push(attribute);
            // if (name == 'WEIGHTS_0') {
            //   for (let i = 0; i < accessor.count; i += 4) {
            //     const w =
            //       attribute.source.array[i]
            //       + attribute.source.array[i + 1]
            //       + attribute.source.array[i + 2]
            //       + attribute.source.array[i + 3]
            //     console.log(i, w);
            //   }
            // }
            // if (name == 'JOINTS_0') {
            //   const nodeCount = this.json.nodes!.length;
            //   for (let i = 0; i < accessor.count; i += 4) {
            //     const x = attribute.source.array[i];
            //     if (x < 0 || x >= nodeCount) throw new Error("invalid joint");
            //     const y = attribute.source.array[i + 1];
            //     if (y < 0 || y >= nodeCount) throw new Error("invalid joint");
            //     const z = attribute.source.array[i + 2];
            //     if (z < 0 || z >= nodeCount) throw new Error("invalid joint");
            //     const w = attribute.source.array[i + 3];
            //     if (w < 0 || w >= nodeCount) throw new Error("invalid joint");
            //   }
            // }
          }

          const indexBuffer = await this._indexBufferFromAccessor(glPrimitive.indices);
          if (indexBuffer) {
            totalIndexCount += indexBuffer.length;
          }

          // material,
          const primitive = new Mesh(
            attributes,
            vertexCount,
            [new SubMesh(material,
              indexBuffer ? indexBuffer.length : vertexCount,
              glPrimitive.mode ?? GL.TRIANGLES,
            )],
            indexBuffer ? new BufferSource(1, indexBuffer) : undefined,
          );

          if (min && max) {
            primitive.bb.expand(vec3.fromValues(min[0], min[1], min[2]));
            primitive.bb.expand(vec3.fromValues(max[0], max[1], max[2]));
          }

          primitives.push(primitive);
        }

        const mesh = toInterleavedSubmesh(primitives,
          totalVertexCount, totalIndexCount);

        this.meshes.push(mesh);
      }
    }

    if (this.json.skins) {
      for (const glSkin of this.json.skins) {
        const accessor = this.json.accessors![glSkin.inverseBindMatrices!];
        const matrices = await this._primitiveAttributeFromAccessor('inverseBindMatrices', accessor);
        if (matrices.source.array instanceof Float32Array) {
          const skin = new Skin([...glSkin.joints],
            matrices.source.array, glSkin.skeleton);
          this.skins.push(skin);
        }
        else {
          throw new Error('invalid');
        }
      }
    }
  }
}