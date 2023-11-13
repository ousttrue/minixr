import { Node } from './node.mjs';
import { PbrMaterial } from '../materials/pbr.mjs';
import { BoxBuilder } from '../geometry/box-builder.mjs';
import { vec3, mat4 } from '../../math/gl-matrix.mjs';


export class Interaction extends Node {

  constructor(color: { r: number, g: number, b: number }) {
    super("Interaction");

    this.action = 'passive';

    let boxBuilder = new BoxBuilder();
    boxBuilder.pushCube([0, 0, 0], 1);
    let boxMaterial = new PbrMaterial();
    boxMaterial.baseColorFactor.value = [color.r, color.g, color.b, 1];
    let primitive = boxBuilder.finishPrimitive(boxMaterial);

    this.primitives.push(primitive);
    this.local.translation = vec3.fromValues(0, 0, -0.65);
    this.local.scale = vec3.fromValues(0.25, 0.25, 0.25);
  }

  protected _onUpdate(_time: number, delta: number) {
    // Perform distance check on interactable elements
    // const interactionDistance = interactionBox.scale[0];
    // leftInteractionBox.visible = false;
    // rightInteractionBox.visible = false;
    // if (Distance(indexFingerBoxes.left, interactionBox) < interactionDistance) {
    //   leftInteractionBox.visible = true;
    // } else if (Distance(indexFingerBoxes.right, interactionBox) < interactionDistance) {
    //   rightInteractionBox.visible = true;
    // }
    // interactionBox.visible = !(leftInteractionBox.visible || rightInteractionBox.visible);

    this.local.matrix.rotateX(delta / 1000);
    this.local.matrix.rotateY(delta / 1500);
    this.local.invalidate();
  }

  onHoverStart(action: Node) {
    console.log('onHoverStart', action);
  }

  onHoverEnd(action: Node) {
    console.log('onHoverEnd', action);
  }
}
