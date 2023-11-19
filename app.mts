import { Scene } from './js/scene.mjs';
import { Renderer, createWebGLContext } from './js/render/renderer.mjs';
import { vec3, quat, mat4, Ray } from './js/math/gl-matrix.mjs';
import {
  ArMeshDetection,
  MeshDetectedEvent, MeshUpdatedEvent, MeshLostEvent
} from './js/component/ar-mesh-detection.mjs';
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
import { Transform } from './js/math/gl-matrix.mjs';
import { Primitive } from './js/geometry/primitive.mjs';
import { Rotater } from './js/component/rotater.mjs';
import { Spinner } from './js/component/spinner.mjs';
import { HandTracking } from './js/component/hand-tracking.mjs';
import { hoverSystem } from './js/component/hover.mjs';



export default class App {
  world = new World();

  scene = new Scene();
  gl: WebGL2RenderingContext;
  renderer: Renderer;
  xrRefSpace: XRReferenceSpace | null = null;

  _stats: StatsViewer = new StatsViewer();
  _prevTime: number = 0;

  term: XRTerm;
  xrGLFactory: XRWebGLBinding;
  quadLayer: XRQuadLayer;
  meshDetection: ArMeshDetection;

  constructor() {
  }

  endSession() {
    console.log('App.endSession');
  }

  async startSession(session: XRSession): Promise<void> {
    console.log('App.startSession', session);
    session.addEventListener('end', _ => {
      this.endSession();
    });

    // Create a WebGL context to render with, initialized to be compatible
    // with the XRDisplay we're presenting to.
    this.gl = createWebGLContext({
      webgl2: true,
      xrCompatible: true,
    }) as WebGL2RenderingContext;

    const gl = this.gl;
    function onResize() {
      gl.canvas.width = gl.canvas.clientWidth * window.devicePixelRatio;
      gl.canvas.height = gl.canvas.clientHeight * window.devicePixelRatio;
    }
    window.addEventListener('resize', onResize);
    onResize();

    // Create a renderer with that GL context (this is just for the samples
    // framework and has nothing to do with WebXR specifically.)
    this.renderer = new Renderer(this.gl);

    await this.initSpace(session);

    this.term = new XRTerm(this.gl);

    await this._setupScene();

    session.requestAnimationFrame((t, f) => this.onXRFrame(t, f));
  }

  async _setupScene() {
    {
      const transform = await StatsGraph.factory(this.world);
      if (false) {
        // TODO: head relative
        transform.translation = vec3.fromValues(0, 1.4, -0.75);
      } else {
        transform.translation = vec3.fromValues(0, -0.3, -0.5);
      }
      transform.scale = vec3.fromValues(0.3, 0.3, 0.3);
      transform.rotation = quat.fromEuler(-45.0, 0.0, 0.0);
    }
    {
      const transform = await SevenSegmentText.factory(this.world);
      if (false) {
        // TODO: head relative
        transform.translation = vec3.fromValues(0, 1.4, -0.75);
      } else {
        transform.translation = vec3.fromValues(0, -0.3, -0.5);
      }
      transform.scale = vec3.fromValues(0.3, 0.3, 0.3);
      transform.rotation = quat.fromEuler(-45.0, 0.0, 0.0);
    }

    this.meshDetection = new ArMeshDetection();
    this.meshDetection.addEventListener('ar-mesh-detected',
      event => {
        this.scene.root.addNode(
          (event as MeshDetectedEvent).mesh);
      });
    this.meshDetection.addEventListener('ar-mesh-updated',
      event => {
        // console.log(event);
      });
    this.meshDetection.addEventListener('ar-mesh-lost',
      event => {
        this.scene.root.removeNode(
          (event as MeshLostEvent).mesh);
      });
    this.scene.addComponents([this.meshDetection]);

    this._loadGltfAsync();

    await HandTracking.factory(this.world, "left");
    await HandTracking.factory(this.world, "right");
    await interactionFactory(this.world);
    await cubeSeaFactory(this.world, 6, 0.5)
    await bitmapFontFactory(this.world, vec3.fromValues(0, 0, -0.2));
  }

  private async _loadGltfAsync(): Promise<void> {
    const loader = new Gltf2Loader();
    const node = await loader.loadFromUrl('./assets/gltf/space/space.gltf');
    this.scene.root.addNode(node);
  }

  async initSpace(session: XRSession) {
    // Use the new WebGL context to create a XRWebGLLayer and set it as the
    // sessions baseLayer. This allows any content rendered to the layer to
    // be displayed on the XRDevice.
    session.updateRenderState({
      baseLayer: new XRWebGLLayer(session, this.gl, {
        // framebufferScaleFactor: 0.1,
      })
    });

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
    this._stats.begin(this.world);

    //
    // update scene
    //
    let frameDelta = 0;
    if (this._prevTime >= 0) {
      frameDelta = time - this._prevTime;
    }
    this._prevTime = time;
    const refSpace = this.xrRefSpace!
    this.scene.updateAndGetRenderList(
      time, frameDelta, refSpace, frame, session.inputSources);

    this.term.getTermTexture();

    Rotater.system(this.world, time);
    Spinner.system(this.world, time, frameDelta);
    HandTracking.system(this.world, time, frameDelta, refSpace, frame, session.inputSources);
    hoverSystem(this.world);

    //
    // render scene
    //
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

      const renderList = this.world.view(Transform, Primitive);

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
        renderList.each((entity, transform, primitive) => {
          this.renderer.drawPrimitive(view, 0, transform.matrix, primitive, state);
        });
      }
      {
        // right eye
        const vp = viewports[1];
        gl.viewport(vp.x, vp.y, vp.width, vp.height);
        const state = {
          prevProgram: null,
          prevMaterial: null,
          prevVao: null,
        }
        const view = pose.views[1];
        renderList.each((entity, transform, primitive) => {
          this.renderer.drawPrimitive(view, 1, transform.matrix, primitive, state);
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
