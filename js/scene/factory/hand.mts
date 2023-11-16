import { Node } from '../nodes/node.mjs';
import { Component } from '../component/component.mjs';
import { HandTracking } from '../component/hand-tracking.mjs';
import { SimpleMaterial } from '../materials/simple.mjs';
import { BoxBuilder } from '../geometry/box-builder.mjs';


export async function handFactory(
  hand: 'left' | 'right'
): Promise<{ nodes: Node[], components: Component[] }> {

  const material = new SimpleMaterial();

  const boxBuilder = new BoxBuilder();
  boxBuilder.pushCube([0, 0, 0], 0.01);
  const primitive = boxBuilder.finishPrimitive(material);

  const nodes: Node[] = []
  for (let i = 0; i < 24; i++) {
    const node = new Node(`${hand}hand:${i}`);
    node.primitives.push(primitive);
    nodes.push(node);
  }

  const handTracking = new HandTracking(hand, nodes);

  return Promise.resolve({ nodes, components: [handTracking] });
}

