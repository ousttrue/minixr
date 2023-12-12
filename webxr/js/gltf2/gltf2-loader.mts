import type * as GLTF2 from './GLTF2.d.ts';
import { Glb } from './glb.mjs';
import { Material, ProgramDefine, Texture } from '../materials/material.mjs';
import { Mesh, SubMesh, MeshVertexAttribute, Skin } from '../buffer/mesh.mjs';
import { BufferSource } from '../buffer/buffersource.mjs';
import { vec2, vec3, vec4 } from '../math/gl-matrix.mjs';


const GL = WebGLRenderingContext; // For enums


const VERTEX_SOURCE = `

in vec3 POSITION;
in vec3 NORMAL;
in vec2 TEXCOORD_0;
#ifdef USE_NORMAL_MAP
in vec4 TANGENT;
#endif
#ifdef USE_VERTEX_COLOR
in vec4 COLOR_0;
#endif

#ifdef USE_SKIN
in vec4 sJoints;
in vec4 sWeights;

layout (std140) uniform uSkinning {
  mat4 uSkin[256];
};

vec3 skinning(vec3 position)
{
  vec3 p = vec3(0,0,0);
  p+=(uSkin[int(sJoints.x)] * vec4(position,1)).xyz * sWeights.x;
  p+=(uSkin[int(sJoints.y)] * vec4(position,1)).xyz * sWeights.y;
  p+=(uSkin[int(sJoints.z)] * vec4(position,1)).xyz * sWeights.z;
  p+=(uSkin[int(sJoints.w)] * vec4(position,1)).xyz * sWeights.w;
  return p;
}
vec3 getPosition(vec3 position){
  return skinning(position);
}
#else
vec3 getPosition(vec3 position){
  return position;
}
#endif

uniform vec3 CAMERA_POSITION;
uniform vec3 LIGHT_DIRECTION;

out vec3 vLight; // Vector from vertex to light.
out vec3 vView; // Vector from vertex to camera.
out vec2 vTex;

#ifdef USE_NORMAL_MAP
out mat3 vTBN;
#else
out vec3 vNorm;
#endif

#ifdef USE_VERTEX_COLOR
out vec4 vCol;
#endif

void main() {
  vec3 n = normalize(vec3(MODEL_MATRIX * vec4(NORMAL, 0.0)));
#ifdef USE_NORMAL_MAP
  vec3 t = normalize(vec3(MODEL_MATRIX * vec4(TANGENT.xyz, 0.0)));
  vec3 b = cross(n, t) * TANGENT.w;
  vTBN = mat3(t, b, n);
#else
  vNorm = n;
#endif

#ifdef USE_VERTEX_COLOR
  vCol = COLOR_0;
#endif

  vTex = TEXCOORD_0;
  vec4 mPos = MODEL_MATRIX * vec4(getPosition(POSITION), 1.0);
  vLight = -LIGHT_DIRECTION;
  vView = CAMERA_POSITION - mPos.xyz;
  gl_Position = ViewProjection() * mPos;
}`;

// These equations are borrowed with love from this docs from Epic because I
// just don't have anything novel to bring to the PBR scene.
// http://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf
const EPIC_PBR_FUNCTIONS = `
vec3 lambertDiffuse(vec3 cDiff) {
  return cDiff / M_PI;
}

float specD(float a, float nDotH) {
  float aSqr = a * a;
  float f = ((nDotH * nDotH) * (aSqr - 1.0) + 1.0);
  return aSqr / (M_PI * f * f);
}

float specG(float roughness, float nDotL, float nDotV) {
  float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
  float gl = nDotL / (nDotL * (1.0 - k) + k);
  float gv = nDotV / (nDotV * (1.0 - k) + k);
  return gl * gv;
}

vec3 specF(float vDotH, vec3 F0) {
  float exponent = (-5.55473 * vDotH - 6.98316) * vDotH;
  float base = 2.0;
  return F0 + (1.0 - F0) * pow(base, exponent);
}`;

