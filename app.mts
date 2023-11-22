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
import { cubeSeaFactory } from './js/component/cube-sea.mjs';
import { interactionFactory } from './js/component/interaction.mjs';
import { XRTerm } from './js/xterm/xrterm.mjs';
import { bitmapFontFactory } from './js/component/bitmap-font.mjs';
import { World } from './js/third-party/uecs-0.4.2/index.mjs';
import { Primitive } from './js/buffer/primitive.mjs';
import { Rotater } from './js/component/rotater.mjs';
import { Spinner } from './js/component/spinner.mjs';
import { HandTracking } from './js/component/hand-tracking.mjs';
import { hoverSystem } from './js/component/hover.mjs';
import { BoundsRenderer } from './js/component/bounds-renderer.mjs';
import { InlineViewerHelper } from './js/util/inline-viewer-helper.mjs';
import { animationSystem } from './js/component/animation.mjs';


const GL = WebGL2RenderingContext;


// https://github.com/immersive-web/webxr-samples/blob/main/layers-samples/proj-multiview.html
class OculusMultiview {
  xrFramebuffer: WebGLFramebuffer;
  layer: XRProjectionLayer;
  depthStencilTex: WebGLTexture | null = null;

  private constructor(
    public readonly session: XRSession,
    public readonly gl: WebGL2RenderingContext,
    public readonly xrGLFactory: XRWebGLBinding,
    public readonly ext: OCULUS_multiview | OVR_multiview2,
    public readonly is_multisampled: boolean,
  ) {
    this.layer = this.xrGLFactory.createProjectionLayer({
      textureType: "texture-array",
      depthFormat: GL.DEPTH_COMPONENT24
    });
    this.xrFramebuffer = gl.createFramebuffer()!;
  }

  static factory(
    session: XRSession,
    gl: WebGL2RenderingContext,
  ): OculusMultiview | undefined {
    console.log(session, gl);
    const xrGLFactory = new XRWebGLBinding(session, gl);

    {
      const ext = gl.getExtension('OCULUS_multiview');
      if (ext) {
        console.log("OCULUS_multiview extension is supported");
        return new OculusMultiview(session, gl,
          xrGLFactory, ext, true);
      }
    }

    {
      console.log("OCULUS_multiview extension is NOT supported");
      const ext = gl.getExtension('OVR_multiview2');
      if (ext) {
        console.log("OVR_multiview2 extension is supported");
        return new OculusMultiview(session, gl,
          xrGLFactory, ext, false);
      }
    }

    console.log("Neither OCULUS_multiview nor OVR_multiview2 extensions are supported");
    return undefined;
  }

  prepareMultiview(frame: XRFrame, pose: XRViewerPose): XRViewport[] {
    const gl = this.gl;

    this.gl.bindFramebuffer(GL.FRAMEBUFFER, this.xrFramebuffer);

    const viewports: XRViewport[] = [];
    for (let view of pose.views) {
      const glLayer = this.xrGLFactory.getViewSubImage(this.layer, view);
      glLayer.framebuffer = this.xrFramebuffer;
      this.gl.bindFramebuffer(GL.FRAMEBUFFER, this.xrFramebuffer);

      let viewport = glLayer.viewport;

      if (views.length == 0) {
        // for multiview we need to set fbo only once, 
        // so only do this for the first view
        // if (!this.is_multisampled)
        this.ext.framebufferTextureMultiviewOVR(GL.DRAW_FRAMEBUFFER, GL.COLOR_ATTACHMENT0, glLayer.colorTexture, 0, 0, 2);
        // else
        //   this.ext.framebufferTextureMultisampleMultiviewOVR(GL.DRAW_FRAMEBUFFER, GL.COLOR_ATTACHMENT0, glLayer.colorTexture, 0, samples, 0, 2);

        if (glLayer.depthStencilTexture === null) {
          if (this.depthStencilTex === null) {
            console.log("MaxViews = " + gl.getParameter(this.ext.MAX_VIEWS_OVR));
            this.depthStencilTex = gl.createTexture();
            gl.bindTexture(GL.TEXTURE_2D_ARRAY, this.depthStencilTex);
            gl.texStorage3D(GL.TEXTURE_2D_ARRAY, 1, GL.DEPTH_COMPONENT24, viewport.width, viewport.height, 2);
          }
        } else {
          this.depthStencilTex = glLayer.depthStencilTexture;
        }
        // if (!this.is_multisampled)
        this.ext.framebufferTextureMultiviewOVR(GL.DRAW_FRAMEBUFFER, GL.DEPTH_ATTACHMENT, this.depthStencilTex, 0, 0, 2);
        // else
        //   mv_ext.framebufferTextureMultisampleMultiviewOVR(GL.DRAW_FRAMEBUFFER, GL.DEPTH_ATTACHMENT, depthStencilTex, 0, samples, 0, 2);
        //
        gl.disable(GL.SCISSOR_TEST);
        gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
      }

      viewports.push(viewport);
    }
    return viewports;
  }
}


