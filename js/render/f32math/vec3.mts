export default class Vec3 {
  _data: Float32Array;
  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this._data = new Float32Array([x, y, z]);
  }
}

