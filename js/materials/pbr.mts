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

import { Material, MaterialSampler, MaterialUniform, ProgramDefine } from './material.mjs';
import { ATTRIB_MASK } from '../geometry/primitive.mjs';
import { vec2, vec3, vec4 } from '../math/gl-matrix.mjs';

const VERTEX_SOURCE = `

uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;

in vec3 POSITION, NORMAL;
in vec2 TEXCOORD_0, TEXCOORD_1;

uniform vec3 CAMERA_POSITION;
uniform vec3 LIGHT_DIRECTION;

out vec3 vLight; // Vector from vertex to light.
out vec3 vView; // Vector from vertex to camera.
out vec2 vTex;

#ifdef USE_NORMAL_MAP
in vec4 TANGENT;
out mat3 vTBN;
#else
out vec3 vNorm;
#endif

#ifdef USE_VERTEX_COLOR
in vec4 COLOR_0;
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
  vec4 mPos = MODEL_MATRIX * vec4(POSITION, 1.0);
  vLight = -LIGHT_DIRECTION;
  vView = CAMERA_POSITION - mPos.xyz;
  gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * mPos;
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

export class PbrMaterial extends Material {
  baseColor: MaterialSampler;
  metallicRoughness: MaterialSampler;
  normal: MaterialSampler;
  occlusion: MaterialSampler;
  emissive: MaterialSampler;
  baseColorFactor: MaterialUniform;
  occlusionStrength: MaterialUniform;
  emissiveFactor: MaterialUniform;
  metallicRoughnessFactor: MaterialUniform;
  constructor() {
    super();

    this.baseColor = this.defineSampler('baseColorTex');
    this.metallicRoughness = this.defineSampler('metallicRoughnessTex');
    this.normal = this.defineSampler('normalTex');
    this.occlusion = this.defineSampler('occlusionTex');
    this.emissive = this.defineSampler('emissiveTex');

    this.baseColorFactor = this.defineUniform('baseColorFactor', vec4.fromValues(1.0, 1.0, 1.0, 1.0));
    this.metallicRoughnessFactor = this.defineUniform('metallicRoughnessFactor', vec2.fromValues(1.0, 1.0));
    this.occlusionStrength = this.defineUniform('occlusionStrength', 1.0);
    this.emissiveFactor = this.defineUniform('emissiveFactor', vec3.fromValues(0, 0, 0));
  }

  get materialName() {
    return 'PBR';
  }

  get vertexSource() {
    return VERTEX_SOURCE;
  }

  get fragmentSource() {
    return FRAGMENT_SOURCE;
  }

  getProgramDefines(attributeMask: number): ProgramDefine[] {
    const programDefines: ProgramDefine[] = [];

    if (attributeMask & ATTRIB_MASK.COLOR_0) {
      programDefines.push(['USE_VERTEX_COLOR', 1]);
    }

    if (attributeMask & ATTRIB_MASK.TEXCOORD_0) {
      if (this.baseColor.texture) {
        programDefines.push(['USE_BASE_COLOR_MAP', 1]);
      }

      if (this.normal.texture && (attributeMask & ATTRIB_MASK.TANGENT)) {
        programDefines.push(['USE_NORMAL_MAP', 1]);
      }

      if (this.metallicRoughness.texture) {
        programDefines.push(['USE_METAL_ROUGH_MAP', 1]);
      }

      if (this.occlusion.texture) {
        programDefines.push(['USE_OCCLUSION', 1]);
      }

      if (this.emissive.texture) {
        programDefines.push(['USE_EMISSIVE_TEXTURE', 1]);
      }
    }

    if ((!this.metallicRoughness.texture ||
      !(attributeMask & ATTRIB_MASK.TEXCOORD_0)) &&
      this.metallicRoughnessFactor.value[1] == 1.0) {
      programDefines.push(['FULLY_ROUGH', 1]);
    }

    // console.log(attributeMask, programDefines);
    return programDefines;
  }
}
