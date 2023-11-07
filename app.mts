import { Scene } from './js/render/scenes/scene.mjs';
import { Node } from './js/render/core/node.mjs';
import { Renderer, createWebGLContext } from './js/render/core/renderer.mjs';
import { Gltf2Node } from './js/render/nodes/gltf2.mjs';
import { BoxBuilder } from './js/render/geometry/box-builder.mjs';
import { PbrMaterial } from './js/render/materials/pbr.mjs';
import { mat4 } from './js/render/math/gl-matrix.mjs';
import { vec3 } from './js/render/math/gl-matrix.mjs';
import { Ray } from './js/render/math/ray.mjs';


// XR globals.
let radii = new Float32Array(25);
let positions = new Float32Array(16 * 25);

// Boxes
const defaultBoxColor = { r: 0.5, g: 0.5, b: 0.5 };
const leftBoxColor = { r: 1, g: 0, b: 1 };
const rightBoxColor = { r: 0, g: 1, b: 1 };


export default class App {
  xrRefSpace: XRReferenceSpace | null = null;

  boxes_left: Node[] = [];
  boxes_right: Node[] = [];
  boxes: { left: Node[], right: Node[] } = { left: this.boxes_left, right: this.boxes_right };
  interactionBox: Node | null = null;
  leftInteractionBox: Node | null = null;
  rightInteractionBox: Node | null = null;
  indexFingerBoxes: { left: Node | null, right: Node | null } = { left: null, right: null };

  scene: Scene;
  gl: WebGL2RenderingContext;
  renderer: Renderer;

