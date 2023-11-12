import { Scene } from './js/scene/scene.mjs';
import { WebWorkerLoader } from './js/scene/loaders/webworkerloader.js';
import { Renderer, createWebGLContext } from './js/render/renderer.mjs';
import { vec3, quat, mat4, Ray } from './js/math/gl-matrix.mjs';
import { Interaction } from './interaction.mjs';
import { Hand } from './hand.mjs';
import { ArMeshOccusion } from './js/scene/nodes/ar-mesh-occlusion.mjs';
import { StatsViewer } from './js/scene/nodes/stats-viewer.mjs';
import { InputRenderer } from './js/scene/nodes/input-renderer.mjs';


export default class App {
  scene = new Scene();
  loader = new WebWorkerLoader();
  gl: WebGL2RenderingContext;
  renderer: Renderer;
  xrRefSpace: XRReferenceSpace | null = null;

  _stats: StatsViewer | null = null;
  _prevTime: number = 0;

  constructor(session: XRSession) {
    // Create a WebGL context to render with, initialized to be compatible
    // with the XRDisplay we're presenting to.
    this.gl = createWebGLContext({
      webgl2: true,
      xrCompatible: true,
    }) as WebGL2RenderingContext;

    // Create a renderer with that GL context (this is just for the samples
    // framework and has nothing to do with WebXR specifically.)
    this.renderer = new Renderer(this.gl);

    this._setupScene();
  }

  _setupScene() {
    // stats
    this._stats = new StatsViewer();
    this.scene.root.addNode(this._stats);
    if (false) {
      // TODO: head relative
      this._stats.local.translation = vec3.fromValues(0, 1.4, -0.75);
    } else {
      this._stats.local.translation = vec3.fromValues(0, -0.3, -0.5);
    }
    this._stats.local.scale = vec3.fromValues(0.3, 0.3, 0.3);
    this._stats.local.rotation = quat.fromEuler(-45.0, 0.0, 0.0);

    // this.loader.loadGltfAsync('./assets/gltf/space/space.gltf').then(node => {
    //   this.scene.root.addNode(node);
    // });

    // this.loader.loadCubeSeaAsync().then(node => {
    //   this.scene.root.addNode(node);
    // });

    const occlusion = new ArMeshOccusion();
    this.scene.root.addNode(occlusion);

    // session.addEventListener('visibilitychange', e => {
    //   // remove hand controller while blurred
    //   if (e.session.visibilityState === 'visible-blurred') {
    //     this.leftHand.disable(this.scene.root);
    //     this.rightHand.disable(this.scene.root);
    //   }
    // });

    this.leftHand = new Hand("left", { r: 1, g: 0, b: 1 });
    this.rightHand = new Hand("right", { r: 0, g: 1, b: 1 });

    const interaction = new Interaction({ r: 0.5, g: 0.5, b: 0.5 });
    this.scene.root.addNode(interaction);
  }

  async initSpace(session: XRSession) {
    // Use the new WebGL context to create a XRWebGLLayer and set it as the
    // sessions baseLayer. This allows any content rendered to the layer to
    // be displayed on the XRDevice.
    await session.updateRenderState({ baseLayer: new XRWebGLLayer(session, this.gl) });

    // Get a frame of reference, which is required for querying poses. In
    // this case an 'local' frame of reference means that all poses will
    // be relative to the location where the XRDevice was first detected.
    const refSpace = await session.requestReferenceSpace('local');

    this.xrRefSpace = refSpace.getOffsetReferenceSpace(
      new XRRigidTransform({ x: 0, y: 0, z: 0 }));
  }

  onXRFrame(time: number, frame: XRFrame) {
    const session = frame.session;
    // Inform the session that we're ready for the next frame.
    session.requestAnimationFrame((t, f) => this.onXRFrame(t, f));

    // Per-frame scene setup. Nothing WebXR specific here.
    // this.scene.startFrame(time, refSpace, frame);
    if (this._stats) {
      this._stats.begin();
    }

    //
    // update scene
    //
    let frameDelta = 0;
    if (this._prevTime >= 0) {
      frameDelta = time - this._prevTime;
    }
    this._prevTime = time;
    const refSpace = this.xrRefSpace!
    const renderList = this.scene.updateAndGetRenderList(time, frameDelta, refSpace, frame);


    if (session.visibilityState === 'visible-blurred') {
      return;
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
      const gl = this.gl;

      const glLayer = session.renderState.baseLayer!;

      // If we do have a valid pose, bind the WebGL layer's framebuffer,
      // which is where any content to be displayed on the XRDevice must be
      // rendered.
      gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);

      // Clear the framebuffer
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Loop through each of the views reported by the frame and draw them
      // into the corresponding viewport.
      const viewports = pose.views.map(view => glLayer.getViewport(view)!);
      this.renderer.drawViews(pose.views, viewports, renderList);

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

    if (this._stats) {
      this._stats.end();
    }
  }
}
