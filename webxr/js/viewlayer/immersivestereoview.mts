import { IViewLayer } from './iviewlayer.mjs';
import { Renderer } from '../render/renderer.mjs';
import { Scene } from '../scene.mjs';


const GL = WebGL2RenderingContext;


// for XRSessionMode=='immersive'
export class ImmersiveStereoView implements IViewLayer {
  renderer: Renderer;
  layer: XRWebGLLayer;
  envUboBuffer = new Float32Array(16 * 4 + 8);

  toString(): string {
    return "immersive mode";
  }

  constructor(session: XRSession,
    public readonly gl: WebGL2RenderingContext,
    public readonly space: XRReferenceSpace) {
    console.log('[ImmersiveStereoView]');
    // Create a renderer with that GL context (this is just for the samples
    // framework and has nothing to do with WebXR specifically.)
    this.renderer = new Renderer(gl);

    this.layer = new XRWebGLLayer(session, gl, {
      // framebufferScaleFactor: 0.1,
    });
    session.updateRenderState({
      baseLayer: this.layer,
    });
  }

  get referenceSpace(): XRReferenceSpace {
    return this.space;
  }

  render(pose: XRViewerPose, scene: Scene): void {
    if (pose.views.length != 2) {
      throw new Error("not 2?");
    }

    // If we do have a valid pose, bind the WebGL layer's framebuffer,
    // which is where any content to be displayed on the XRDevice must be
    // rendered.
    this.gl.bindFramebuffer(GL.FRAMEBUFFER, this.layer.framebuffer);
    // Clear the framebuffer
    this.gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    // if (rightView) {
    //   this.envUboBuffer.set(rightView.transform.inverse.matrix, 16);
    //   this.envUboBuffer.set(rightView.projectionMatrix, 48);
    // }

    {
      // left eye
      const view = pose.views[0];
      this.envUboBuffer.set(view.transform.inverse.matrix);
      this.envUboBuffer.set(view.projectionMatrix, 32);
      const vp = this.layer.getViewport(view)!;
      this.gl.viewport(vp.x, vp.y, vp.width, vp.height);
      this.renderer.drawScene(this.envUboBuffer, scene)
    }
    {
      // right eye
      const view = pose.views[1];
      const vp = this.layer.getViewport(view)!;
      if (vp.width > 0) {
        this.envUboBuffer.set(view.transform.inverse.matrix);
        this.envUboBuffer.set(view.projectionMatrix, 32);
        this.gl.viewport(vp.x, vp.y, vp.width, vp.height);
        this.renderer.drawScene(this.envUboBuffer, scene);
      }
      else {
        // polyfill emulator
      }
    }
  }
}
