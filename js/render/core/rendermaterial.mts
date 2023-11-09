import { CAP, MAT_STATE, RENDER_ORDER, stateToBlendFunc } from './material.mjs';
import { PbrMaterial } from './pbr.mjs';
import { Program } from './program.mjs';
import { ATTRIB, ATTRIB_MASK } from './material.mjs';
import { DataTexture, VideoTexture } from './texture.mjs';
import { isPowerOfTwo } from '../../math/gl-matrix.mjs';


const GL = WebGLRenderingContext; // For enums


function setCap(gl, glEnum, cap, prevState, state) {
  let change = (state & cap) - (prevState & cap);
  if (!change) {
    return;
  }

  if (change > 0) {
    gl.enable(glEnum);
  } else {
    gl.disable(glEnum);
  }
}


export class RenderTexture {
  constructor(texture) {
    this._texture = texture;
    this._complete = false;
    this._activeFrameId = 0;
    this._activeCallback = null;
  }

  markActive(frameId) {
    if (this._activeCallback && this._activeFrameId != frameId) {
      this._activeFrameId = frameId;
      this._activeCallback(this);
    }
  }
}


class RenderMaterialSampler {
  constructor(
    public readonly _uniformName: string,
    public readonly _renderTexture: RenderTexture,
    public readonly _index: number) {
  }

  // set texture(value) {
  //   this._renderTexture = this._renderer._getRenderTexture(value);
  // }
}


class RenderMaterialUniform {
  constructor(materialUniform) {
    this._uniformName = materialUniform._uniformName;
    this._uniform = null;
    this._length = materialUniform._length;
    if (materialUniform._value instanceof Array) {
      this._value = new Float32Array(materialUniform._value);
    } else {
      this._value = new Float32Array([materialUniform._value]);
    }
  }

  set value(value) {
    if (this._value.length == 1) {
      this._value[0] = value;
    } else {
      for (let i = 0; i < this._value.length; ++i) {
        this._value[i] = value[i];
      }
    }
  }
}

// this._uniformName = materialSampler._uniformName;
// this._renderTexture = renderer._getRenderTexture(materialSampler._texture);
// this._index = index;

export class RenderMaterial {
  private _program: any;
  private _state: any;
  private _activeFrameId: number;
  private _completeForActiveFrame: boolean;
  private _samplers: RenderMaterialSampler[] = []
  private _samplerDictionary: { [key: string]: RenderMaterialSampler } = {}
  private _uniform_dictionary: {};
  private _uniforms: never[];
  private _firstBind: boolean;
  private _renderOrder: any;

  constructor(factory: MaterialFactory, material, program) {
    this._program = program;
    this._state = material.state._state;
    this._activeFrameId = 0;
    this._completeForActiveFrame = false;

    for (let i = 0; i < material._samplers.length; ++i) {
      const sampler = material._samplers[i]
      const renderSampler = new RenderMaterialSampler(sampler._uniformName,
        factory._getRenderTexture(sampler._texture), i);
      this._samplers.push(renderSampler);
      this._samplerDictionary[renderSampler._uniformName] = renderSampler;
    }

    this._uniform_dictionary = {};
    this._uniforms = [];
    for (let uniform of material._uniforms) {
      let renderUniform = new RenderMaterialUniform(uniform);
      this._uniforms.push(renderUniform);
      this._uniform_dictionary[renderUniform._uniformName] = renderUniform;
    }

    this._firstBind = true;

    this._renderOrder = material.renderOrder;
    if (this._renderOrder == RENDER_ORDER.DEFAULT) {
      if (this._state & CAP.BLEND) {
        this._renderOrder = RENDER_ORDER.TRANSPARENT;
      } else {
        this._renderOrder = RENDER_ORDER.OPAQUE;
      }
    }
  }

  bind(gl) {
    // First time we do a binding, cache the uniform locations and remove
    // unused uniforms from the list.
    if (this._firstBind) {
      for (let i = 0; i < this._samplers.length;) {
        let sampler = this._samplers[i];
        if (!this._program.uniform[sampler._uniformName]) {
          this._samplers.splice(i, 1);
          continue;
        }
        ++i;
      }

      for (let i = 0; i < this._uniforms.length;) {
        let uniform = this._uniforms[i];
        uniform._uniform = this._program.uniform[uniform._uniformName];
        if (!uniform._uniform) {
          this._uniforms.splice(i, 1);
          continue;
        }
        ++i;
      }
      this._firstBind = false;
    }

    for (let sampler of this._samplers) {
      gl.activeTexture(gl.TEXTURE0 + sampler._index);
      if (sampler._renderTexture && sampler._renderTexture._complete) {
        gl.bindTexture(gl.TEXTURE_2D, sampler._renderTexture._texture);
      } else {
        gl.bindTexture(gl.TEXTURE_2D, null);
      }
    }

    for (let uniform of this._uniforms) {
      switch (uniform._length) {
        case 1: gl.uniform1fv(uniform._uniform, uniform._value); break;
        case 2: gl.uniform2fv(uniform._uniform, uniform._value); break;
        case 3: gl.uniform3fv(uniform._uniform, uniform._value); break;
        case 4: gl.uniform4fv(uniform._uniform, uniform._value); break;
      }
    }
  }

  markActive(frameId: number) {
    if (this._activeFrameId != frameId) {
      this._activeFrameId = frameId;
      this._completeForActiveFrame = true;
      for (let i = 0; i < this._samplers.length; ++i) {
        let sampler = this._samplers[i];
        if (sampler._renderTexture) {
          if (!sampler._renderTexture._complete) {
            this._completeForActiveFrame = false;
            break;
          }
          sampler._renderTexture.markActive(frameId);
        }
      }
    }
    return this._completeForActiveFrame;
  }

