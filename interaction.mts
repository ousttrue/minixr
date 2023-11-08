import { Node } from './js/render/core/node.mjs';
import { Renderer } from './js/render/core/renderer.mjs';
import { BoxBuilder } from './js/render/geometry/box-builder.mjs';
import { PbrMaterial } from './js/render/materials/pbr.mjs';
import { vec3, mat4 } from './js/render/math/gl-matrix.mjs';


export function addBox(
  name: string,
  renderer: Renderer,
  r: number, g: number, b: number): Node {
  let boxRenderPrimitive = createBoxPrimitive(renderer, r, g, b);
  let boxNode = new Node(name);
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

// function Distance(nodeA: Node, nodeB: Node): number {
//   return Math.sqrt(
//     Math.pow(nodeA.local.translation.x - nodeB.local.translation.x, 2) +
//     Math.pow(nodeA.local.translation.y - nodeB.local.translation.y, 2) +
//     Math.pow(nodeA.local.translation.z - nodeB.local.translation.z, 2));
// }

export class Interaction {
  interactionBox: Node;
  lastTime: number = 0;

  constructor(renderer: Renderer, color: { r: number, g: number, b: number }) {
    this.interactionBox = new Node('rotation cube');
    this.interactionBox.addRenderPrimitive(createBoxPrimitive(renderer, color.r, color.g, color.b));
    this.interactionBox.local.translation = vec3.create(0, 0, -0.65);
    this.interactionBox.local.scale = vec3.create(0.25, 0.25, 0.25);
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
      this.interactionBox.local._invaliate();
    }
    this.lastTime = time;
  }
}

