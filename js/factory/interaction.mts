import { BoxBuilder } from '../geometry/box-builder.mjs';
import { vec3, Transform } from '../math/gl-matrix.mjs';
import { HoverMaterial } from '../materials/hover.mjs';
import { Spinner } from '../component/spinner.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { HoverPassive } from '../component/hover.mjs';

export async function interactionFactory(world: World): Promise<void> {

  let builder = new BoxBuilder();
  builder.pushCube([0, 0, 0], 1);
  const material = new HoverMaterial();
  let primitive = builder.finishPrimitive(material);

  const transform = new Transform();
  transform.translation = vec3.fromValues(0, 0, -0.65);
  transform.scale = vec3.fromValues(0.25, 0.25, 0.25);

  const hover = new HoverPassive(
    () => {
      material.color.value.set(1, 0, 0, 1);
    },
    () => {
      material.color.value.set(1, 1, 1, 1);
    })

  world.create(transform, primitive, new Spinner(), hover);

  return Promise.resolve();
}
