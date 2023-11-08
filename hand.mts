import { Scene } from './js/render/scenes/scene.mjs';
import { Node } from './js/render/core/node.mjs';
import { Renderer } from './js/render/core/renderer.mjs';
import { mat4 } from './js/render/math/gl-matrix.mjs';
import { addBox } from './interaction.mjs';


export default class Hand {
  boxes: Node[] = [];
  indexFingerBoxes: Node;
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
  }
}
