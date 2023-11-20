import { Renderer } from './js/render/renderer.mjs';
import { vec3, quat, mat4, Ray } from './js/math/gl-matrix.mjs';
import { ArMeshDetection, } from './js/component/ar-mesh-detection.mjs';
import { ArPlaneDetection } from './js/component/ar-plane-detection.mjs';
import { StatsViewer } from './js/component/stats-viewer.mjs';
import { StatsGraph } from './js/component/stats-graph.mjs';
import { SevenSegmentText } from './js/component/seven-segment-text.mjs';
import { InputRenderer } from './js/scene/nodes/input-renderer.mjs';
import { Gltf2Loader } from './js/loaders/gltf2.mjs';
import { UrlTexture } from './js/materials/texture.mjs';
import { cubeSeaFactory } from './js/factory/cube-sea.mjs';
import { interactionFactory } from './js/factory/interaction.mjs';
import { XRTerm } from './js/xterm/xrterm.mjs';
import { bitmapFontFactory } from './js/factory/bitmap-font.mjs';
import { World } from './js/third-party/uecs-0.4.2/index.mjs';
import { Primitive } from './js/geometry/primitive.mjs';
import { Rotater } from './js/component/rotater.mjs';
import { Spinner } from './js/component/spinner.mjs';
import { HandTracking } from './js/component/hand-tracking.mjs';
import { hoverSystem } from './js/component/hover.mjs';
import { BoundsRenderer } from './js/component/bounds-renderer.mjs';
import { InlineViewerHelper } from './js/util/inline-viewer-helper.mjs';


class AppSession {

  world = new World();

  renderer: Renderer;

  _stats: StatsViewer = new StatsViewer();
  _prevTime: number = 0;
  _meshDetection: ArMeshDetection;
  _planeDetection: ArPlaneDetection;

  // term: XRTerm;
  // xrGLFactory: XRWebGLBinding;
  // quadLayer: XRQuadLayer;
  // meshDetection: ArMeshDetection;

  constructor(
    public readonly mode: XRSessionMode,
    public readonly session: XRSession,
    public readonly space: XRReferenceSpace,
    public readonly gl: WebGL2RenderingContext,
    private readonly _inlineViewerHelper: InlineViewerHelper | null = null
  ) {
    // Create a renderer with that GL context (this is just for the samples
    // framework and has nothing to do with WebXR specifically.)
    this.renderer = new Renderer(gl);
    // this.term = new XRTerm(gl);
    this._meshDetection = new ArMeshDetection(mode);
    this._planeDetection = new ArPlaneDetection(mode);
  }

  async start() {
    if (this.space instanceof XRBoundedReferenceSpace) {
      await BoundsRenderer.factory(this.world, this.space);
    }

    await this._setupScene();

    this.session.requestAnimationFrame((t, f) => this.onXRFrame(t, f));
  }

  shutdown() {
    console.log('shutdown');
  }

  async _setupScene() {
    {
      const matrix = mat4.fromTRS(
        vec3.fromValues(0, 1.3, -0.5),
        quat.fromEuler(-45.0, 0.0, 0.0),
        vec3.fromValues(0.3, 0.3, 0.3),
      );
      await StatsGraph.factory(this.world, matrix);
      await SevenSegmentText.factory(this.world, matrix);
    }

    await HandTracking.factory(this.world, "left");
    await HandTracking.factory(this.world, "right");
    await interactionFactory(this.world);
    await cubeSeaFactory(this.world, 6, 0.5)
    await bitmapFontFactory(this.world, vec3.fromValues(0, 0, -0.2));

    // await this._loadGltf('space');
    await this._loadGltf('asets', 'garage');
    // await this._loadGltf('home-theater');

    await this._loadGltf('glTF-Sample-Models', 'CesiumMan');
    await this._loadGltf('glTF-Sample-Models', 'DamagedHelmet', mat4.fromTRS(
      vec3.fromValues(0, 1, -3),
      new quat(),
      vec3.fromValues(1, 1, 1)
    ));
  }

