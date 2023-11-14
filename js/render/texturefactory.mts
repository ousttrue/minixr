import { Texture } from '../scene/materials/texture.mjs';
import { DataTexture, VideoTexture } from '../scene/materials/texture.mjs';
import { isPowerOfTwo } from '../math/gl-matrix.mjs';


const GL = WebGLRenderingContext; // For enums


export class TextureFactory {
  private _textureMap: Map<Texture, WebGLTexture> = new Map();

  constructor(
    private gl: WebGL2RenderingContext,
  ) {
  }

  getOrCreateTexture(texture: Texture): WebGLTexture {
    const cache = this._textureMap.get(texture);
    if (cache) {
      return cache;
    }

    const gl = this.gl;
    const textureHandle = gl.createTexture()!;
    // console.log('create', textureHandle);
    this._textureMap.set(texture, textureHandle);

    gl.bindTexture(gl.TEXTURE_2D, textureHandle);
    gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, texture.width, texture.height,
      0, texture.format, GL.UNSIGNED_BYTE, texture.source);
    this._setSamplerParameters(texture);

    // renderTexture._complete = true;
    // } else {
    //   texture.waitForComplete().then(() => {
    //     gl.bindTexture(gl.TEXTURE_2D, textureHandle);
    //     gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, texture.format, gl.UNSIGNED_BYTE, texture.source);
    //     this._setSamplerParameters(texture);
    //     renderTexture._complete = true;
    //
    //     if (texture instanceof VideoTexture) {
    //       // Once the video starts playing, set a callback to update it's
    //       // contents each frame.
    //       texture._video.addEventListener('playing', () => {
    //         renderTexture._activeCallback = () => {
    //           if (!texture._video.paused && !texture._video.waiting) {
    //             gl.bindTexture(gl.TEXTURE_2D, textureHandle);
    //             gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, texture.format, gl.UNSIGNED_BYTE, texture.source);
    //           }
    //         };
    //       });
    //     }
    //   });
    // }

    return textureHandle;
  }

  private _setSamplerParameters(texture: Texture) {
    let gl = this.gl;

    let sampler = texture.sampler;
    let powerOfTwo = isPowerOfTwo(texture.width) && isPowerOfTwo(texture.height);
    let mipmap = powerOfTwo && texture.mipmap;
    if (mipmap) {
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    let minFilter = sampler.minFilter || (mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    let wrapS = sampler.wrapS || (powerOfTwo ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    let wrapT = sampler.wrapT || (powerOfTwo ? gl.REPEAT : gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, sampler.magFilter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
  }
}
