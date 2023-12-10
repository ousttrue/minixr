import { vec3, quat, mat4 } from '../lib/math/gl-matrix.mjs';
import { ArMeshDetection, } from './js/component/ar-mesh-detection.mjs';
import { ArPlaneDetection } from './js/component/ar-plane-detection.mjs';
import { StatsViewer } from './js/component/stats-viewer.mjs';
import { StatsGraph } from './js/component/stats-graph.mjs';
import { SevenSegmentText } from './js/component/seven-segment-text.mjs';
// import { InputRenderer } from './js/scene/nodes/input-renderer.mjs';
import { Gltf2Loader } from '../lib/gltf2-loader.mjs';
import { cubeSeaFactory } from './js/component/cube-sea.mjs';
import { interactionFactory } from './js/component/interaction.mjs';
// import { XRTerm } from './js/xterm/xrterm.mjs';
import { bitmapFontFactory } from './js/component/bitmap-font.mjs';
import { World } from './js/../../lib/uecs/index.mjs';
import { Rotater } from './js/component/rotater.mjs';
import { Spinner } from './js/component/spinner.mjs';
import { HandTracking } from './js/component/hand-tracking.mjs';
import { hoverSystem } from './js/component/hover.mjs';
import { BoundsRenderer } from './js/component/bounds-renderer.mjs';
import { animationSystem } from './js/component/animation.mjs';
import { createViewLayer } from './js/viewlayer/index.mjs';
import { CubeInstancing } from './js/component/cube-instance.mjs';
import { Scene } from '../lib/scene.mjs';
import { Animation } from '../lib/animation.mjs';


class AppSession {
  world = new World();

  _stats: StatsViewer = new StatsViewer();
  _prevTime: number = 0;

  _detection: (refsp: XRReferenceSpace, frame: XRFrame) => void;

  // term: XRTerm;
  // quadLayer: XRQuadLayer;
  // meshDetection: ArMeshDetection;

  constructor(
    public readonly mode: XRSessionMode,
    public readonly session: XRSession,
    public readonly gl: WebGL2RenderingContext,
    private readonly viewspace: IViewSpace
  ) {
    // this.term = new XRTerm(gl);

    if (navigator.userAgent.includes('Quest 3')) {
      const meshDetection = new ArMeshDetection(mode);
      this._detection = (refsp: XRReferenceSpace, frame: XRFrame) => {
        meshDetection.update(this.world, refsp, frame);
      }
    }
    else {
      const planeDetection = new ArPlaneDetection(mode);
      this._detection = (refsp: XRReferenceSpace, frame: XRFrame) => {
        planeDetection.update(this.world, refsp, frame);
      }
    }
  }

  async start() {
    if (this.viewspace.referenceSpace instanceof XRBoundedReferenceSpace) {
      await BoundsRenderer.factory(this.world, this.viewspace.referenceSpace);
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
        vec3.fromValues(0, 1.4, -0.5),
        quat.fromEuler(-10.0, 0.0, 0.0),
        vec3.fromValues(0.3, 0.3, 0.3),
      );
      await StatsGraph.factory(this.world, matrix);
      // await SevenSegmentText.factory(this.world, matrix);
    }

    const instancing = new CubeInstancing(65535, this.world);

    // await HandTracking.factory(this.world, instancing, "left");
    // await HandTracking.factory(this.world, instancing, "right");
    // await interactionFactory(this.world, instancing);
    // await cubeSeaFactory(this.world, instancing, 6, 0.5)
    const textgrid = await bitmapFontFactory(this.world, vec3.fromValues(0.2, 1.2, -0.4));
    // textgrid.puts(0, 0, window.navigator.userAgent);
    // textgrid.puts(0, 0.1, this.viewspace.toString());

    await this._loadGltf('assets', 'garage');
    const m = mat4.fromTRS(
      vec3.fromValues(1, 0, -2),
      new quat(),
      vec3.fromValues(1, 1, 1)
    )
    await this._loadGltf('glTF-Sample-Models', 'CesiumMan', m);
    // await this._loadGltf('glTF-Sample-Models', 'DamagedHelmet', );
  }

  private async _loadGltf(dir: string, name: string, origin?: mat4) {
    if (dir == 'assets') {
      const loader = await Gltf2Loader.loadFromUrl(`./assets/gltf/${name}/${name}.gltf`);
      const scene = new Scene(loader, this.world);
      await scene.load(origin);
    }
    else if (dir == 'glTF-Sample-Models') {
      const loader = await Gltf2Loader.loadFromUrl(
        `./glTF-Sample-Models/2.0/${name}/glTF-Binary/${name}.glb`);
      const scene = new Scene(loader, this.world);
      await scene.load(origin);
    }
  }

  onXRFrame(time: number, frame: XRFrame) {
    // stats
    this._stats.begin(this.world);
    let frameDelta = 0;
    if (this._prevTime >= 0) {
      frameDelta = time - this._prevTime;
    }
    this._prevTime = time;

    const session = frame.session;
    // Inform the session that we're ready for the next frame.
    session.requestAnimationFrame((t, f) => this.onXRFrame(t, f));

    const xrRefSpace = this.viewspace.referenceSpace;

    //
    // update scene
    //
    Rotater.system(this.world, time);
    Spinner.system(this.world, time, frameDelta);
    HandTracking.system(
      this.world, time, frameDelta, xrRefSpace, frame, session.inputSources);
    this._detection(xrRefSpace, frame);
    hoverSystem(this.world);
    animationSystem(this.world);

    this.world.view(Animation).each((_entity, animation) => {
      animation.update(time);
    });

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

      //
      // render scene
      //
      this.viewspace.render(pose, this.world);

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
    function onResize() {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    }
    window.addEventListener('resize', onResize);
    onResize();

    const viewspace = await createViewLayer(mode, session, canvas, gl);

    this.appSession = new AppSession(mode, session, gl, viewspace);
    this.appSession.start();
  }
}
