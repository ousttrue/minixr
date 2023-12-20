import { ArMeshDetection, } from './js/component/ar-mesh-detection.mjs';
import { ArPlaneDetection } from './js/component/ar-plane-detection.mjs';
import { StatsViewer } from './js/component/stats-viewer.mjs';
import { BoundsRenderer } from './js/component/bounds-renderer.mjs';
import { createViewLayer } from './js/viewlayer/index.mjs';
import { Scene } from './js/scene.mjs';
import { IViewLayer } from './js/viewlayer/iviewlayer.mjs';
import { Updater } from './js/component/updater.mjs';


export class AppSession {
  scene = new Scene()
  _stats: StatsViewer = new StatsViewer();
  _prevTime: number = 0;
  _detection: (refsp: XRReferenceSpace, frame: XRFrame) => void;
  _updaters: Updater[] = [];

  // term: XRTerm;
  // quadLayer: XRQuadLayer;

  constructor(
    public readonly mode: XRSessionMode,
    public readonly session: XRSession,
    public readonly gl: WebGL2RenderingContext,
    public readonly viewspace: IViewLayer
  ) {
    // this.term = new XRTerm(gl);

    if (navigator.userAgent.includes('Quest 3')) {
      const meshDetection = new ArMeshDetection(mode);
      this._detection = (refsp: XRReferenceSpace, frame: XRFrame) => {
        meshDetection.update(this.scene.world, refsp, frame);
      }
    }
    else {
      const planeDetection = new ArPlaneDetection(mode);
      this._detection = (refsp: XRReferenceSpace, frame: XRFrame) => {
        planeDetection.update(this.scene.world, refsp, frame);
      }
    }
  }

  static async startSession(
    mode: XRSessionMode, session: XRSession): Promise<AppSession> {

    console.log('XrApp.startSession', session);

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

    const appSession = new AppSession(mode, session, gl, viewspace);
    // this.appSession.start();

    if (appSession.viewspace.referenceSpace instanceof XRBoundedReferenceSpace) {
      await BoundsRenderer.factory(
        appSession.scene.world,
        appSession.viewspace.referenceSpace);
    }

    session.requestAnimationFrame((t, f) => appSession.onXRFrame(t, f));

    return appSession;
  }

  shutdown() {
    console.log('shutdown');
  }

  pushUpdater(updater: Updater) {
    this._updaters.push(updater);
  }

  onXRFrame(time: number, frame: XRFrame) {
    // stats
    this._stats.begin(this.scene.world);
    let frameDelta = 0;
    if (this._prevTime >= 0) {
      frameDelta = time - this._prevTime;
    }
    this._prevTime = time;

    const session = frame.session;
    // Inform the session that we're ready for the next frame.
    session.requestAnimationFrame((t, f) => this.onXRFrame(t, f));

    if (session.visibilityState === 'visible-blurred') {
      return;
    }

    const xrRefSpace = this.viewspace.referenceSpace;
    // Get the XRDevice pose relative to the Frame of Reference we created
    // earlier.
    let pose = frame.getViewerPose(xrRefSpace);

    //
    // update
    //
    if (this._detection) {
      this._detection(xrRefSpace, frame);
    }
    for (const updater of this._updaters) {
      updater(session, xrRefSpace,
        time, frameDelta,
        frame, this.scene.world);
    }

    // Getting the pose may fail if, for example, tracking is lost. So we
    // have to check to make sure that we got a valid pose before attempting
    // to render with it. If not in this case we'll just leave the
    // framebuffer cleared, so tracking loss means the scene will simply
    // disappear.
    if (pose) {

      //
      // render scene
      //
      this.viewspace.render(pose, this.scene);

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

    this._stats.end(this.scene.world);
  }
}