class AppSession {
  world = new World();

  renderer: Renderer;

  _stats: StatsViewer = new StatsViewer();
  _prevTime: number = 0;

  _detection: (refsp: XRReferenceSpace, frame: XRFrame) => void;

  // term: XRTerm;
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




  async start(multiview?: OculusMultiview) {
    if (this.space instanceof XRBoundedReferenceSpace) {
      await BoundsRenderer.factory(this.world, this.space);
    }

    await this._setupScene(multiview);

    this.session.requestAnimationFrame((t, f) => this.onXRFrame(t, f, multiview));
  }

  shutdown() {
    console.log('shutdown');
  }

  async _setupScene(multiview?: OculusMultiview) {
    {
      const matrix = mat4.fromTRS(
        vec3.fromValues(0, 1.4, -0.5),
        quat.fromEuler(-10.0, 0.0, 0.0),
        vec3.fromValues(0.3, 0.3, 0.3),
      );
      await StatsGraph.factory(this.world, matrix);
      await SevenSegmentText.factory(this.world, matrix);
    }

    await HandTracking.factory(this.world, "left");
    await HandTracking.factory(this.world, "right");
    await interactionFactory(this.world);
    await cubeSeaFactory(this.world, 6, 0.5)
    const textgrid = await bitmapFontFactory(this.world, vec3.fromValues(0.2, 1.2, -0.4));
    textgrid.puts(0, 0, window.navigator.userAgent);
    textgrid.puts(0, 0.1, multiview ? "multiview" : "not multiview");

    await this._loadGltf('assets', 'garage');

    // await this._loadGltf('glTF-Sample-Models', 'CesiumMan');
    // await this._loadGltf('glTF-Sample-Models', 'DamagedHelmet', mat4.fromTRS(
    //   vec3.fromValues(0, 1, -3),
    //   new quat(),
    //   vec3.fromValues(1, 1, 1)
    // ));
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

  onXRFrame(time: number, frame: XRFrame, multiview?: OculusMultiview) {
    const session = frame.session;
    const xrRefSpace = this._inlineViewerHelper
      ? this._inlineViewerHelper.referenceSpace
      : this.space;

    // Per-frame scene setup. Nothing WebXR specific here.
    this._stats.begin(this.world);
    let frameDelta = 0;
    if (this._prevTime >= 0) {
      frameDelta = time - this._prevTime;
    }
    this._prevTime = time;

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

      let viewports: XRViewport[] = [];
      if (multiview) {
        viewports = multiview.prepareMultiview(frame, pose);
      }
      else {
        const renderState = session.renderState;
        const glLayer = renderState.baseLayer ?? renderState.layers![0];

        // If we do have a valid pose, bind the WebGL layer's framebuffer,
        // which is where any content to be displayed on the XRDevice must be
        // rendered.
        gl.bindFramebuffer(GL.FRAMEBUFFER, glLayer.framebuffer);

        // Loop through each of the views reported by the frame and draw them
        // into the corresponding viewport.
        viewports = pose.views.map(view => glLayer.getViewport(view)!);
      }

      // Clear the framebuffer
      gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

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

    // Inform the session that we're ready for the next frame.
    session.requestAnimationFrame((t, f) => this.onXRFrame(t, f, multiview));
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

    let multiview: OculusMultiview | undefined = undefined;
    if (mode != 'inline') {
      const layers: XRLayer[] = [];
      // multiview = OculusMultiview.factory(session, gl);
      // if (multiview) {
      //   layers.push(multiview.layer);
      // }
      // else 
      {
        const layer = new XRWebGLLayer(session, gl, {
          // framebufferScaleFactor: 0.1,
        });
        layers.push(layer);

      }
      session.updateRenderState({
        layers
      });
    }
    else {
      const layer = new XRWebGLLayer(session, gl, {
        // framebufferScaleFactor: 0.1,
      });
      session.updateRenderState({
        baseLayer: layer
      });
    }

    // Get a frame of reference, which is required for querying poses. In
    // this case an 'local' frame of reference means that all poses will
    // be relative to the location where the XRDevice was first detected.
    // let localSpace = await session.requestReferenceSpace(mode == 'inline' ? 'viewer' : 'local');

    let space: XRReferenceSpace | undefined = undefined;
    try {
      space = await session.requestReferenceSpace('bounded-floor');
      console.log('bounded-floor', space);
    }
    catch (err) {
    }

    if (!space) {
      try {
        space = await session.requestReferenceSpace('local-floor');
        console.log('local-floor', space);
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

    this.appSession = new AppSession(mode, session, space!, gl, inlineViewerHelper);
    this.appSession.start(multiview);
  }
}