  private async _loadGltf(dir: string, name: string, origin?: mat4) {
    if (dir == 'assets') {
      await Gltf2Loader.loadFromUrl(this.world, `./assets/gltf/${name}/${name}.gltf`);
    }
    else if (dir == 'glTF-Sample-Models') {
      await Gltf2Loader.loadFromUrl(this.world,
        `./glTF-Sample-Models/2.0/${name}/glTF-Binary/${name}.glb`, origin);
    }
  }

  onXRFrame(time: number, frame: XRFrame) {
    const session = frame.session;
    // Inform the session that we're ready for the next frame.
    session.requestAnimationFrame((t, f) => this.onXRFrame(t, f));

    const xrRefSpace = this._inlineViewerHelper
      ? this._inlineViewerHelper.referenceSpace
      : this.space;

    // Per-frame scene setup. Nothing WebXR specific here.
    this._stats.begin(this.world);

    //
    // update scene
    //
    let frameDelta = 0;
    if (this._prevTime >= 0) {
      frameDelta = time - this._prevTime;
    }
    this._prevTime = time;

    // this.term.getTermTexture();

    Rotater.system(this.world, time);
    Spinner.system(this.world, time, frameDelta);
    HandTracking.system(
      this.world, time, frameDelta, xrRefSpace, frame, session.inputSources);

    this._planeDetection.update(this.world, xrRefSpace, frame);
    this._meshDetection.update(this.world, xrRefSpace, frame);

    hoverSystem(this.world);

    //
    // render scene
    //
    if (session.visibilityState === 'visible-blurred') {
      return;
    }

    // Get the XRDevice pose relative to the Frame of Reference we created
    // earlier.
    let pose = frame.getViewerPose(xrRefSpace);

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

      const renderList = this.world.view(mat4, Primitive);

      {
        // left eye
        const vp = viewports[0];
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        const state = {
          prevProgram: null,
          prevMaterial: null,
          prevVao: null,
        }
        const view = pose.views[0];
        renderList.each((entity, matrix, primitive) => {
          this.renderer.drawPrimitive(view, 0, matrix, primitive, state);
        });
      }
      if (pose.views.length > 1) {
        // right eye
        const vp = viewports[1];
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        const state = {
          prevProgram: null,
          prevMaterial: null,
          prevVao: null,
        }
        const view = pose.views[1];
        renderList.each((entity, matrix, primitive) => {
          this.renderer.drawPrimitive(view, 1, matrix, primitive, state);
        });
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

    this._stats.end(this.world);
  }
}


export default class App {
  appSession: AppSession | null = null;

  constructor() {
  }

  endSession() {
    console.log('App.endSession');
    if (this.appSession) {
      this.appSession.shutdown();
    }
  }

  async startSession(mode: XRSessionMode, session: XRSession): Promise<void> {
    console.log('App.startSession', session);
    session.addEventListener('end', _ => {
      this.endSession();
    });

    // Create a WebGL context to render with, initialized to be compatible
    // with the XRDisplay we're presenting to.
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2',
      {
        xrCompatible: true,
      });
    if (!gl) {
      throw new Error('fail to create WebGL2RenderingContext');
    }

    // Use the new WebGL context to create a XRWebGLLayer and set it as the
    // sessions baseLayer. This allows any content rendered to the layer to
    // be displayed on the XRDevice.
    session.updateRenderState({
      baseLayer: new XRWebGLLayer(session, gl, {
        // framebufferScaleFactor: 0.1,
      })
    });

    // Get a frame of reference, which is required for querying poses. In
    // this case an 'local' frame of reference means that all poses will
    // be relative to the location where the XRDevice was first detected.
    // let localSpace = await session.requestReferenceSpace(mode == 'inline' ? 'viewer' : 'local');

    let space: XRReferenceSpace | undefined = undefined;
    try {
      space = await session.requestReferenceSpace('bounded-floor');
    }
    catch (err) {
    }

    if (!space) {
      try {
        space = await session.requestReferenceSpace('local-floor');
      }
      catch (err) {
      }
    }

    let inlineViewerHelper: InlineViewerHelper | null = null;
    if (mode == 'inline') {
      inlineViewerHelper = new InlineViewerHelper(canvas, space!);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      document.body.appendChild(canvas);
    }

    function onResize() {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }
    window.addEventListener('resize', onResize);
    onResize();

    this.appSession = new AppSession(mode, session, space, gl, inlineViewerHelper);
    this.appSession.start();
  }
}
