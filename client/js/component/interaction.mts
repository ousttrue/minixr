import { BoxBuilder } from '../buffer/box-builder.mjs';
import { vec3, quat, mat4 } from '../../../lib/math/gl-matrix.mjs';
import { Spinner } from '../component/spinner.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { HoverPassive, HoverMaterial } from '../component/hover.mjs';
import { CubeInstancing } from './cube-instance.mjs';


const SCALING = mat4.fromScaling(vec3.fromValues(0.25, 0.25, 0.25))

export async function interactionFactory(world: World, instancing: CubeInstancing): Promise<void> {

  const [index, matrix] = instancing.newInstance()

  const hover = new HoverPassive(
    () => {
      instancing.setCubeColor(index, 1);
    },
    () => {
      instancing.setCubeColor(index, 7);
    })
  instancing.setCubeColor(index, 7);

  world.create(matrix, new Spinner(), hover);

  return Promise.resolve();
}
