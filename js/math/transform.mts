import { mat4, vec3, quat } from '../math/gl-matrix.mjs';


const DEFAULT_TRANSLATION = vec3.fromValues(0, 0, 0);
const DEFAULT_ROTATION = quat.fromValues(0, 0, 0, 1);
const DEFAULT_SCALE = vec3.fromValues(1, 1, 1);


export class Transform {
  private _dirtyTRS = false;

  private _translation = DEFAULT_TRANSLATION.copy();
  set translation(value: vec3) {
    value.copy({ out: this._translation });
    this._dirtyTRS = true;
    this.invalidate();
  }
  get translation(): vec3 {
    return this._translation;
  }

  private _rotation = DEFAULT_ROTATION.copy();
  set rotation(value: quat) {
    value.copy({ out: this._rotation });
    this._dirtyTRS = true;
    this.invalidate();
  }
  get rotation(): quat {
    return this._rotation;
  }

  private _scale = DEFAULT_SCALE.copy();
  set scale(value: vec3) {
    value.copy({ out: this._scale });
    this._dirtyTRS = true;
    this.invalidate();
  }
  get scale(): vec3 {
    return this._scale;
  }

  private _matrix = mat4.identity();
  set matrix(value: mat4) {
    if (!value) {
      throw new Error("no value");
    }

    value.copy({ out: this._matrix });
    this._dirtyTRS = false;
    // TODO: decompose
    this._translation.set(0, 0, 0);
    this._rotation.set(0, 0, 0, 1);
    this._scale.set(1, 1, 1);
    this.invalidate();
  }
  get matrix() {
    if (this._dirtyTRS) {
      this._matrix.fromRotationTranslationScale(
        this._rotation || DEFAULT_ROTATION,
        this._translation || DEFAULT_TRANSLATION,
        this._scale || DEFAULT_SCALE);
    }

    if (this._dirtyTRS) {
      this.invalidate();
    }
    this._dirtyTRS = false;

    return this._matrix;
  }
  onInvalidated: Function[] = [];
  invalidate() {
    for (const callback of this.onInvalidated) {
      callback();
    }
  }

  constructor() { }

  clone(): Transform {
    const cloneNode = new Transform();
    cloneNode._dirtyTRS = this._dirtyTRS;
    this._translation.copy({ out: cloneNode._translation });
    this._rotation.copy({ out: cloneNode._rotation });
    this._scale.copy({ out: cloneNode._scale });
    this._matrix.copy({ out: cloneNode._matrix });
    return cloneNode;
  }
}
