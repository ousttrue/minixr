const GL = WebGL2RenderingContext;


export const CAP = {
  // Enable caps
  CULL_FACE: 0x001,
  BLEND: 0x002,
  DEPTH_TEST: 0x004,
  STENCIL_TEST: 0x008,
  COLOR_MASK: 0x010,
  DEPTH_MASK: 0x020,
  STENCIL_MASK: 0x040,
};

export const MAT_STATE = {
  CAPS_RANGE: 0x000000FF,
  BLEND_SRC_SHIFT: 8,
  BLEND_SRC_RANGE: 0x00000F00,
  BLEND_DST_SHIFT: 12,
  BLEND_DST_RANGE: 0x0000F000,
  BLEND_FUNC_RANGE: 0x0000FF00,
  DEPTH_FUNC_SHIFT: 16,
  DEPTH_FUNC_RANGE: 0x000F0000,
};


export class MaterialState {
  private _state = CAP.CULL_FACE |
    CAP.DEPTH_TEST |
    CAP.COLOR_MASK |
    CAP.DEPTH_MASK;
  get state(): number { return this._state; }

  constructor() {

    // Use a fairly commonly desired blend func as the default.
    this.blendFuncSrc = GL.SRC_ALPHA;
    this.blendFuncDst = GL.ONE_MINUS_SRC_ALPHA;

    this.depthFunc = GL.LESS;
  }

  get cullFace() {
    return !!(this._state & CAP.CULL_FACE);
  }
  set cullFace(value) {
    if (value) {
      this._state |= CAP.CULL_FACE;
    } else {
      this._state &= ~CAP.CULL_FACE;
    }
  }

  get blend() {
    return !!(this._state & CAP.BLEND);
  }
  set blend(value) {
    if (value) {
      this._state |= CAP.BLEND;
    } else {
      this._state &= ~CAP.BLEND;
    }
  }

  get depthTest() {
    return !!(this._state & CAP.DEPTH_TEST);
  }
  set depthTest(value) {
    if (value) {
      this._state |= CAP.DEPTH_TEST;
    } else {
      this._state &= ~CAP.DEPTH_TEST;
    }
  }

  get stencilTest() {
    return !!(this._state & CAP.STENCIL_TEST);
  }
  set stencilTest(value) {
    if (value) {
      this._state |= CAP.STENCIL_TEST;
    } else {
      this._state &= ~CAP.STENCIL_TEST;
    }
  }

  get colorMask() {
    return !!(this._state & CAP.COLOR_MASK);
  }
  set colorMask(value) {
    if (value) {
      this._state |= CAP.COLOR_MASK;
    } else {
      this._state &= ~CAP.COLOR_MASK;
    }
  }

  get depthMask() {
    return !!(this._state & CAP.DEPTH_MASK);
  }
  set depthMask(value) {
    if (value) {
      this._state |= CAP.DEPTH_MASK;
    } else {
      this._state &= ~CAP.DEPTH_MASK;
    }
  }

  get depthFunc() {
    return ((this._state & MAT_STATE.DEPTH_FUNC_RANGE) >> MAT_STATE.DEPTH_FUNC_SHIFT) + GL.NEVER;
  }
  set depthFunc(value) {
    value = value - GL.NEVER;
    this._state &= ~MAT_STATE.DEPTH_FUNC_RANGE;
    this._state |= (value << MAT_STATE.DEPTH_FUNC_SHIFT);
  }

  get stencilMask() {
    return !!(this._state & CAP.STENCIL_MASK);
  }
  set stencilMask(value) {
    if (value) {
      this._state |= CAP.STENCIL_MASK;
    } else {
      this._state &= ~CAP.STENCIL_MASK;
    }
  }

  get blendFuncSrc() {
    return stateToBlendFunc(this._state, MAT_STATE.BLEND_SRC_RANGE, MAT_STATE.BLEND_SRC_SHIFT);
  }
  set blendFuncSrc(value) {
    switch (value) {
      case 0:
      case 1:
        break;
      default:
        value = (value - GL.SRC_COLOR) + 2;
    }
    this._state &= ~MAT_STATE.BLEND_SRC_RANGE;
    this._state |= (value << MAT_STATE.BLEND_SRC_SHIFT);
  }

  get blendFuncDst() {
    return stateToBlendFunc(this._state, MAT_STATE.BLEND_DST_RANGE, MAT_STATE.BLEND_DST_SHIFT);
  }
  set blendFuncDst(value) {
    switch (value) {
      case 0:
      case 1:
        break;
      default:
        value = (value - GL.SRC_COLOR) + 2;
    }
    this._state &= ~MAT_STATE.BLEND_DST_RANGE;
    this._state |= (value << MAT_STATE.BLEND_DST_SHIFT);
  }

  // Only really for use from the renderer
  _capsDiff(otherState: number) {
    return (otherState & MAT_STATE.CAPS_RANGE) ^ (this._state & MAT_STATE.CAPS_RANGE);
  }

  _blendDiff(otherState: number) {
    if (!(this._state & CAP.BLEND)) {
      return 0;
    }
    return (otherState & MAT_STATE.BLEND_FUNC_RANGE) ^ (this._state & MAT_STATE.BLEND_FUNC_RANGE);
  }

  _depthFuncDiff(otherState: number) {
    if (!(this._state & CAP.DEPTH_TEST)) {
      return 0;
    }
    return (otherState & MAT_STATE.DEPTH_FUNC_RANGE) ^ (this._state & MAT_STATE.DEPTH_FUNC_RANGE);
  }
}


export function stateToBlendFunc(state: number, mask: number, shift: number) {
  let value = (state & mask) >> shift;
  switch (value) {
    case 0:
    case 1:
      return value;
    default:
      return (value - 2) + GL.SRC_COLOR;
  }
}
