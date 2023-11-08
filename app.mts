import { Scene } from './js/render/scenes/scene.mjs';
import { Node } from './js/render/core/node.mjs';
import { Renderer, createWebGLContext } from './js/render/core/renderer.mjs';
import { Gltf2Node } from './js/render/nodes/gltf2.mjs';
import { vec3 } from './js/render/math/gl-matrix.mjs';
import { Ray } from './js/render/math/ray.mjs';
import Hand from './hand.mjs';

// Boxes
const leftBoxColor = { r: 1, g: 0, b: 1 };
const rightBoxColor = { r: 0, g: 1, b: 1 };

export default class App {
  xrRefSpace: XRReferenceSpace | null = null;

  leftHand: Hand;
  rightHand: Hand;

  interactionBox: Node | null = null;

  scene: Scene;
  gl: WebGL2RenderingContext;
  renderer: Renderer;

  constructor(session: XRSession) {
    this.scene = new Scene();
    this.scene.addNode(new Gltf2Node({ url: './assets/gltf/space/space.gltf' }));

    session.addEventListener('visibilitychange', e => {
      // remove hand controller while blurred
      if (e.session.visibilityState === 'visible-blurred') {
        this.leftHand.disable(this.scene);
        this.rightHand.disable(this.scene);
      }
    });

    // Create a WebGL context to render with, initialized to be compatible
    // with the XRDisplay we're presenting to.
    this.gl = createWebGLContext({
      xrCompatible: true
    }) as WebGL2RenderingContext;

    // Create a renderer with that GL context (this is just for the samples
    // framework and has nothing to do with WebXR specifically.)
    this.renderer = new Renderer(this.gl);

    this.leftHand = new Hand(this.scene, this.renderer, leftBoxColor);
    this.rightHand = new Hand(this.scene, this.renderer, rightBoxColor);

    // Set the scene's renderer, which creates the necessary GPU resources.
    this.scene.setRenderer(this.renderer);

    // Use the new WebGL context to create a XRWebGLLayer and set it as the
    // sessions baseLayer. This allows any content rendered to the layer to
    // be displayed on the XRDevice.
    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, this.gl) });
  }

  async initSpace(session: XRSession) {

    // Get a frame of reference, which is required for querying poses. In
    // this case an 'local' frame of reference means that all poses will
    // be relative to the location where the XRDevice was first detected.
    const refSpace = await session.requestReferenceSpace('local');

    this.xrRefSpace = refSpace.getOffsetReferenceSpace(
      new XRRigidTransform({ x: 0, y: 0, z: 0 }));
  }

  onXRFrame(time: number, frame: XRFrame) {
    const refSpace = this.xrRefSpace!

    let session = frame.session;

    // Per-frame scene setup. Nothing WebXR specific here.
    this.scene.startFrame();

    // Inform the session that we're ready for the next frame.
    session.requestAnimationFrame((t, f) => this.onXRFrame(t, f));

    // update hand-tracking
    if (session.visibilityState === 'visible-blurred') {
      return;
    }

    for (let inputSource of session.inputSources) {
      if (inputSource.targetRaySpace) {
        this._updateRay(refSpace, frame, inputSource);
      }
      if (inputSource.hand) {
        switch (inputSource.handedness) {
          case 'left': this.leftHand.update(this.scene, refSpace, time, frame, inputSource); break;
          case 'right': this.rightHand.update(this.scene, refSpace, time, frame, inputSource); break;
          default: break;
        }
      }
    }

    // Get the XRDevice pose relative to the Frame of Reference we created
    // earlier.
    let pose = frame.getViewerPose(refSpace);

    // Getting the pose may fail if, for example, tracking is lost. So we
    // have to check to make sure that we got a valid pose before attempting
    // to render with it. If not in this case we'll just leave the
    // framebuffer cleared, so tracking loss means the scene will simply
    // disappear.
    if (pose) {
      const glLayer = session.renderState.baseLayer!;

      const gl = this.gl;

      // If we do have a valid pose, bind the WebGL layer's framebuffer,
      // which is where any content to be displayed on the XRDevice must be
      // rendered.
      gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);

      // Clear the framebuffer
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Loop through each of the views reported by the frame and draw them
      // into the corresponding viewport.
      for (let view of pose.views) {
        const viewport = glLayer.getViewport(view)!;
        gl.viewport(viewport.x, viewport.y,
          viewport.width, viewport.height);

        // Draw this view of the scene. What happens in this function really
        // isn't all that important. What is important is that it renders
        // into the XRWebGLLayer's framebuffer, using the viewport into that
        // framebuffer reported by the current view, and using the
        // projection matrix and view transform from the current view.
        // We bound the framebuffer and viewport up above, and are passing
        // in the appropriate matrices here to be used when rendering.
        this.scene.draw(view.projectionMatrix, view.transform);
      }
    } else {
      // There's several options for handling cases where no pose is given.
      // The simplest, which these samples opt for, is to simply not draw
      // anything. That way the device will continue to show the last frame
      // drawn, possibly even with reprojection. Alternately you could
      // re-draw the scene again with the last known good pose (which is now
      // likely to be wrong), clear to black, or draw a head-locked message
      // for the user indicating that they should try to get back to an area
      // with better tracking. In all cases it's possible that the device
      // may override what is drawn here to show the user it's own error
      // message, so it should not be anything critical to the application's
      // use.
    }

    // Per-frame scene teardown. Nothing WebXR specific here.
    this.scene.endFrame();
  }

  private _updateRay(refSpace: XRReferenceSpace, frame: XRFrame, inputSource: XRInputSource) {
    let targetRayPose = frame.getPose(inputSource.targetRaySpace, refSpace);
    if (targetRayPose) {
      if (inputSource.targetRayMode == 'tracked-pointer') {
        this.scene.inputRenderer.addLaserPointer(targetRayPose.transform);
      }

      let targetRay = new Ray(targetRayPose.transform.matrix);
      let cursorDistance = 2.0;
      let cursorPos = vec3.fromValues(
        targetRay.origin[0],
        targetRay.origin[1],
        targetRay.origin[2]
      );
      vec3.add(cursorPos, cursorPos, [
        targetRay.direction[0] * cursorDistance,
        targetRay.direction[1] * cursorDistance,
        targetRay.direction[2] * cursorDistance,
      ]);

      this.scene.inputRenderer.addCursor(cursorPos);
    }
  }
}
