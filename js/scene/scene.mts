// Copyright 2018 The Immersive Web Community Group
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

import { Renderer } from '../render/core/renderer.mjs';
import { InputRenderer } from './nodes/input-renderer.mjs';
import { StatsViewer } from './nodes/stats-viewer.mjs';
import { Node } from './node.mjs';
import { vec3, quat, mat4, Ray } from '../math/gl-matrix.mjs';

export class Scene {
  root = new Node("__root__");
  private _timestamp: number = -1;
  private _frameDelta: number = 0;
  private _statsStanding: boolean = false;
  private _statsEnabled: boolean = false;
  private _stats: StatsViewer | null = null;
  private _inputRenderer: InputRenderer | null;
  private _resetInputEndFrame: boolean = true;
  private _hoverFrame: number = 0;
  private _hoveredNodes: Node[] = [];
  clear: boolean = true;
  constructor() {
    this.enableStats(true); // Ensure the stats are added correctly by default.
    this._inputRenderer = null;
  }

  get inputRenderer() {
    if (!this._inputRenderer) {
      this._inputRenderer = new InputRenderer();
      this.root.addNode(this._inputRenderer);
    }
    return this._inputRenderer;
  }

  // Helper function that automatically adds the appropriate visual elements for
  // all input sources.
  updateInputSources(frame: XRFrame, refSpace: XRReferenceSpace) {
    let newHoveredNodes = [];
    let lastHoverFrame = this._hoverFrame;
    this._hoverFrame++;

    for (let inputSource of frame.session.inputSources) {
      let targetRayPose = frame.getPose(inputSource.targetRaySpace, refSpace);

      if (!targetRayPose) {
        continue;
      }

      if (inputSource.targetRayMode == 'tracked-pointer') {
        // If we have a pointer matrix and the pointer origin is the users
        // hand (as opposed to their head or the screen) use it to render
        // a ray coming out of the input device to indicate the pointer
        // direction.
        this.inputRenderer.addLaserPointer(targetRayPose.transform);
      }

      // If we have a pointer matrix we can also use it to render a cursor
      // for both handheld and gaze-based input sources.

      // Check and see if the pointer is pointing at any selectable objects.
      let hitResult = this.root.hitTest(targetRayPose.transform);
      if (hitResult) {
        // Render a cursor at the intersection point.
        this.inputRenderer.addCursor(hitResult.intersection);

        if (hitResult.node._hoverFrameId != lastHoverFrame) {
          hitResult.node.onHoverStart();
        }
        hitResult.node._hoverFrameId = this._hoverFrame;
        newHoveredNodes.push(hitResult.node);
      } else {
        // Statically render the cursor 1 meters down the ray since we didn't
        // hit anything selectable.
        let targetRay = new Ray(new mat4(targetRayPose.transform.matrix));
        const cursorPos = targetRay.advance(1.0)
        this.inputRenderer.addCursor(cursorPos);
      }

      if (inputSource.gripSpace) {
        let gripPose = frame.getPose(inputSource.gripSpace, refSpace);

        // Any time that we have a grip matrix, we'll render a controller.
        if (gripPose) {
          this.inputRenderer.addController(gripPose.transform.matrix, inputSource.handedness);
        }
      }
    }

    for (let hoverNode of this._hoveredNodes) {
      if (hoverNode._hoverFrameId != this._hoverFrame) {
        hoverNode.onHoverEnd();
      }
    }

    this._hoveredNodes = newHoveredNodes;
  }

  handleSelect(inputSource: XRInputSource, frame: XRFrame, refSpace: XRReferenceSpace) {
    let targetRayPose = frame.getPose(inputSource.targetRaySpace, refSpace);

    if (!targetRayPose) {
      return;
    }

    this.handleSelectPointer(targetRayPose.transform);
  }

  handleSelectPointer(rigidTransform: XRRigidTransform) {
    if (rigidTransform) {
      // Check and see if the pointer is pointing at any selectable objects.
      let hitResult = this.root.hitTest(rigidTransform);

      if (hitResult) {
        // Render a cursor at the intersection point.
        hitResult.node.handleSelect();
      }
    }
  }

  enableStats(enable: boolean) {
    if (enable == this._statsEnabled) {
      return;
    }

    this._statsEnabled = enable;

    if (enable) {
      this._stats = new StatsViewer();
      this._stats.selectable = true;
      this.root.addNode(this._stats);

      if (this._statsStanding) {
        this._stats.local.translation = vec3.fromValues(0, 1.4, -0.75);
      } else {
        this._stats.local.translation = vec3.fromValues(0, -0.3, -0.5);
      }
      this._stats.local.scale = vec3.fromValues(0.3, 0.3, 0.3);
      this._stats.local.rotation = quat.fromEuler(-45.0, 0.0, 0.0);
    } else if (!enable) {
      if (this._stats) {
        this.root.removeNode(this._stats);
        this._stats = null;
      }
    }
  }

  standingStats(enable: boolean) {
    this._statsStanding = enable;
    if (this._stats) {
      if (this._statsStanding) {
        this._stats.local.translation = vec3.fromValues(0, 1.4, -0.75);
      } else {
        this._stats.local.translation = vec3.fromValues(0, -0.3, -0.5);
      }
      this._stats.local.scale = vec3.fromValues(0.3, 0.3, 0.3);
      this._stats.local.rotation = quat.fromEuler(-45.0, 0.0, 0.0);
    }
  }

  /** Draws the scene into the base layer of the XRFrame's session */
  // drawXRFrame(xrFrame: XRFrame, pose?: XRRigidTransform) {
  //   if (!this._renderer || !pose) {
  //     return;
  //   }
  //
  //   let gl = this._renderer.gl;
  //   let session = xrFrame.session;
  //   // Assumed to be a XRWebGLLayer for now.
  //   let layer = session.renderState.baseLayer;
  //   if (!layer)
  //     layer = session.renderState.layers[0];
  //   else {
  //     // only baseLayer has framebuffer and we need to bind it
  //     // even if it is null (for inline sessions)
  //     gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
  //   }
  //
  //   if (!gl) {
  //     return;
  //   }
  //
  //   if (layer.colorTexture) {
  //     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, layer.colorTexture, 0);
  //   }
  //   if (layer.depthStencilTexture) {
  //     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, layer.depthStencilTexture, 0);
  //   }
  //
  //   if (this.clear) {
  //     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //   }
  //
  //   let views: WebXRView[] = [];
  //   for (let view of pose.views) {
  //     views.push(new WebXRView(view, layer));
  //   }
  //
  //   this.drawViewArray(views);
  // }

  startFrame(time: number, refspace: XRReferenceSpace, frame: XRFrame) {
    let prevTimestamp = this._timestamp;
    this._timestamp = time;
    if (this._stats) {
      this._stats.begin();
    }

    if (prevTimestamp >= 0) {
      this._frameDelta = this._timestamp - prevTimestamp;
    } else {
      this._frameDelta = 0;
    }

    this.root.update(this._timestamp, this._frameDelta, refspace, frame);
  }

  endFrame() {
    if (this._inputRenderer && this._resetInputEndFrame) {
      this._inputRenderer.reset({});
    }

    if (this._stats) {
      this._stats.end();
    }
  }

  // Override to load scene resources on construction or context restore.
  onLoadScene(renderer: Renderer) {
    return Promise.resolve();
  }
}
