/**
 * https://immersive-web.github.io/webxr-hand-input/
 */
import { Node, HoverActiveStartEvent } from '../nodes/node.mjs';
import { mat4, Transform } from '../../math/gl-matrix.mjs';
import { World } from '../../third-party/uecs-0.4.2/index.mjs';

const PINCH_START_DISTANCE = 0.015;
const PINCH_END_DISTANCE = 0.03;

export class PinchStartEvent extends Event {
  constructor(
    public readonly finger: number) {
    super('pinch-start');
  }
}

export class PinchEndEvent extends Event {
  constructor(
    public readonly finger: number) {
    super('pinch-end');
  }
}

// class Pinch {
//   delta: mat4;
//   constructor(
//     public readonly mover: Node,
//     public readonly target: Node) {
//
//     console.log('Pinch', mover, target);
//
//     this.delta = this.mover.local.matrix.copy()
//     this.delta.invert({ out: this.delta });
//     this.delta.mul(this.target.local.matrix, { out: this.delta });
//   }
//
//   update() {
//     this.mover.local.matrix.mul(this.delta, { out: this.target.local.matrix });
//     this.target.local.invalidate();
//   }
// }


/**
 *
 *     -(20)-(21)-(22)-(23)-(24) (little)
 *    /-(14)-(16)-(17)-(18)-(19) (ring) 
 *(00<--(10)-(11)-(12)-(13)-(14) (middle)
 * h  \-(05)-(06)-(07)-(08)-(09) (index)
 * a   -(01)-(02)-(03)-(04) (thumb)
 * n
 * d 
 *
 * 09, 14, 19, 24 has hittest:active to hittest:passive
 */
export class HandTracking extends EventTarget {
  private _radii = new Float32Array(25);
  private _positions = new Float32Array(16 * 25);

  // // @ts-ignore
  // private _thumbTip: Node;
  // // @ts-ignore
  // private _indexTip: Node;
  // private _indexPinch = false;
  // _hoverList: Set<Node> = new Set();
  // _pinches: Pinch[] = []

  constructor(public readonly hand: 'left' | 'right',
    public joints: Transform[]) {
    super();

    // for (let i = 0; i < nodes.length; ++i) {
    //   const node = nodes[i];
    //   switch (i) {
    //     case 4:
    //       this._thumbTip = node;
    //       break;
    //     case 9: // index
    //       node.action = 'active';
    //       this._indexTip = node;
    //       node.addEventListener('hover-active-start',
    //         (evt: Event) => {
    //           this._hoverList.add((evt as HoverActiveStartEvent).passive);
    //           console.log('hover-active', this._hoverList);
    //         });
    //       node.addEventListener('hover-active-end',
    //         (evt: Event) => {
    //           this._hoverList.delete((evt as HoverActiveStartEvent).passive);
    //         });
    //       node.addEventListener('pinch-start',
    //         (_evt: Event) => {
    //           if (this._hoverList.size > 0) {
    //             this._hoverList.forEach(hover => {
    //               this._pinches.push(new Pinch(node, hover));
    //             });
    //           }
    //         });
    //       break;
    //     // case 14: // middle
    //     // case 19: // ring
    //     // case 24: // little
    //   }
    // }
  }

  static system(world: World, time: number, delta: number,
    refSpace: XRReferenceSpace, frame: XRFrame,
    inputSources: XRInputSourceArray) {

    world.view(HandTracking).each((_, handTracking) => {
      for (const inputSource of inputSources) {
        handTracking._updateInput(refSpace, frame, inputSource);
      }
    });

    // var distance = this._indexTip.local.matrix.getTranslation().distance(
    //   this._thumbTip.local.matrix.getTranslation());
    // if (!this._indexPinch) {
    //   if (distance < PINCH_START_DISTANCE) {
    //     this._indexPinch = true;
    //     this._indexTip.dispatchEvent(new PinchStartEvent(9));
    //   }
    // }
    // else {
    //   if (distance > PINCH_END_DISTANCE) {
    //     this._indexPinch = false;
    //     this._indexTip.dispatchEvent(new PinchEndEvent(9));
    //     this._pinches = [];
    //   }
    // }

    // for (const pinch of this._pinches) {
    //   pinch.update();
    // }
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
    for (const transform of this.joints) {
      let matrix = new mat4(this._positions.slice(offset, offset + 16));
      transform.matrix = matrix;
      offset += 16;
    }
  }
}
