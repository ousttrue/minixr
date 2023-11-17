import { HandTracking } from '../component/hand-tracking.mjs';
import { SimpleMaterial } from '../materials/simple.mjs';
import { BoxBuilder } from '../geometry/box-builder.mjs';
import { World } from '../../third-party/uecs-0.4.2/index.mjs';
import { Transform } from '../../math/gl-matrix.mjs';


export async function handFactory(world: World,
  hand: 'left' | 'right'
): Promise<void> {

  const material = new SimpleMaterial();

  const boxBuilder = new BoxBuilder();
  boxBuilder.pushCube([0, 0, 0], 0.01);
  const primitive = boxBuilder.finishPrimitive(material);

  const joints: Transform[] = [];
  for (let i = 0; i < 24; i++) {
    const transform = new Transform();
    world.create(transform, primitive);
    joints.push(transform);
  }

  world.create(new HandTracking(hand, joints));

  return Promise.resolve();
}