const FRAGMENT_SOURCE = `
precision mediump float;
#define M_PI 3.14159265
out vec4 _Color;

uniform vec4 baseColorFactor;
#ifdef USE_BASE_COLOR_MAP
uniform sampler2D baseColorTex;
#endif

in vec3 vLight;
in vec3 vView;
in vec2 vTex;

#ifdef USE_VERTEX_COLOR
in vec4 vCol;
#endif

#ifdef USE_NORMAL_MAP
uniform sampler2D normalTex;
in mat3 vTBN;
#else
in vec3 vNorm;
#endif

#ifdef USE_METAL_ROUGH_MAP
uniform sampler2D metallicRoughnessTex;
#endif
uniform vec2 metallicRoughnessFactor;

#ifdef USE_OCCLUSION
uniform sampler2D occlusionTex;
uniform float occlusionStrength;
#endif

#ifdef USE_EMISSIVE_TEXTURE
uniform sampler2D emissiveTex;
#endif
uniform vec3 emissiveFactor;

uniform vec3 LIGHT_COLOR;

const vec3 dielectricSpec = vec3(0.04);
const vec3 black = vec3(0.0);

${EPIC_PBR_FUNCTIONS}

void main() {
#ifdef USE_BASE_COLOR_MAP
  vec4 baseColor = texture(baseColorTex, vTex) * baseColorFactor;
#else
  vec4 baseColor = baseColorFactor;
#endif

#ifdef USE_VERTEX_COLOR
  baseColor *= vCol;
#endif

#ifdef USE_NORMAL_MAP
  vec3 n = texture(normalTex, vTex).rgb;
  n = normalize(vTBN * (2.0 * n - 1.0));
#else
  vec3 n = normalize(vNorm);
#endif

#ifdef FULLY_ROUGH
  float metallic = 0.0;
#else
  float metallic = metallicRoughnessFactor.x;
#endif

  float roughness = metallicRoughnessFactor.y;

#ifdef USE_METAL_ROUGH_MAP
  vec4 metallicRoughness = texture(metallicRoughnessTex, vTex);
  metallic *= metallicRoughness.b;
  roughness *= metallicRoughness.g;
#endif
  
  vec3 l = normalize(vLight);
  vec3 v = normalize(vView);
  vec3 h = normalize(l+v);

  float nDotL = clamp(dot(n, l), 0.001, 1.0);
  float nDotV = abs(dot(n, v)) + 0.001;
  float nDotH = max(dot(n, h), 0.0);
  float vDotH = max(dot(v, h), 0.0);

  // From GLTF Spec
  vec3 cDiff = mix(baseColor.rgb * (1.0 - dielectricSpec.r), black, metallic); // Diffuse color
  vec3 F0 = mix(dielectricSpec, baseColor.rgb, metallic); // Specular color
  float a = roughness * roughness;

#ifdef FULLY_ROUGH
  vec3 specular = F0 * 0.45;
#else
  vec3 F = specF(vDotH, F0);
  float D = specD(a, nDotH);
  float G = specG(roughness, nDotL, nDotV);
  vec3 specular = (D * F * G) / (4.0 * nDotL * nDotV);
#endif
  float halfLambert = dot(n, l) * 0.5 + 0.5;
  halfLambert *= halfLambert;

  vec3 color = (halfLambert * LIGHT_COLOR * lambertDiffuse(cDiff)) + specular;

#ifdef USE_OCCLUSION
  float occlusion = texture(occlusionTex, vTex).r;
  color = mix(color, color * occlusion, occlusionStrength);
#endif
  
  vec3 emissive = emissiveFactor;
#ifdef USE_EMISSIVE_TEXTURE
  emissive *= texture(emissiveTex, vTex).rgb;
#endif
  color += emissive;

  // gamma correction
  //color = pow(color, vec3(1.0/2.2));

  _Color = vec4(color, baseColor.a);
}`;


const PbrShader = {
  name: 'PBR',

  vertexSource: VERTEX_SOURCE,

  fragmentSource: FRAGMENT_SOURCE,

  uniforms: [
    ['baseColorFactor', vec4.fromValues(1.0, 1.0, 1.0, 1.0)],
    ['metallicRoughnessFactor', vec2.fromValues(1.0, 1.0)],
    ['occlusionStrength', 1.0],
    ['emissiveFactor', vec3.fromValues(0, 0, 0)],
  ],
}

export class PbrMaterial extends Material {
  constructor(name: string, defines: ProgramDefine[] = []) {
    super(name, PbrShader);
    for (const define of defines) {
      this.defines.push(define)
    }
  }
}


const DEFAULT_MATERIAL = new PbrMaterial('glTF-default-material')

type IndexBuffer = Uint8Array | Uint16Array | Uint32Array;