  constructor(session: XRSession) {
    this.scene = new Scene();
    this.scene.addNode(new Gltf2Node({ url: './assets/gltf/space/space.gltf' }));

    session.addEventListener('visibilitychange', e => {
      // remove hand controller while blurred
      if (e.session.visibilityState === 'visible-blurred') {
        for (const box of this.boxes['left']) {
          this.scene.removeNode(box);
        }
        for (const box of this.boxes['right']) {
          this.scene.removeNode(box);
        }
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

    this.initHands();

    // Set the scene's renderer, which creates the necessary GPU resources.
    this.scene.setRenderer(this.renderer);

    // Use the new WebGL context to create a XRWebGLLayer and set it as the
    // sessions baseLayer. This allows any content rendered to the layer to
    // be displayed on the XRDevice.
    session.updateRenderState({ baseLayer: new XRWebGLLayer(session, this.gl) });
  }

  createBoxPrimitive(r: number, g: number, b: number) {
    let boxBuilder = new BoxBuilder();
    boxBuilder.pushCube([0, 0, 0], 1);
    let boxPrimitive = boxBuilder.finishPrimitive(this.renderer);
    let boxMaterial = new PbrMaterial();
    boxMaterial.baseColorFactor.value = [r, g, b, 1];
    return this.renderer.createRenderPrimitive(boxPrimitive, boxMaterial);
  }

  addBox(
    x: number, y: number, z: number,
    r: number, g: number, b: number): Node {
    let boxRenderPrimitive = this.createBoxPrimitive(r, g, b);
    let boxNode = new Node();
    boxNode.addRenderPrimitive(boxRenderPrimitive);
    // Marks the node as one that needs to be checked when hit testing.
    boxNode.selectable = true;
    return boxNode;
  }

  initHands() {
    for (const box of this.boxes_left) {
      this.scene.removeNode(box);
    }
    for (const box of this.boxes_right) {
      this.scene.removeNode(box);
    }
    this.boxes_left = [];
    this.boxes_right = [];
    this.boxes = { left: this.boxes_left, right: this.boxes_right };
    if (typeof XRHand !== 'undefined') {
      for (let i = 0; i <= 24; i++) {
        const r = .6 + Math.random() * .4;
        const g = .6 + Math.random() * .4;
        const b = .6 + Math.random() * .4;
        this.boxes_left.push(this.addBox(0, 0, 0, r, g, b));
        this.boxes_right.push(this.addBox(0, 0, 0, r, g, b));
      }
    }
    if (this.indexFingerBoxes.left) {
      this.scene.removeNode(this.indexFingerBoxes.left);
    }
    if (this.indexFingerBoxes.right) {
      this.scene.removeNode(this.indexFingerBoxes.right);
    }
    this.indexFingerBoxes.left = this.addBox(0, 0, 0, leftBoxColor.r, leftBoxColor.g, leftBoxColor.b);
    this.indexFingerBoxes.right = this.addBox(0, 0, 0, rightBoxColor.r, rightBoxColor.g, rightBoxColor.b);
  }

  async initAsync(session: XRSession) {

    // Get a frame of reference, which is required for querying poses. In
    // this case an 'local' frame of reference means that all poses will
    // be relative to the location where the XRDevice was first detected.
    const refSpace = await session.requestReferenceSpace('local');

    this.xrRefSpace = refSpace.getOffsetReferenceSpace(
      new XRRigidTransform({ x: 0, y: 0, z: 0 }));
  }

  onXRFrame(t: number, frame: XRFrame) {
    const xrRefSpace = this.xrRefSpace!

    let session = frame.session;

    // Per-frame scene setup. Nothing WebXR specific here.
    this.scene.startFrame();

    // Inform the session that we're ready for the next frame.
    session.requestAnimationFrame((t, f) => this.onXRFrame(t, f));

    this.updateInputSources(session, frame, xrRefSpace);
    this.UpdateInteractables(t);

    // Get the XRDevice pose relative to the Frame of Reference we created
    // earlier.
    let pose = frame.getViewerPose(xrRefSpace);

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

  updateInputSources(session: XRSession, frame: XRFrame, refSpace: XRReferenceSpace) {
    if (session.visibilityState === 'visible-blurred') {
      return;
    }
    for (let inputSource of session.inputSources) {
      let targetRayPose = frame.getPose(inputSource.targetRaySpace, refSpace);
      if (targetRayPose) {
        if (inputSource.targetRayMode == 'tracked-pointer') {
          this.scene.inputRenderer.addLaserPointer(targetRayPose.transform);
        }

        let targetRay = new Ray(targetRayPose.transform);
        let cursorDistance = 2.0;
        let cursorPos = vec3.fromValues(
          targetRay.origin.x,
          targetRay.origin.y,
          targetRay.origin.z
        );
        vec3.add(cursorPos, cursorPos, [
          targetRay.direction.x * cursorDistance,
          targetRay.direction.y * cursorDistance,
          targetRay.direction.z * cursorDistance,
        ]);

        this.scene.inputRenderer.addCursor(cursorPos);
      }

      let offset = 0;
      if (!inputSource.hand) {
        continue;
      } else {
        for (const box of this.boxes[inputSource.handedness]) {
          this.scene.removeNode(box);
        }

        let pose = frame.getPose(inputSource.targetRaySpace, refSpace);
        if (pose === undefined) {
          console.log("no pose");
        }

        if (!frame.fillJointRadii(inputSource.hand.values(), radii)) {
          console.log("no fillJointRadii");
          continue;
        }
        if (!frame.fillPoses(inputSource.hand.values(), refSpace, positions)) {
          console.log("no fillPoses");
          continue;
        }
        for (const box of this.boxes[inputSource.handedness]) {
          this.scene.addNode(box);
          let matrix = positions.slice(offset * 16, (offset + 1) * 16);
          let jointRadius = radii[offset];
          offset++;
          mat4.getTranslation(box.translation, matrix);
          mat4.getRotation(box.rotation, matrix);
          box.scale = [jointRadius, jointRadius, jointRadius];
        }

        // Render a special box for each index finger on each hand	
        const indexFingerBox = this.indexFingerBoxes[inputSource.handedness];
        this.scene.addNode(indexFingerBox);
        let joint = inputSource.hand.get('index-finger-tip');
        let jointPose = frame.getJointPose(joint, this.xrRefSpace);
        if (jointPose) {
          let matrix = jointPose.transform.matrix;
          mat4.getTranslation(indexFingerBox.translation, matrix);
          mat4.getRotation(indexFingerBox.rotation, matrix);
          indexFingerBox.scale = [0.02, 0.02, 0.02];
        }
      }
    }
  }

  UpdateInteractables(time: number) {
    // Add scene objects if not present
    if (!this.interactionBox) {
      // Add box to demonstrate hand interaction
      const AddInteractionBox = (r: number, g: number, b: number): Node => {
        let box = new Node();
        box.addRenderPrimitive(this.createBoxPrimitive(r, g, b));
        box.translation = [0, 0, -0.65];
        box.scale = [0.25, 0.25, 0.25];
        return box;
      };

      this.interactionBox = AddInteractionBox(defaultBoxColor.r, defaultBoxColor.g, defaultBoxColor.b);
      this.leftInteractionBox = AddInteractionBox(leftBoxColor.r, leftBoxColor.g, leftBoxColor.b);
      this.rightInteractionBox = AddInteractionBox(rightBoxColor.r, rightBoxColor.g, rightBoxColor.b);
      this.scene.addNode(this.interactionBox);
      this.scene.addNode(this.leftInteractionBox);
      this.scene.addNode(this.rightInteractionBox);
    }

    this._UpdateInteractables(time,
      this.interactionBox!,
      this.leftInteractionBox!,
      this.rightInteractionBox!,
      this.indexFingerBoxes);
  }

  _UpdateInteractables(time: number,
    interactionBox: Node,
    leftInteractionBox: Node,
    rightInteractionBox: Node,
    indexFingerBoxes: { left: Node, right: Node }
  ) {

    function Distance(nodeA: Node, nodeB: Node): number {
      return Math.sqrt(
        Math.pow(nodeA.translation[0] - nodeB.translation[0], 2) +
        Math.pow(nodeA.translation[1] - nodeB.translation[1], 2) +
        Math.pow(nodeA.translation[2] - nodeB.translation[2], 2));
    }

    // Perform distance check on interactable elements
    const interactionDistance = interactionBox.scale[0];
    leftInteractionBox.visible = false;
    rightInteractionBox.visible = false;
    if (Distance(indexFingerBoxes.left, interactionBox) < interactionDistance) {
      leftInteractionBox.visible = true;
    } else if (Distance(indexFingerBoxes.right, interactionBox) < interactionDistance) {
      rightInteractionBox.visible = true;
    }
    interactionBox.visible = !(leftInteractionBox.visible || rightInteractionBox.visible);

    mat4.rotateX(interactionBox.matrix, interactionBox.matrix, time / 1000);
    mat4.rotateY(interactionBox.matrix, interactionBox.matrix, time / 1500);
    leftInteractionBox.matrix = interactionBox.matrix;
    rightInteractionBox.matrix = interactionBox.matrix;
  }
}
