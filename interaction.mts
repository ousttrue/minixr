import { Node } from './js/scene/node.mjs';
import { PbrMaterial } from './js/scene/pbr.mjs';
import { Primitive } from './js/scene/geometry/primitive.mjs';
import { BoxBuilder } from './js/scene/geometry/box-builder.mjs';
import { vec3, mat4 } from './js/math/gl-matrix.mjs';


export function createBoxPrimitive(r: number, g: number, b: number): Primitive {
  let boxBuilder = new BoxBuilder();
  boxBuilder.pushCube([0, 0, 0], 1);
  let boxMaterial = new PbrMaterial();
  boxMaterial.baseColorFactor.value = [r, g, b, 1];
  let boxPrimitive = boxBuilder.finishPrimitive(boxMaterial);
  return boxPrimitive;
}

export function addBox(
  name: string,
  r: number, g: number, b: number): Node {
  let boxNode = new Node(name);

  let boxRenderPrimitive = createBoxPrimitive(r, g, b);
  boxNode.primitives.push(boxRenderPrimitive);
  // Marks the node as one that needs to be checked when hit testing.
  boxNode.selectable = true;
  return boxNode;
}

export class Interaction {
  interactionBox: Node;
  lastTime: number = 0;

  constructor(color: { r: number, g: number, b: number }) {
    this.interactionBox = new Node('rotation cube');
    this.interactionBox.primitives.push(createBoxPrimitive(color.r, color.g, color.b));
    this.interactionBox.local.translation = vec3.fromValues(0, 0, -0.65);
    this.interactionBox.local.scale = vec3.fromValues(0.25, 0.25, 0.25);
  }

  update(time: number) {
    if (this.lastTime != 0) {
      const delta = time - this.lastTime;

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

      this.interactionBox.local.matrix.rotateX(delta / 1000);
      this.interactionBox.local.matrix.rotateY(delta / 1500);
      this.interactionBox.local.invalidate();
    }
    this.lastTime = time;
  }
}