function isDataUri(uri: string): boolean {
  const dataRegEx = /^data:/;
  return !!uri.match(dataRegEx);
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


function hasAttribute(primitives: Mesh[], name: string) {
  return primitives.some(
    primitive => primitive.attributes.some(x => x.name == name));
}

function toInterleavedSubmesh(primitives: Mesh[],
  totalVertexCount: number, totalIndexCount: number): Mesh {

  // create interleaved vertex(POSITION + NORMAL + TEXCOORD_0 + (TANGENT) + (COLOR_0))
  const hasColorVertex = hasAttribute(primitives, 'COLOR_0');
  const hasTangent = hasAttribute(primitives, 'TANGENT');
  const components = hasColorVertex ? 16 : 12;
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
  let offset = 32;
  if (hasTangent) {
    attributes.push(
      new MeshVertexAttribute(
        'TANGENT',
        vertices,
        4,
        GL.FLOAT,
        stride,
        offset,
        false
      ))
    offset += 16
  }
  if (hasColorVertex) {
    attributes.push(
      new MeshVertexAttribute(
        'COLOR_0',
        vertices,
        4,
        GL.FLOAT,
        stride,
        offset,
        false
      ),
    )
    offset += 16
  }
  if (hasAttribute(primitives, 'JOINTS_0')) {
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

function getProgramDefines(material: GLTF2.Material): ProgramDefine[] {
  const programDefines: ProgramDefine[] = [];

  if (material.normalTexture) {
    programDefines.push(['USE_NORMAL_MAP', 1]);
  }

  const pbr = material.pbrMetallicRoughness
  if (pbr) {
    if (pbr.baseColorTexture) {
      programDefines.push(['USE_BASE_COLOR_MAP', 1]);
    }
    if (pbr.metallicRoughnessTexture) {
      programDefines.push(['USE_METAL_ROUGH_MAP', 1]);
    }
  }

  if (material.occlusionTexture) {
    programDefines.push(['USE_OCCLUSION', 1]);
  }

  if (material.emissiveTexture) {
    programDefines.push(['USE_EMISSIVE_TEXTURE', 1]);
  }

  if (pbr && pbr.metallicRoughnessTexture) {
  }
  else {
    if (pbr?.roughnessFactor == 1.0) {
      programDefines.push(['FULLY_ROUGH', 1]);
    }
  }

  // console.log(attributeMask, programDefines);
  return programDefines;
}


class UrlFileSystem {
  constructor(public readonly baseUrl: string) { }

  async get(uri: string): Promise<ArrayBuffer> {
    const response = await fetch(this.baseUrl + uri);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  }
}


/**
 * Gltf2SceneLoader
 * Loads glTF 2.0 scenes into a renderable node tree.
 */
export class Gltf2Loader {
  images: HTMLImageElement[] = [];
  textures: Texture[] = [];
  materials: Material[] = [];
  meshes: Mesh[] = [];
  skins: Skin[] = [];
  urlBytesMap: Map<string, Uint8Array> = new Map();

  constructor(
    public readonly json: GLTF2.GlTf,
    public readonly data: {
      binaryChunk?: Uint8Array,
      fileSystem?: UrlFileSystem,
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
    return new Gltf2Loader(glb.json, {
      binaryChunk: glb.bin ?? undefined,
      fileSystem: new UrlFileSystem(baseUrl),
    });
  }

  static async loadFromUrl(url: string): Promise<Gltf2Loader> {
    console.log(url);
    const response =
      (url.startsWith('http://') || url.startsWith('https://'))
        ? await fetch(url, { mode: "cors" })
        : await fetch(url)
      ;
    const i = url.lastIndexOf('/');
    const baseUrl = (i !== 0) ? url.substring(0, i + 1) : '';
    if (url.endsWith('.gltf')) {
      const json = await response.json();
      const loader = new Gltf2Loader(json, {
        fileSystem: new UrlFileSystem(baseUrl),
      });
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
      const bytes = this.urlBytesMap.get(buffer.uri);
      if (bytes) {
        return bytes;
      }

      if (isDataUri(buffer.uri)) {
        // decode base64
        const base64String = buffer.uri.replace('data:application/octet-stream;base64,', '');
        const bytes = Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
        this.urlBytesMap.set(buffer.uri, bytes);
        return bytes;
      }
      else {
        if (!this.data.fileSystem) {
          throw new Error("no fileSystem");
        }

        const arrayBuffer = await this.data.fileSystem.get(buffer.uri);
        const bytes = new Uint8Array(arrayBuffer);
        this.urlBytesMap.set(buffer.uri, bytes);
        return bytes;
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

  private _getTexture(
    textureInfo?: GLTF2.TextureInfo | GLTF2.MaterialNormalTextureInfo): Texture | null {
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
        const image = new Image();
        if (glImage.uri) {
          if (isDataUri(glImage.uri)) {
            image.src = glImage.uri;
          } else {
            if (!this.data.fileSystem) {
              throw new Error("no fileSystem");
            }
            image.src = `${this.data.fileSystem.baseUrl}${glImage.uri}`;
          }
        } else if (glImage.bufferView != null) {
          if (!this.json.bufferViews) {
            throw new Error("no bufferViews");
          }
          const bufferView = this.json.bufferViews[glImage.bufferView];
          const bytes = await this._bytesFromBufferView(bufferView);
          const blob = new Blob([bytes], { type: glImage.mimeType });
          image.src = window.URL.createObjectURL(blob);
        }
        this.images.push(image);
      }
    }

    if (this.json.textures) {
      for (let glTexture of this.json.textures) {
        if (glTexture.source == null) {
          throw new Error("invalid texture");
        }
        let image = this.images[glTexture.source];
        const texture = new Texture(image,
          glTexture.sampler != null
            ? this.json.samplers![glTexture.sampler]
            : undefined,
        );
        this.textures.push(texture);
      }
    }

    if (this.json.materials) {
      for (const glMaterial of this.json.materials) {
        const defines = getProgramDefines(glMaterial);
        const pbr = new PbrMaterial(glMaterial.name, defines);
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
        // if (!pbr._textureMap.emissive && glMaterial.emissiveFactor) {
        //   pbr.setTexture('emissiveTex', new ColorTexture(1.0, 1.0, 1.0, 1.0));
        // }

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
              // @ts-ignore
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

        if (mesh.attributes.some(x => x.name == 'COLOR_0')) {
          mesh.defines.push(['USE_VERTEX_COLOR', 1]);
        }

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
