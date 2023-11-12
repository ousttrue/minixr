import { Node } from './js/scene/node.mjs';
import { PbrMaterial } from './js/scene/pbr.mjs';
import { Primitive } from './js/scene/geometry/primitive.mjs';
import { BoxBuilder } from './js/scene/geometry/box-builder.mjs';
import { vec3, mat4 } from './js/math/gl-matrix.mjs';


export class Interaction extends Node {

  constructor(color: { r: number, g: number, b: number }) {
    super("Interaction");

    let boxBuilder = new BoxBuilder();
    boxBuilder.pushCube([0, 0, 0], 1);
    let boxMaterial = new PbrMaterial();
    boxMaterial.baseColorFactor.value = [color.r, color.g, color.b, 1];
    let primitive = boxBuilder.finishPrimitive(boxMaterial);

    this.primitives.push(primitive);
    this.local.translation = vec3.fromValues(0, 0, -0.65);
    this.local.scale = vec3.fromValues(0.25, 0.25, 0.25);
  }

  protected onUpdate(_time: number, delta: number) {
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
}
