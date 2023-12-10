import { World } from '../uecs/index.mjs';
import { mat4 } from '../math/gl-matrix.mjs';

export class Spinner {

  static system(world: World, timestamp: number, delta: number) {
    world.view(mat4, Spinner).each((entity, matrix, spinner) => {
      matrix.rotateX(delta / 1000);
      matrix.rotateY(delta / 1500);
    });
  }

}
