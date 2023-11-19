import { vec3, mat4, Transform } from '../math/gl-matrix.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';

export class Rotater {
  static system(world: World, timestamp: number) {
    world.view(Transform, Rotater).each((entity, transform, rotater) => {
      const matrix = transform.matrix;
      mat4.fromRotation(timestamp / 2000, vec3.fromValues(0, 1, 0), { out: matrix });
      transform.invalidate();
    });
  }
}
