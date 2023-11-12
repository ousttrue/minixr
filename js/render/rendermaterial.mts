import { Program } from './program.mjs';
import { Material, MaterialState, CAP, MAT_STATE, RENDER_ORDER, stateToBlendFunc } from '../scene/materials/material.mjs';
import { Texture } from '../scene/materials/texture.mjs';
import { DataTexture, VideoTexture } from '../scene/materials/texture.mjs';
import { ATTRIB, ATTRIB_MASK } from '../scene/geometry/primitive.mjs';
import { isPowerOfTwo } from '../math/gl-matrix.mjs';


const GL = WebGLRenderingContext; // For enums


const PRECISION_REGEX = new RegExp('precision (lowp|mediump|highp) float;');

const VERTEX_SHADER_SINGLE_ENTRY = `
uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;

void main() {
  gl_Position = vertex_main(PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX);
}
`;

const VERTEX_SHADER_MULTI_ENTRY = `
uniform mat4 LEFT_PROJECTION_MATRIX, LEFT_VIEW_MATRIX, RIGHT_PROJECTION_MATRIX, RIGHT_VIEW_MATRIX, MODEL_MATRIX;
void main() {
  gl_Position = vertex_main(LEFT_PROJECTION_MATRIX, LEFT_VIEW_MATRIX, RIGHT_PROJECTION_MATRIX, RIGHT_VIEW_MATRIX, MODEL_MATRIX);
}
`;

const FRAGMENT_SHADER_ENTRY = `
void main() {
  gl_FragColor = fragment_main();
}
`;

const FRAGMENT_SHADER_MULTI_ENTRY = `
out vec4 color;
void main() {
  color = fragment_main();
}
`;

export class MaterialFactory {
  private _programCache: { [key: string]: Program } = {};
  private _defaultFragPrecision: string;
  private _textureCache: { [key: string]: WebGLTexture } = {};

  constructor(
    private _gl: WebGL2RenderingContext,
    private _multiview: boolean
  ) {
    const gl = this._gl;
    const fragHighPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    this._defaultFragPrecision = fragHighPrecision!.precision > 0 ? 'highp' : 'mediump';
  }

  private _getProgramKey(name: string, defines: any) {
    let key = `${name}:`;
    for (let define in defines) {
      key += `${define}=${defines[define]},`;
    }
    return key;
  }

  getMaterialProgram(material: Material, attributeMask: number): Program {
    let materialName = material.materialName;
    // @ts-ignore
    let vertexSource = (!this._multiview) ? material.vertexSource : material.vertexSourceMultiview;
    // @ts-ignore
    let fragmentSource = (!this._multiview) ? material.fragmentSource : material.fragmentSourceMultiview;

    // These should always be defined for every material
    if (materialName == null) {
      throw new Error('Material does not have a name');
    }
    if (vertexSource == null) {
      throw new Error(`Material "${materialName}" does not have a vertex source`);
    }
    if (fragmentSource == null) {
      throw new Error(`Material "${materialName}" does not have a fragment source`);
    }

    let defines = material.getProgramDefines(attributeMask);
    let key = this._getProgramKey(materialName, defines);

    if (key in this._programCache) {
      return this._programCache[key];
    }

    let fullVertexSource = vertexSource;
    fullVertexSource += this._multiview
      ? VERTEX_SHADER_MULTI_ENTRY
      : VERTEX_SHADER_SINGLE_ENTRY;

    let precisionMatch = fragmentSource.match(PRECISION_REGEX);
    let fragPrecisionHeader = precisionMatch ? '' : `precision ${this._defaultFragPrecision} float;\n`;

    let fullFragmentSource = fragPrecisionHeader + fragmentSource;
    fullFragmentSource += this._multiview
      ? FRAGMENT_SHADER_MULTI_ENTRY
      : FRAGMENT_SHADER_ENTRY

    let program = new Program(this._gl,
      fullVertexSource, fullFragmentSource, ATTRIB, defines);
    this._programCache[key] = program;

    program.onNextUse((program: Program) => {
      // Bind the samplers to the right texture index. This is constant for
      // the lifetime of the program.
      for (let i = 0; i < material.samplers.length; ++i) {
        const sampler = material.samplers[i];
        let uniform = program.uniformMap[sampler.name];
        if (uniform) {
          this._gl.uniform1i(uniform, i);
        }
      }
    });

    return program;
  }

  _getRenderTexture(texture?: Texture) {
    if (!texture) {
      return null;
    }

    let key = texture.textureKey;
    if (!key) {
      throw new Error('Texure does not have a valid key');
    }

    if (key in this._textureCache) {
      return this._textureCache[key];
    } else {
      let gl = this._gl;
      let textureHandle = gl.createTexture();

      let renderTexture = textureHandle;
      this._textureCache[key] = renderTexture;

      if (texture instanceof DataTexture) {
        gl.bindTexture(gl.TEXTURE_2D, textureHandle);
        gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, texture.width, texture.height,
          0, texture.format, texture._type, texture._data);
        this._setSamplerParameters(texture);
        renderTexture._complete = true;
      } else {
        texture.waitForComplete().then(() => {
          gl.bindTexture(gl.TEXTURE_2D, textureHandle);
          gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, texture.format, gl.UNSIGNED_BYTE, texture.source);
          this._setSamplerParameters(texture);
          renderTexture._complete = true;

          if (texture instanceof VideoTexture) {
            // Once the video starts playing, set a callback to update it's
            // contents each frame.
            texture._video.addEventListener('playing', () => {
              renderTexture._activeCallback = () => {
                if (!texture._video.paused && !texture._video.waiting) {
                  gl.bindTexture(gl.TEXTURE_2D, textureHandle);
                  gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, texture.format, gl.UNSIGNED_BYTE, texture.source);
                }
              };
            });
          }
        });
      }

      return renderTexture;
    }
  }

  _setSamplerParameters(texture) {
    let gl = this._gl;

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
