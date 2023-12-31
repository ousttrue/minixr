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

/*
Node for displaying 360 equirect images as a skybox.
*/

import { Material, RENDER_ORDER } from '../material.mjs';
import { Primitive, PrimitiveAttribute } from '../geometry/mesh.mjs';
import { Node } from '../node.mjs';
import { UrlTexture } from '../../render/texture.mjs';

const GL = WebGLRenderingContext; // For enums

class SkyboxMaterial extends Material {
  constructor() {
    super();
    this.renderOrder = RENDER_ORDER.SKY;
    this.state.depthFunc = GL.LEQUAL;
    this.state.depthMask = false;

    this.image = this.defineSampler('diffuse');

    this.texCoordScaleOffset = this.defineUniform('texCoordScaleOffset',
      [1.0, 1.0, 0.0, 0.0,
        1.0, 1.0, 0.0, 0.0], 4);
  }

  get materialName() {
    return 'SKYBOX';
  }

  get vertexSource() {
    return `
    uniform int EYE_INDEX;
    uniform vec4 texCoordScaleOffset[2];
    attribute vec3 POSITION;
    attribute vec2 TEXCOORD_0;
    varying vec2 vTexCoord;

    vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
      vec4 scaleOffset = texCoordScaleOffset[EYE_INDEX];
      vTexCoord = (TEXCOORD_0 * scaleOffset.xy) + scaleOffset.zw;
      // Drop the translation portion of the view matrix
      view[3].xyz = vec3(0.0, 0.0, 0.0);
      vec4 out_vec = proj * view * model * vec4(POSITION, 1.0);

      // Returning the W component for both Z and W forces the geometry depth to
      // the far plane. When combined with a depth func of LEQUAL this makes the
      // sky write to any depth fragment that has not been written to yet.
      return out_vec.xyww;
    }`;
  }

  get fragmentSource() {
    return `
    uniform sampler2D diffuse;
    varying vec2 vTexCoord;

    vec4 fragment_main() {
      return texture2D(diffuse, vTexCoord);
    }`;
  }
}

export class SkyboxNode extends Node {
  constructor(options) {
    super();

    this._url = options.url;
    this._displayMode = options.displayMode || 'mono';
    this._rotationY = options.rotationY || 0;
  }

  onRendererChanged(renderer) {
    let material = new SkyboxMaterial();
    material.image.texture = new UrlTexture(this._url);

    switch (this._displayMode) {
      case 'mono':
        material.texCoordScaleOffset.value = [1.0, 1.0, 0.0, 0.0,
          1.0, 1.0, 0.0, 0.0];
        break;
      case 'stereoTopBottom':
        material.texCoordScaleOffset.value = [1.0, 0.5, 0.0, 0.0,
          1.0, 0.5, 0.0, 0.5];
        break;
      case 'stereoLeftRight':
        material.texCoordScaleOffset.value = [0.5, 1.0, 0.0, 0.0,
          0.5, 1.0, 0.5, 0.0];
        break;
    }

    let vertices = [];
    let indices = [];

    let latSegments = 40;
    let lonSegments = 40;

    // Create the vertices/indices
    for (let i = 0; i <= latSegments; ++i) {
      let theta = i * Math.PI / latSegments;
      let sinTheta = Math.sin(theta);
      let cosTheta = Math.cos(theta);

      let idxOffsetA = i * (lonSegments + 1);
      let idxOffsetB = (i + 1) * (lonSegments + 1);

      for (let j = 0; j <= lonSegments; ++j) {
        let phi = (j * 2 * Math.PI / lonSegments) + this._rotationY;
        let x = Math.sin(phi) * sinTheta;
        let y = cosTheta;
        let z = -Math.cos(phi) * sinTheta;
        let u = (j / lonSegments);
        let v = (i / latSegments);

        // Vertex shader will force the geometry to the far plane, so the
        // radius of the sphere is immaterial.
        vertices.push(x, y, z, u, v);

        if (i < latSegments && j < lonSegments) {
          let idxA = idxOffsetA + j;
          let idxB = idxOffsetB + j;

          indices.push(idxA, idxB, idxA + 1,
            idxB, idxB + 1, idxA + 1);
        }
      }
    }

    let vertexBuffer = new DataView(new Float32Array(vertices).buffer);
    let attribs = [
      new PrimitiveAttribute('POSITION', vertexBuffer, 3, GL.FLOAT, 20, 0),
      new PrimitiveAttribute('TEXCOORD_0', vertexBuffer, 2, GL.FLOAT, 20, 12),
    ];
    let indexBuffer = new Uint16Array(indices);
    let primitive = new Primitive(material, attribs, vertices.length / 5, indexBuffer);
    let renderPrimitive = renderer.createRenderPrimitive(primitive);
    this.primitives.push(renderPrimitive);
  }
}
