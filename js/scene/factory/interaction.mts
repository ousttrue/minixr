import { Node, HoverPassiveStartEvent } from '../nodes/node.mjs';
import { BoxBuilder } from '../geometry/box-builder.mjs';
import { vec3 } from '../../math/gl-matrix.mjs';
import { HoverMaterial } from '../materials/hover.mts';
import { Component } from '../component/component.mts';
import { Spinner } from '../component/spinner.mts';

export async function interactionFactory():
  Promise<{ nodes: Node[], components: Component[] }> {

  const node = new Node('interaction');
  node.action = 'passive';

  let builder = new BoxBuilder();
  builder.pushCube([0, 0, 0], 1);
  const material = new HoverMaterial();
  let primitive = builder.finishPrimitive(material);

  node.primitives.push(primitive);
  node.local.translation = vec3.fromValues(0, 0, -0.65);
  node.local.scale = vec3.fromValues(0.25, 0.25, 0.25);

  node.addEventListener('hover-passive-start', (event: Event) => {
    console.log('onHoverStart', (event as HoverPassiveStartEvent).active);
    material.color.value.set(1, 0, 0, 1);
  });

  node.addEventListener('hover-passive-end', (event: Event) => {
    console.log('onHoverEnd', (event as HoverPassiveStartEvent).active);
    material.color.value.set(1, 1, 1, 1);
  });

  const spinner = new Spinner(node);

  return Promise.resolve({ nodes: [node], components: [spinner] });
}