  // Material State fetchers
  get cullFace() {
    return !!(this._state & CAP.CULL_FACE);
  }
  get blend() {
    return !!(this._state & CAP.BLEND);
  }
  get depthTest() {
    return !!(this._state & CAP.DEPTH_TEST);
  }
  get stencilTest() {
    return !!(this._state & CAP.STENCIL_TEST);
  }
  get colorMask() {
    return !!(this._state & CAP.COLOR_MASK);
  }
  get depthMask() {
    return !!(this._state & CAP.DEPTH_MASK);
  }
  get stencilMask() {
    return !!(this._state & CAP.STENCIL_MASK);
  }
  get depthFunc() {
    return ((this._state & MAT_STATE.DEPTH_FUNC_RANGE) >> MAT_STATE.DEPTH_FUNC_SHIFT) + GL.NEVER;
  }
  get blendFuncSrc() {
    return stateToBlendFunc(this._state, MAT_STATE.BLEND_SRC_RANGE, MAT_STATE.BLEND_SRC_SHIFT);
  }
  get blendFuncDst() {
    return stateToBlendFunc(this._state, MAT_STATE.BLEND_DST_RANGE, MAT_STATE.BLEND_DST_SHIFT);
  }

  // Only really for use from the renderer
  _capsDiff(otherState) {
    return (otherState & MAT_STATE.CAPS_RANGE) ^ (this._state & MAT_STATE.CAPS_RANGE);
  }

  _blendDiff(otherState) {
    if (!(this._state & CAP.BLEND)) {
      return 0;
    }
    return (otherState & MAT_STATE.BLEND_FUNC_RANGE) ^ (this._state & MAT_STATE.BLEND_FUNC_RANGE);
  }

  _depthFuncDiff(otherState) {
    if (!(this._state & CAP.DEPTH_TEST)) {
      return 0;
    }
    return (otherState & MAT_STATE.DEPTH_FUNC_RANGE) ^ (this._state & MAT_STATE.DEPTH_FUNC_RANGE);
  }
}



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
  private _textureCache = {};

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

  getMaterialProgram(material: PbrMaterial, renderPrimitive: RenderPrimitive): Program {
    let materialName = material.materialName;
    let vertexSource = (!this._multiview) ? material.vertexSource : material.vertexSourceMultiview;
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

    let defines = material.getProgramDefines(renderPrimitive);
    let key = this._getProgramKey(materialName, defines);

    if (key in this._programCache) {
      return this._programCache[key];
    }

    let fullVertexSource = vertexSource;
    fullVertexSource += this._multiview ? VERTEX_SHADER_MULTI_ENTRY :
      VERTEX_SHADER_SINGLE_ENTRY;

    let precisionMatch = fragmentSource.match(PRECISION_REGEX);
    let fragPrecisionHeader = precisionMatch ? '' : `precision ${this._defaultFragPrecision} float;\n`;

    let fullFragmentSource = fragPrecisionHeader + fragmentSource;
    fullFragmentSource += this._multiview ? FRAGMENT_SHADER_MULTI_ENTRY :
      FRAGMENT_SHADER_ENTRY

    let program = new Program(this._gl, fullVertexSource, fullFragmentSource, ATTRIB, defines);
    this._programCache[key] = program;

    program.onNextUse((program: Program) => {
      // Bind the samplers to the right texture index. This is constant for
      // the lifetime of the program.
      for (let i = 0; i < material._samplers.length; ++i) {
        let sampler = material._samplers[i];
        let uniform = program.uniform[sampler._uniformName];
        if (uniform) {
          this._gl.uniform1i(uniform, i);
        }
      }
    });

    return program;
  }

  bindMaterialState(material: RenderMaterial, prevMaterial?: RenderMaterial) {
    let gl = this._gl;

    let state = material._state;
    let prevState = prevMaterial ? prevMaterial._state : ~state;

    // Return early if both materials use identical state
    if (state == prevState) {
      return;
    }

    // Any caps bits changed?
    if (material._capsDiff(prevState)) {
      setCap(gl, gl.CULL_FACE, CAP.CULL_FACE, prevState, state);
      setCap(gl, gl.BLEND, CAP.BLEND, prevState, state);
      setCap(gl, gl.DEPTH_TEST, CAP.DEPTH_TEST, prevState, state);
      setCap(gl, gl.STENCIL_TEST, CAP.STENCIL_TEST, prevState, state);

      let colorMaskChange = (state & CAP.COLOR_MASK) - (prevState & CAP.COLOR_MASK);
      if (colorMaskChange) {
        let mask = colorMaskChange > 1;
        this._colorMaskNeedsReset = !mask;
        gl.colorMask(mask, mask, mask, mask);
      }

      let depthMaskChange = (state & CAP.DEPTH_MASK) - (prevState & CAP.DEPTH_MASK);
      if (depthMaskChange) {
        this._depthMaskNeedsReset = !(depthMaskChange > 1);
        gl.depthMask(depthMaskChange > 1);
      }

      let stencilMaskChange = (state & CAP.STENCIL_MASK) - (prevState & CAP.STENCIL_MASK);
      if (stencilMaskChange) {
        gl.stencilMask(stencilMaskChange > 1 ? 0xff : 0x00);
      }
    }

    // Blending enabled and blend func changed?
    if (material._blendDiff(prevState)) {
      gl.blendFunc(material.blendFuncSrc, material.blendFuncDst);
    }

    // Depth testing enabled and depth func changed?
    if (material._depthFuncDiff(prevState)) {
      gl.depthFunc(material.depthFunc);
    }
  }

  _getRenderTexture(texture) {
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

      let renderTexture = new RenderTexture(textureHandle);
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

