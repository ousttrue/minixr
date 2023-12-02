// Copyright 2019 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

/*
Provides a simple method for tracking which XRReferenceSpace is associated with
which XRSession. Also handles the necessary logic for enabling mouse/touch-based
view rotation for inline sessions if desired.
*/

import { vec3, mat4 } from '../../../lib/math/gl-matrix.mjs';

const toOrigin = mat4.fromTranslation(0, 1.6, 0)
const restorOrigin = mat4.fromTranslation(0, -1.6, 0)

export class InlineViewerHelper {
  matrix = mat4.identity();
  xform = new XRRigidTransform();

  baseRefSpace: XRReferenceSpace;
  refSpace: XRReferenceSpace;

  // Keep track of touch-related state so that users can touch and drag on
  // the canvas to adjust the viewer pose in an inline session.
  primaryTouch: number | null = null;
  middleTouch: number | null = null;
  prevTouchX: number = 0;
  prevTouchY: number = 0;

  constructor(
    public readonly canvas: HTMLCanvasElement,
    referenceSpace: XRReferenceSpace) {

    this.canvas = canvas;
    this.baseRefSpace = referenceSpace;
    this.refSpace = referenceSpace;

    // canvas.style.cursor = 'grab';

    canvas.addEventListener('mousemove', (event) => {
      // Only rotate when the left button is pressed
      if (event.buttons & 1) {
        this.rotateView(event.movementX, event.movementY);
      }
      if (event.buttons & 4) {
        this.shiftView(event.movementX, event.movementY);
      }
    });

    // canvas.addEventListener("touchstart", (event) => {
    //   if (this.primaryTouch == null) {
    //     let touch = event.changedTouches[0];
    //     this.primaryTouch = touch.identifier;
    //     this.prevTouchX = touch.pageX;
    //     this.prevTouchY = touch.pageY;
    //   }
    //   if (this.middleTouch == null) {
    //     let touch = event.changedTouches[2];
    //     this.middleTouch = touch.identifier;
    //     this.prevTouchX = touch.pageX;
    //     this.prevTouchY = touch.pageY;
    //   }
    // });
    //
    // canvas.addEventListener("touchend", (event) => {
    //   for (let touch of event.changedTouches) {
    //     if (this.primaryTouch == touch.identifier) {
    //       this.primaryTouch = null;
    //       this.rotateView(touch.pageX - this.prevTouchX, touch.pageY - this.prevTouchY);
    //     }
    //     if (this.middleTouch == touch.identifier) {
    //       this.middleTouch = null;
    //       this.rotateView(touch.pageX - this.prevTouchX, touch.pageY - this.prevTouchY);
    //     }
    //   }
    // });
    //
    // canvas.addEventListener("touchcancel", (event) => {
    //   for (let touch of event.changedTouches) {
    //     if (this.primaryTouch == touch.identifier) {
    //       this.primaryTouch = null;
    //     }
    //     if (this.middleTouch == touch.identifier) {
    //       this.middleTouch = null;
    //     }
    //   }
    // });
    //
    // canvas.addEventListener("touchmove", (event) => {
    //   for (let touch of event.changedTouches) {
    //     if (this.primaryTouch == touch.identifier) {
    //       this.rotateView(touch.pageX - this.prevTouchX, touch.pageY - this.prevTouchY);
    //       this.prevTouchX = touch.pageX;
    //       this.prevTouchY = touch.pageY;
    //     }
    //     if (this.middleTouch == touch.identifier) {
    //       this.shiftView(touch.pageX - this.prevTouchX, touch.pageY - this.prevTouchY);
    //       this.prevTouchX = touch.pageX;
    //       this.prevTouchY = touch.pageY;
    //     }
    //   }
    // });

    document.addEventListener("wheel", (event: WheelEvent) => {
      this.dollyView(event.deltaY);
    });
  }

  // setHeight(value: number) {
  //   if (this.viewerHeight != value) {
  //     this.viewerHeight = value;
  //   }
  //   this.dirty = true;
  // }

  rotateView(dx: number, dy: number) {
    const LOOK_SPEED = -0.004;
    this.matrix.rotateY(dx * LOOK_SPEED);
    this.matrix.rotateX(dy * LOOK_SPEED);
  }

  shiftView(dx: number, dy: number) {
    const d = -0.005;
    {
      const dir = this.matrix.getX();
      this.matrix.m30 += dir.x * dx * d;
      this.matrix.m31 += dir.y * dx * d;
      this.matrix.m32 += dir.z * dx * d;
    }
    {
      const dir = this.matrix.getY();
      this.matrix.m30 -= dir.x * dy * d;
      this.matrix.m31 -= dir.y * dy * d;
      this.matrix.m32 -= dir.z * dy * d;
    }
  }

  dollyView(delta: number) {

    let d = 0.1;
    if (delta > 0) {
      d = -d;
    }
    else if (delta < 0) {
    }
    else {
      // 0
      return;
    }

    const dir = this.matrix.getZ();
    this.matrix.m30 -= dir.x * d;
    this.matrix.m31 -= dir.y * d;
    this.matrix.m32 -= dir.z * d;
  }

  reset() {
    this.refSpace = this.baseRefSpace;
  }

  // XRReferenceSpace offset is immutable, so return a new reference space
  // that has an updated orientation.
  get referenceSpace(): XRReferenceSpace {
    // tmp.mul(this.matrix, {out: tmp});
    const dst = new mat4(this.xform.matrix);
    this.matrix.invert({ out: dst });
    toOrigin.mul(dst, { out: dst });
    dst.mul(restorOrigin, { out: dst });
    // dst.mul(tmp, { out: dst });
    this.refSpace = this.baseRefSpace.getOffsetReferenceSpace(this.xform);
    return this.refSpace;
  }
}
