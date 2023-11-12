import { Node } from './js/scene/node.mjs';
import { vec3, mat4 } from './js/math/gl-matrix.mjs';
import { BoxBuilder } from './js/scene/geometry/box-builder.mjs';
import { PbrMaterial } from './js/scene/pbr.mjs';


function addBox(
  name: string,
  r: number, g: number, b: number): Node {

  const boxBuilder = new BoxBuilder();
  boxBuilder.pushCube([0, 0, 0], 1);
  const boxMaterial = new PbrMaterial();
  boxMaterial.baseColorFactor.value = [r, g, b, 1];
  const boxRenderPrimitive = boxBuilder.finishPrimitive(boxMaterial);

  const boxNode = new Node(name);
  boxNode.primitives.push(boxRenderPrimitive);
  // Marks the node as one that needs to be checked when hit testing.
  boxNode.selectable = true;
  return boxNode;
}


export class Hand {
  boxes: Node[] = [];
  indexFingerBoxes: Node;
  private _radii = new Float32Array(25);
  private _positions = new Float32Array(16 * 25);

  constructor(
    color: { r: number, g: number, b: number }) {
    for (let i = 0; i <= 24; i++) {
      const r = .6 + Math.random() * .4;
      const g = .6 + Math.random() * .4;
      const b = .6 + Math.random() * .4;
      this.boxes.push(addBox(`f${i}`, r, g, b));
    }
    this.indexFingerBoxes = addBox('index', color.r, color.g, color.b);
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
      // console.log("no fillJointRadii");
      return;
    }
    // @ts-ignore
    if (!frame.fillPoses(inputSource.hand.values(), refSpace, this._positions)) {
      // console.log("no fillPoses");
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
