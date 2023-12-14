import { vec3, mat4 } from '../math/gl-matrix.mjs';
import { World } from '../uecs/index.mjs';

export class Rotater {
  constructor(public readonly callback: Function | null = null) {
  }
  static system(world: World, timestamp: number) {
    world.view(mat4, Rotater).each((_entity, matrix, _rotater) => {
      mat4.fromRotation(timestamp / 2000, vec3.fromValues(0, 1, 0), { out: matrix });
      if (_rotater.callback) {
        _rotater.callback();
      }
    });
  }
}
