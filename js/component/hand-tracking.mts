/**
 * https://immersive-web.github.io/webxr-hand-input/
 */
import { mat4, Transform } from '../math/gl-matrix.mjs';
import { World, Entity } from '../third-party/uecs-0.4.2/index.mjs';
import { SimpleMaterial } from '../materials/simple.mjs';
import { BoxBuilder } from '../geometry/box-builder.mjs';
import { HoverActive } from './hover.mjs';

const PINCH_START_DISTANCE = 0.015;
const PINCH_END_DISTANCE = 0.03;

class Pinch {
  delta: mat4;
  constructor(
    public readonly mover: Transform,
    public readonly target: Transform) {

    console.log('Pinch', mover, target);

    this.delta = this.mover.matrix.copy()
    this.delta.invert({ out: this.delta });
    this.delta.mul(this.target.matrix, { out: this.delta });
  }

  end() {
    console.log('Pinch.end');
  }

  update() {
    this.mover.matrix.mul(this.delta, { out: this.target.matrix });
    this.target.invalidate();
  }
}


class PinchStatus {
  isPinch = false;
  pinches: Pinch[] = []

  enable(world: World, tip: Transform) {
    this.isPinch = true;

    world.view(Transform, HoverActive).each((_, hoverTransform, hover) => {
      if (hoverTransform == tip) {
        hover.status._last.forEach((passive: Entity) => {
          const passiveTransform = world.get(passive, Transform);
          if (passiveTransform) {
            this.pinches.push(new Pinch(tip, passiveTransform));
          }
        });
      }
    });
  }

  disable() {
    this.isPinch = false;
    for (const pinch of this.pinches) {
      pinch.end();
    }
    this.pinches = [];
  }

  update(world: World, thumbTip: Transform, indexTip: Transform) {
    const distance = indexTip.matrix.getTranslation().distance(
      thumbTip.matrix.getTranslation());
    if (!this.isPinch) {
      if (distance < PINCH_START_DISTANCE) {
        this.enable(world, indexTip);
      }
    }
    else {
      if (distance > PINCH_END_DISTANCE) {
        this.disable();
      }
    }
    for (const pinch of this.pinches) {
      pinch.update();
    }
  }
}


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
export class HandTracking {
  private _radii = new Float32Array(25);
  private _positions = new Float32Array(16 * 25);
  private _indexPinch = new PinchStatus();

  static get requiredFeature(): string {
    return 'hand-tracking';
  }

  constructor(public readonly hand: 'left' | 'right',
    public joints: Transform[]) {
  }

  static async factory(world: World,
    hand: 'left' | 'right'
  ): Promise<void> {

    const material = new SimpleMaterial();

    const boxBuilder = new BoxBuilder();
    boxBuilder.pushCube([0, 0, 0], 0.01);
    const primitive = boxBuilder.finishPrimitive(material);

    const joints: Transform[] = [];
    for (let i = 0; i < 24; i++) {
      const transform = new Transform();
      if (i == 9) {
        world.create(transform, primitive, new HoverActive());
      }
      else {
        world.create(transform, primitive);
      }
      joints.push(transform);
    }

    world.create(new HandTracking(hand, joints));

    return Promise.resolve();
  }

  static system(world: World, time: number, delta: number,
    refSpace: XRReferenceSpace, frame: XRFrame,
    inputSources: XRInputSourceArray) {

    world.view(HandTracking).each((_, handTracking) => {
      for (const inputSource of inputSources) {
        handTracking._updateInput(refSpace, frame, inputSource);
        handTracking._updatePinch(world);
      }
    });
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

  _updatePinch(world: World) {
    const thumbTip = this.joints[4];
    const indexTip = this.joints[9];
    this._indexPinch.update(world, thumbTip, indexTip);
  }
}
