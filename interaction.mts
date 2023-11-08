import { Node } from './js/render/core/node.mjs';
import { Renderer } from './js/render/core/renderer.mjs';
import { BoxBuilder } from './js/render/geometry/box-builder.mjs';
import { PbrMaterial } from './js/render/materials/pbr.mjs';
import { mat4 } from './js/render/math/gl-matrix.mjs';


export function addBox(
  renderer: Renderer,
  r: number, g: number, b: number): Node {
  let boxRenderPrimitive = createBoxPrimitive(renderer, r, g, b);
  let boxNode = new Node();
  boxNode.addRenderPrimitive(boxRenderPrimitive);
  // Marks the node as one that needs to be checked when hit testing.
  boxNode.selectable = true;
  return boxNode;
}

export function createBoxPrimitive(renderer: Renderer, r: number, g: number, b: number) {
  let boxBuilder = new BoxBuilder();
  boxBuilder.pushCube([0, 0, 0], 1);
  let boxPrimitive = boxBuilder.finishPrimitive(renderer);
  let boxMaterial = new PbrMaterial();
  boxMaterial.baseColorFactor.value = [r, g, b, 1];
  return renderer.createRenderPrimitive(boxPrimitive, boxMaterial);
}

function Distance(nodeA: Node, nodeB: Node): number {
  return Math.sqrt(
    Math.pow(nodeA.translation[0] - nodeB.translation[0], 2) +
    Math.pow(nodeA.translation[1] - nodeB.translation[1], 2) +
    Math.pow(nodeA.translation[2] - nodeB.translation[2], 2));
}

export class Interaction {
  interactionBox: Node;
  lastTime: number = 0;

  constructor(renderer: Renderer, color: { r: number, g: number, b: number }) {
    this.interactionBox = new Node();
    this.interactionBox.addRenderPrimitive(createBoxPrimitive(renderer, color.r, color.g, color.b));
    this.interactionBox.translation = [0, 0, -0.65];
    this.interactionBox.scale = [0.25, 0.25, 0.25];
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

      mat4.rotateX(this.interactionBox.matrix, this.interactionBox.matrix, delta / 1000);
      mat4.rotateY(this.interactionBox.matrix, this.interactionBox.matrix, delta / 1500);
    }
    this.lastTime = time;
  }
}

