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
Node for displaying 2D or stereo videos on a quad.
*/

import { Material } from '../material.mjs';
import { Primitive, PrimitiveAttribute } from '../geometry/primitive.mjs';
import { Node } from '../node.mjs';
import { VideoTexture } from '../../render/texture.mjs';
import { vec3, BoundingBox } from '../../math/gl-matrix.mjs';

const GL = WebGLRenderingContext; // For enums

class VideoMaterial extends Material {
  constructor() {
    super();

    this.image = this.defineSampler('diffuse');

    this.texCoordScaleOffset = this.defineUniform('texCoordScaleOffset',
      [1.0, 1.0, 0.0, 0.0,
        1.0, 1.0, 0.0, 0.0], 4);
  }

  get materialName() {
    return 'VIDEO_PLAYER';
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
      vec4 out_vec = proj * view * model * vec4(POSITION, 1.0);
      return out_vec;
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

export class VideoNode extends Node {
  private _video: any;
  private _displayMode: any;
  private _video_texture: VideoTexture;
  constructor(options) {
    super();

    this._video = options.video;
    this._displayMode = options.displayMode || 'mono';

    this._video_texture = new VideoTexture(this._video);
  }

  get aspectRatio() {
    let width = this._video.videoWidth;
    let height = this._video.videoHeight;

    switch (this._displayMode) {
      case 'stereoTopBottom': height *= 0.5; break;
      case 'stereoLeftRight': width *= 0.5; break;
    }

    if (!height || !width) {
      return 1;
    }

    return width / height;
  }

  onRendererChanged() {
    let material = new VideoMaterial();
    material.image.texture = this._video_texture;

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

    let vertices = [
      -1.0, 1.0, 0.0, 0.0, 0.0,
      1.0, 1.0, 0.0, 1.0, 0.0,
      1.0, -1.0, 0.0, 1.0, 1.0,
      -1.0, -1.0, 0.0, 0.0, 1.0,
    ];
    let indices = [
      0, 2, 1,
      0, 3, 2,
    ];

    let vertexBuffer = new DataView(new Float32Array(vertices).buffer);
    let indexBuffer = new Uint16Array(indices);
    let attribs = [
      new PrimitiveAttribute('POSITION', vertexBuffer, 3, GL.FLOAT, 20, 0),
      new PrimitiveAttribute('TEXCOORD_0', vertexBuffer, 2, GL.FLOAT, 20, 12),
    ];
    let primitive = new Primitive(material, attribs, vertices.length / 5, indexBuffer);
    primitive.bb = new BoundingBox(
      vec3.fromValues(-1.0, -1.0, 0.00),
      vec3.fromValues(1.0, 1.0, 0.015));
    this.primitives.push(primitive);
  }
}
