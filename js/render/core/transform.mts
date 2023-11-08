import { mat4, vec3, quat } from '../math/gl-matrix.mjs';


const DEFAULT_TRANSLATION = new Float32Array([0, 0, 0]);
const DEFAULT_ROTATION = new Float32Array([0, 0, 0, 1]);
const DEFAULT_SCALE = new Float32Array([1, 1, 1]);


export default class Transform {
  private _matrix: Float32Array | null = mat4.create();
  private _dirtyTRS: boolean = false;
  private _translation: Float32Array | null = null;
  private _rotation: Float32Array | null = null;
  private _scale: Float32Array | null = null;
  onInvalidated: Function[] = [];
  constructor() { }

  clone(): Transform {
    const cloneNode = new Transform();
    cloneNode._dirtyTRS = this._dirtyTRS;

    if (this._translation) {
      cloneNode._translation = vec3.create();
      vec3.copy(cloneNode._translation, this._translation);
    }

    if (this._rotation) {
      cloneNode._rotation = quat.create();
      quat.copy(cloneNode._rotation, this._rotation);
    }

    if (this._scale) {
      cloneNode._scale = vec3.create();
      vec3.copy(cloneNode._scale, this._scale);
    }

    // Only copy the matrices if they're not already dirty.
    if (!cloneNode._dirtyTRS && this._matrix) {
      cloneNode._matrix = mat4.create();
      mat4.copy(cloneNode._matrix, this._matrix);
    }

    return cloneNode;
  }

  _invaliate() {
    for (const callback of this.onInvalidated) {
      callback();
    }
  }

  set matrix(value) {
    if (value) {
      if (!this._matrix) {
        this._matrix = mat4.create();
      }
      mat4.copy(this._matrix, value);
    } else {
      this._matrix = null;
    }
    this._dirtyTRS = false;
    this._translation = null;
    this._rotation = null;
    this._scale = null;
    this._invaliate();
  }

  get matrix() {
    let updated = false;
    if (!this._matrix) {
      this._matrix = mat4.create();
      updated = true;
    }

    if (this._dirtyTRS) {
      this._dirtyTRS = false;
      updated = true;
      mat4.fromRotationTranslationScale(
        this._matrix,
        this._rotation || DEFAULT_ROTATION,
        this._translation || DEFAULT_TRANSLATION,
        this._scale || DEFAULT_SCALE);
    }

    if (updated) {
      this._invaliate();
    }

    return this._matrix;
  }

  // TODO: Decompose matrix when fetching these?
  set translation(value) {
    if (value != null) {
      this._dirtyTRS = true;
      this._invaliate();
    }
    this._translation = value;
  }

  get translation() {
    if (!this._translation) {
      this._translation = vec3.clone(DEFAULT_TRANSLATION);
    }
    return this._translation;
  }

  set rotation(value) {
    if (value != null) {
      this._dirtyTRS = true;
      this._invaliate();
    }
    this._rotation = value;
  }

  get rotation() {
    if (!this._rotation) {
      this._rotation = quat.clone(DEFAULT_ROTATION);
    }
    return this._rotation;
  }

  set scale(value) {
    if (value != null) {
      this._dirtyTRS = true;
      this._invaliate();
    }
    this._scale = value;
  }

  get scale() {
    if (!this._scale) {
      this._scale = vec3.clone(DEFAULT_SCALE);
    }
    return this._scale;
  }
}
