import { Scene } from './js/render/scenes/scene.mjs';
import { Node } from './js/render/core/node.mjs';
import { Renderer, createWebGLContext } from './js/render/core/renderer.mjs';
import { BoxBuilder } from './js/render/geometry/box-builder.mjs';
import { PbrMaterial } from './js/render/materials/pbr.mjs';
import { mat4 } from './js/render/math/gl-matrix.mjs';

const defaultBoxColor = { r: 0.5, g: 0.5, b: 0.5 };

function addBox(
  renderer: Renderer,
  r: number, g: number, b: number): Node {
  let boxRenderPrimitive = createBoxPrimitive(renderer, r, g, b);
  let boxNode = new Node();
  boxNode.addRenderPrimitive(boxRenderPrimitive);
  // Marks the node as one that needs to be checked when hit testing.
  boxNode.selectable = true;
  return boxNode;
}

function createBoxPrimitive(renderer: Renderer, r: number, g: number, b: number) {
  let boxBuilder = new BoxBuilder();
  boxBuilder.pushCube([0, 0, 0], 1);
  let boxPrimitive = boxBuilder.finishPrimitive(renderer);
  let boxMaterial = new PbrMaterial();
  boxMaterial.baseColorFactor.value = [r, g, b, 1];
  return renderer.createRenderPrimitive(boxPrimitive, boxMaterial);
}

export default class Hand {
  boxes: Node[] = [];
  indexFingerBoxes: Node;
  // interactionBox: Node | null = null;

  // XR globals.
  private _radii = new Float32Array(25);
  private _positions = new Float32Array(16 * 25);

  constructor(scene: Scene, renderer: Renderer,
    color: { r: number, g: number, b: number }) {
    for (let i = 0; i <= 24; i++) {
      const r = .6 + Math.random() * .4;
      const g = .6 + Math.random() * .4;
      const b = .6 + Math.random() * .4;
      this.boxes.push(addBox(renderer, r, g, b));
    }
    this.indexFingerBoxes = addBox(renderer, color.r, color.g, color.b);
  }

  disable(scene: Scene) {
    for (const box of this.boxes) {
      scene.removeNode(box);
    }
    scene.removeNode(this.indexFingerBoxes);
  }

  update(scene: Scene, refSpace: XRReferenceSpace, time: number, frame: XRFrame, inputSource: XRInputSource) {
    if (!inputSource.hand) {
      return;
    }

    // clear
    for (const box of this.boxes) {
      scene.removeNode(box);
    }
    scene.removeNode(this.indexFingerBoxes);

    // frame pose
    let pose = frame.getPose(inputSource.targetRaySpace, refSpace);
    if (pose === undefined) {
      console.log("no pose");
    }
    // @ts-ignore
    if (!frame.fillJointRadii(inputSource.hand.values(), this._radii)) {
      console.log("no fillJointRadii");
      return;
    }
    // @ts-ignore
    if (!frame.fillPoses(inputSource.hand.values(), refSpace, this._positions)) {
      console.log("no fillPoses");
      return;
    }

    let offset = 0;
    for (const box of this.boxes) {
      scene.addNode(box);
      let matrix = this._positions.slice(offset * 16, (offset + 1) * 16);
      let jointRadius = this._radii[offset];
      offset++;
      mat4.getTranslation(box.translation, matrix);
      mat4.getRotation(box.rotation, matrix);
      box.scale = [jointRadius, jointRadius, jointRadius];
    }

    // Render a special box for each index finger on each hand	
    scene.addNode(this.indexFingerBoxes);
    // @ts-ignore
    let joint = inputSource.hand.get('index-finger-tip');
    // @ts-ignore
    let jointPose = frame.getJointPose(joint, refSpace);
    if (jointPose) {
      let matrix = jointPose.transform.matrix;
      mat4.getTranslation(this.indexFingerBoxes.translation, matrix);
      mat4.getRotation(this.indexFingerBoxes.rotation, matrix);
      this.indexFingerBoxes.scale = [0.02, 0.02, 0.02];
    }

    // this.UpdateInteractables(time);
  }

  // UpdateInteractables(renderer: Renderer, time: number, color) {
  //   // Add scene objects if not present
  //   if (!this.interactionBox) {
  //     // Add box to demonstrate hand interaction
  //     const AddInteractionBox = (r: number, g: number, b: number): Node => {
  //       let box = new Node();
  //       box.addRenderPrimitive(createBoxPrimitive(renderer, r, g, b));
  //       box.translation = [0, 0, -0.65];
  //       box.scale = [0.25, 0.25, 0.25];
  //       return box;
  //     };
  //
  //     this.interactionBox = AddInteractionBox(defaultBoxColor.r, defaultBoxColor.g, defaultBoxColor.b);
  //     this.leftInteractionBox = AddInteractionBox(leftBoxColor.r, leftBoxColor.g, leftBoxColor.b);
  //     this.rightInteractionBox = AddInteractionBox(rightBoxColor.r, rightBoxColor.g, rightBoxColor.b);
  //     this.scene.addNode(this.interactionBox);
  //     this.scene.addNode(this.leftInteractionBox);
  //     this.scene.addNode(this.rightInteractionBox);
  //   }
  //
  //   this._UpdateInteractables(time,
  //     this.interactionBox!,
  //     this.leftInteractionBox!,
  //     this.rightInteractionBox!,
  //     this.indexFingerBoxes);
  // }
  //
  // private _UpdateInteractables(time: number,
  //   interactionBox: Node,
  //   leftInteractionBox: Node,
  //   rightInteractionBox: Node,
  //   indexFingerBoxes: { left: Node, right: Node }
  // ) {
  //
  //   function Distance(nodeA: Node, nodeB: Node): number {
  //     return Math.sqrt(
  //       Math.pow(nodeA.translation[0] - nodeB.translation[0], 2) +
  //       Math.pow(nodeA.translation[1] - nodeB.translation[1], 2) +
  //       Math.pow(nodeA.translation[2] - nodeB.translation[2], 2));
  //   }
  //
  //   // Perform distance check on interactable elements
  //   const interactionDistance = interactionBox.scale[0];
  //   leftInteractionBox.visible = false;
  //   rightInteractionBox.visible = false;
  //   if (Distance(indexFingerBoxes.left, interactionBox) < interactionDistance) {
  //     leftInteractionBox.visible = true;
  //   } else if (Distance(indexFingerBoxes.right, interactionBox) < interactionDistance) {
  //     rightInteractionBox.visible = true;
  //   }
  //   interactionBox.visible = !(leftInteractionBox.visible || rightInteractionBox.visible);
  //
  //   mat4.rotateX(interactionBox.matrix, interactionBox.matrix, time / 1000);
  //   mat4.rotateY(interactionBox.matrix, interactionBox.matrix, time / 1500);
  //   leftInteractionBox.matrix = interactionBox.matrix;
  //   rightInteractionBox.matrix = interactionBox.matrix;
  // }
}
