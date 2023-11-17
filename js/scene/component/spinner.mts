import { World } from '../../third-party/uecs-0.4.2/index.mjs';
import { Transform } from '../../math/gl-matrix.mjs';

export class Spinner {

  static system(world: World, timestamp: number, delta: number) {
    world.view(Transform, Spinner).each((entity, transform, spinner) => {
      transform.matrix.rotateX(delta / 1000);
      transform.matrix.rotateY(delta / 1500);
      transform.invalidate();
    });
  }

}
