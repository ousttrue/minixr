import { mat4, vec3, quat } from '../math/gl-matrix.mjs';


const DEFAULT_TRANSLATION = vec3.create(0, 0, 0);
const DEFAULT_ROTATION = quat.create(0, 0, 0, 1);
const DEFAULT_SCALE = vec3.create(1, 1, 1);


export class Transform {
  private _matrix = mat4.create(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  private _dirtyTRS: boolean = false;
  private _translation = vec3.create(0, 0, 0);
  private _rotation = quat.create(0, 0, 0, 1);
  private _scale = vec3.create(1, 1, 1);
  onInvalidated: Function[] = [];
  constructor() { }

  clone(): Transform {
    const cloneNode = new Transform();
    cloneNode._dirtyTRS = this._dirtyTRS;
    cloneNode._translation.copyFrom(this._translation);
    cloneNode._rotation.copyFrom(this._rotation);
    cloneNode._scale.copyFrom(this._scale);
    if (!cloneNode._dirtyTRS && this._matrix) {
      // Only copy the matrices if they're not already dirty.
      cloneNode._matrix.copyFrom(this._matrix);
    }
    return cloneNode;
  }

  _invaliate() {
    for (const callback of this.onInvalidated) {
      callback();
    }
  }

  set matrix(value: mat4) {
    if (!value) {
      throw new Error("no value");
    }

    if (!this._matrix) {
      this._matrix = mat4.create();
    }
    this._matrix.copyFrom(value);
    this._dirtyTRS = false;
    this._translation.set(0, 0, 0);
    this._rotation.set(0, 0, 0, 1);
    this._scale.set(1, 1, 1);
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
      this._matrix.fromRotationTranslationScale(
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
