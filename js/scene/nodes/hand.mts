/**
 * https://immersive-web.github.io/webxr-hand-input/
 */
import { Node } from './node.mjs';
import { vec3, mat4 } from '../../math/gl-matrix.mjs';
import { BoxBuilder } from '../geometry/box-builder.mjs';
import { SimpleMaterial } from '../materials/simple.mjs';


/**
 *
 *     -(20)-(21)-(22)-(23)-(24) (little)
 *    /-(14)-(16)-(17)-(18)-(19) (ring) 
 *(00<--(10)-(11)-(12)-(13)-(14) (middle)
 * h  \-(05)-(06)-(07)-(08)-(09) (index)
 * a   -(01)-(02)-(03)-(04) (thumb)
 * n
 * d 
 */
export class Hand extends Node {
  private _joints: Node[] = [];
  private _radii = new Float32Array(25);
  private _positions = new Float32Array(16 * 25);

  constructor(public readonly hand: 'left' | 'right') {
    super(hand);

    const r = .6 + Math.random() * .4;
    const g = .6 + Math.random() * .4;
    const b = .6 + Math.random() * .4;

    const material = new SimpleMaterial();

    const boxBuilder = new BoxBuilder();
    boxBuilder.pushCube([0, 0, 0], 0.01);
    const primitive = boxBuilder.finishPrimitive(material);

    for (let i = 0; i < 24; i++) {
      const node = new Node(`${hand}${i}`);
      node.primitives.push(primitive);
      this._joints.push(node);
      this.addNode(node);
    }
  }

  _onUpdate(time: number, delta: number, refSpace: XRReferenceSpace, frame: XRFrame,
    inputSources: XRInputSourceArray) {

    for (const inputSource of inputSources) {
      this._updateInput(refSpace, frame, inputSource);
    }
  }

  _updateInput(refSpace: XRReferenceSpace, frame: XRFrame, inputSource: XRInputSource) {
    const hand = inputSource.hand;
    if (!hand) {
      return;
    }

    if (inputSource.handedness != this.hand) {
      return;
    }

    // frame pose
    let pose = frame.getPose(inputSource.targetRaySpace, refSpace);
    if (pose === undefined) {
      console.log("no pose");
    }
    // @ts-ignore
    if (!frame.fillJointRadii(hand.values(), this._radii)) {
      // console.log("no fillJointRadii");
      return;
    }
    // @ts-ignore
    if (!frame.fillPoses(hand.values(), refSpace, this._positions)) {
      // console.log("no fillPoses");
      return;
    }

    let offset = 0;
    for (const box of this._joints) {
      let matrix = new mat4(this._positions.slice(offset, offset + 16));
      box.local.matrix = matrix;
      offset += 16;
    }
  }
}
