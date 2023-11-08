export default class Quat {
  _data: Float32Array;

  constructor(x: number, y: number, z: number, w: number) {
    this._data = new Float32Array([x, y, z, w]);
  }

  static identity(): Quat {
    return new Quat(0, 0, 0, 1);
  }

  clone(): Quat {
    return new Quat(this._data[0], this._data[1], this._data[2], this._data[3]);
  }
}
