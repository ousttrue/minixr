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

import { quat } from '../math/gl-matrix.mjs';

const LOOK_SPEED = 0.0025;

export class InlineViewerHelper {
  lookYaw = 0;
  lookPitch = 0;
  viewerHeight = 0;
  dirty = false;

  baseRefSpace: XRReferenceSpace;
  refSpace: XRReferenceSpace;

  // Keep track of touch-related state so that users can touch and drag on
  // the canvas to adjust the viewer pose in an inline session.
  primaryTouch: number | null = null;
  prevTouchX: number = 0;
  prevTouchY: number = 0;

  constructor(
    public readonly canvas: HTMLCanvasElement,
    referenceSpace: XRReferenceSpace) {

    this.canvas = canvas;
    this.baseRefSpace = referenceSpace;
    this.refSpace = referenceSpace;

    canvas.style.cursor = 'grab';

    canvas.addEventListener('mousemove', (event) => {
      // Only rotate when the left button is pressed
      if (event.buttons & 1) {
        this.rotateView(event.movementX, event.movementY);
      }
    });

    canvas.addEventListener("touchstart", (event) => {
      if (this.primaryTouch == null) {
        let touch = event.changedTouches[0];
        this.primaryTouch = touch.identifier;
        this.prevTouchX = touch.pageX;
        this.prevTouchY = touch.pageY;
      }
    });

    canvas.addEventListener("touchend", (event) => {
      for (let touch of event.changedTouches) {
        if (this.primaryTouch == touch.identifier) {
          this.primaryTouch = null;
          this.rotateView(touch.pageX - this.prevTouchX, touch.pageY - this.prevTouchY);
        }
      }
    });

    canvas.addEventListener("touchcancel", (event) => {
      for (let touch of event.changedTouches) {
        if (this.primaryTouch == touch.identifier) {
          this.primaryTouch = null;
        }
      }
    });

    canvas.addEventListener("touchmove", (event) => {
      for (let touch of event.changedTouches) {
        if (this.primaryTouch == touch.identifier) {
          this.rotateView(touch.pageX - this.prevTouchX, touch.pageY - this.prevTouchY);
          this.prevTouchX = touch.pageX;
          this.prevTouchY = touch.pageY;
        }
      }
    });
  }

  setHeight(value: number) {
    if (this.viewerHeight != value) {
      this.viewerHeight = value;
    }
    this.dirty = true;
  }

  rotateView(dx: number, dy: number) {
    this.lookYaw += dx * LOOK_SPEED;
    this.lookPitch += dy * LOOK_SPEED;
    if (this.lookPitch < -Math.PI * 0.5) {
      this.lookPitch = -Math.PI * 0.5;
    }
    if (this.lookPitch > Math.PI * 0.5) {
      this.lookPitch = Math.PI * 0.5;
    }
    this.dirty = true;
  }

  reset() {
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.refSpace = this.baseRefSpace;
    this.dirty = false;
  }

  // XRReferenceSpace offset is immutable, so return a new reference space
  // that has an updated orientation.
  get referenceSpace(): XRReferenceSpace {
    if (this.dirty) {
      // Represent the rotational component of the reference space as a
      // quaternion.
      let invOrient = new quat();
      invOrient.rotateX(-this.lookPitch, { out: invOrient });
      invOrient.rotateY(-this.lookYaw, { out: invOrient });
      let xform = new XRRigidTransform(
        {},
        { x: invOrient.x, y: invOrient.y, z: invOrient.z, w: invOrient.w });
      this.refSpace = this.baseRefSpace.getOffsetReferenceSpace(xform);
      xform = new XRRigidTransform({ y: -this.viewerHeight });
      this.refSpace = this.refSpace.getOffsetReferenceSpace(xform);
      this.dirty = false;
    }
    return this.refSpace;
  }
}
