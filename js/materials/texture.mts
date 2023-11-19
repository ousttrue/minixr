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

const GL = WebGLRenderingContext; // For enums

let nextDataTextureIndex = 0;

export class TextureSampler {
  minFilter = null;
  magFilter = null;
  wrapS = null;
  wrapT = null;
  constructor() {
  }
}

export class Texture {
  sampler: TextureSampler;
  mipmap: boolean;
  constructor() {
    this.sampler = new TextureSampler();
    this.mipmap = true;
    // TODO: Anisotropy
  }

  get format() {
    return GL.RGBA;
  }

  get width() {
    return 0;
  }

  get height() {
    return 0;
  }

  get textureKey() {
    return null;
  }
}

export class ImageTexture extends Texture {
  _imgBitmap: ImageBitmap | null = null;
  _manualKey: string | null = null;
  _promise: Promise<ImageTexture>;
  constructor(private _img: any) {
    super();

    if (_img.src && _img.complete) {
      if (_img.naturalWidth) {
        this._promise = this._finishImage();
      } else {
        this._promise = Promise.reject('Image provided had failed to load.');
      }
    } else {
      this._promise = new Promise((resolve, reject) => {
        _img.addEventListener('load', () => resolve(this._finishImage()));
        _img.addEventListener('error', reject);
      });
    }
  }

  async _finishImage(): Promise<ImageTexture> {
    if (window.createImageBitmap) {
      const imgBitmap = await window.createImageBitmap(this._img);
      this._imgBitmap = imgBitmap;
      return await Promise.resolve(this);
    }
    return Promise.resolve(this);
  }

  get format() {
    // TODO: Can be RGB in some cases.
    return GL.RGBA;
  }

  get width() {
    return this._img.width;
  }

  get height() {
    return this._img.height;
  }

  waitForComplete() {
    return this._promise;
  }

  get textureKey() {
    return this._manualKey || this._img.src;
  }

  get source() {
    return this._imgBitmap || this._img;
  }

  genDataKey() {
    this._manualKey = `DATA_${nextDataTextureIndex}`;
    nextDataTextureIndex++;
  }
}

export class UrlTexture extends ImageTexture {
  constructor(url: string) {
    let img = new Image();
    super(img);
    img.src = url;
  }
}

export class BlobTexture extends ImageTexture {
  constructor(blob: Blob) {
    let img = new Image();
    super(img);
    img.src = window.URL.createObjectURL(blob);
  }
}

export class VideoTexture extends Texture {
  private _video: any;
  constructor(video: HTMLVideoElement) {
    super();

    this._video = video;

    if (video.readyState >= 2) {
      this._promise = Promise.resolve(this);
    } else if (video.error) {
      this._promise = Promise.reject(video.error);
    } else {
      this._promise = new Promise((resolve, reject) => {
        video.addEventListener('loadeddata', () => resolve(this));
        video.addEventListener('error', reject);
      });
    }
  }

  get format() {
    // TODO: Can be RGB in some cases.
    return GL.RGBA;
  }

  get width() {
    return this._video.videoWidth;
  }

  get height() {
    return this._video.videoHeight;
  }

  waitForComplete() {
    return this._promise;
  }

  get textureKey() {
    return this._video.src;
  }

  get source() {
    return this._video;
  }
}

export class DataTexture extends Texture {
  _key: string;
  constructor(
    private _data: any,
    private _width: number,
    private _height: number,
    private _format = GL.RGBA,
    private _type = GL.UNSIGNED_BYTE) {
    super();
    this._key = `DATA_${nextDataTextureIndex}`;
    nextDataTextureIndex++;
  }

  get format() {
    return this._format;
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  get textureKey(): string {
    return this._key;
  }
}

export class ColorTexture extends DataTexture {
  constructor(r: number, g: number, b: number, a: number) {
    let colorData = new Uint8Array([r * 255.0, g * 255.0, b * 255.0, a * 255.0]);
    super(colorData, 1, 1);

    this.mipmap = false;
    this._key = `COLOR_${colorData[0]}_${colorData[1]}_${colorData[2]}_${colorData[3]}`;
  }
}
