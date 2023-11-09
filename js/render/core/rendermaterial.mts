import { CAP, MAT_STATE, RENDER_ORDER, stateToBlendFunc } from './material.mjs';
import { PbrMaterial } from './pbr.mjs';
import { Program } from './program.mjs';
import { ATTRIB, ATTRIB_MASK } from './material.mjs';


const GL = WebGLRenderingContext; // For enums


class RenderMaterialSampler {
  constructor(renderer, materialSampler, index) {
    this._renderer = renderer;
    this._uniformName = materialSampler._uniformName;
    this._renderTexture = renderer._getRenderTexture(materialSampler._texture);
    this._index = index;
  }

  set texture(value) {
    this._renderTexture = this._renderer._getRenderTexture(value);
  }
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


export class RenderMaterial {
  private _program: any;
  private _state: any;
  private _activeFrameId: number;
  private _completeForActiveFrame: boolean;
  private _samplerDictionary: {};
  private _samplers: never[];
  private _uniform_dictionary: {};
  private _uniforms: never[];
  private _firstBind: boolean;
  private _renderOrder: any;

  constructor(renderer, material, program) {
    this._program = program;
    this._state = material.state._state;
    this._activeFrameId = 0;
    this._completeForActiveFrame = false;

    this._samplerDictionary = {};
    this._samplers = [];
    for (let i = 0; i < material._samplers.length; ++i) {
      let renderSampler = new RenderMaterialSampler(renderer, material._samplers[i], i);
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
}

