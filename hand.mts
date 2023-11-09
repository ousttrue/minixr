import { Node } from './js/render/core/node.mjs';
import { Renderer } from './js/render/core/renderer.mjs';
import { vec3, mat4 } from './js/math/gl-matrix.mjs';
import { addBox } from './interaction.mjs';


export default class Hand {
  boxes: Node[] = [];
  indexFingerBoxes: Node;
  private _radii = new Float32Array(25);
  private _positions = new Float32Array(16 * 25);

  constructor(renderer: Renderer,
    color: { r: number, g: number, b: number }) {
    for (let i = 0; i <= 24; i++) {
      const r = .6 + Math.random() * .4;
      const g = .6 + Math.random() * .4;
      const b = .6 + Math.random() * .4;
      this.boxes.push(addBox(`f${i}`, renderer, r, g, b));
    }
    this.indexFingerBoxes = addBox('index', renderer, color.r, color.g, color.b);
  }

  disable(root: Node) {
    for (const box of this.boxes) {
      root.removeNode(box);
    }
    root.removeNode(this.indexFingerBoxes);
  }

  update(root: Node, refSpace: XRReferenceSpace, time: number, frame: XRFrame, inputSource: XRInputSource) {
    if (!inputSource.hand) {
      return;
    }

    // clear
    for (const box of this.boxes) {
      root.removeNode(box);
    }
    root.removeNode(this.indexFingerBoxes);

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
      root.addNode(box);
      let matrix = new mat4(this._positions.slice(offset * 16, (offset + 1) * 16));
      let jointRadius = this._radii[offset];
      offset++;
      box.local.translation = matrix.getTranslation();
      box.local.rotation = matrix.getRotation();
      box.local.scale = vec3.fromValues(jointRadius, jointRadius, jointRadius);
    }

    // Render a special box for each index finger on each hand	
    root.addNode(this.indexFingerBoxes);
    // @ts-ignore
    let joint = inputSource.hand.get('index-finger-tip');
    // @ts-ignore
    let jointPose = frame.getJointPose(joint, refSpace);
    if (jointPose) {
      let matrix = new mat4(jointPose.transform.matrix);
      this.indexFingerBoxes.local.translation = matrix.getTranslation();
      this.indexFingerBoxes.local.rotation = matrix.getRotation();
      this.indexFingerBoxes.local.scale = vec3.fromValues(0.02, 0.02, 0.02);
    }
  }
}
