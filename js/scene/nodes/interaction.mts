import { Node, HoverPassiveStartEvent, HoverPassiveEndEvent } from './node.mjs';
import { Material } from '../materials/material.mjs';
import { BoxBuilder } from '../geometry/box-builder.mjs';
import { vec3, vec4 } from '../../math/gl-matrix.mjs';
import { HoverMaterial } from '../materials/hover.mts';


export class Interaction extends Node {

  material = new HoverMaterial();

  constructor() {
    super("Interaction");

    this.action = 'passive';

    let builder = new BoxBuilder();
    builder.pushCube([0, 0, 0], 1);
    let primitive = builder.finishPrimitive(this.material);

    this.primitives.push(primitive);
    this.local.translation = vec3.fromValues(0, 0, -0.65);
    this.local.scale = vec3.fromValues(0.25, 0.25, 0.25);

    this.addEventListener('hover-passive-start', event => {
      this.onHoverStart((event as HoverPassiveStartEvent).active);
    });

    this.addEventListener('hover-passive-end', event => {
      this.onHoverEnd((event as HoverPassiveEndEvent).active);
    });
  }

  protected _onUpdate(_time: number, delta: number) {
    this.local.matrix.rotateX(delta / 1000);
    this.local.matrix.rotateY(delta / 1500);
    this.local.invalidate();
  }

  onHoverStart(action: Node) {
    console.log('onHoverStart', action);
    this.material.color.value.set(1, 0, 0, 1);
  }

  onHoverEnd(action: Node) {
    console.log('onHoverEnd', action);
    this.material.color.value.set(1, 1, 1, 1);
  }
}
