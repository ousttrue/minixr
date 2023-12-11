import { IViewLayer } from './iviewlayer.mjs';
import { Renderer } from '../render/renderer.mjs';
import { InlineViewerHelper } from '../util/inline-viewer-helper.mjs';
import { Scene } from '../scene.mjs';
import { mat4 } from '../math/gl-matrix.mjs';
import { Mesh, Skin } from '../buffer/mesh.mjs';


const GL = WebGL2RenderingContext;


// for XRSessionMode=='inine'
export class InlineMonoView implements IViewLayer {
  renderer: Renderer;
  _inlineViewerHelper: InlineViewerHelper;
  layer: XRWebGLLayer;

  toString(): string {
    return "inline mode";
  }

  constructor(session: XRSession,
    canvas: HTMLCanvasElement,
    public readonly gl: WebGL2RenderingContext,
    space: XRReferenceSpace) {
    console.log('[InlineMonoView]');
    // Create a renderer with that GL context (this is just for the samples
    // framework and has nothing to do with WebXR specifically.)
    this.renderer = new Renderer(gl);

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.appendChild(canvas);
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this._inlineViewerHelper = new InlineViewerHelper(canvas, space);

    this.layer = new XRWebGLLayer(session, gl, {
      // framebufferScaleFactor: 0.1,
    });
    session.updateRenderState({
      baseLayer: this.layer
    });
  }

  get referenceSpace(): XRReferenceSpace {
    return this._inlineViewerHelper.referenceSpace;
  }

  render(pose: XRViewerPose, scene: Scene): void {
    if (pose.views.length != 1) {
      throw new Error("not 1?");
    }

    // If we do have a valid pose, bind the WebGL layer's framebuffer,
    // which is where any content to be displayed on the XRDevice must be
    // rendered.
    this.gl.bindFramebuffer(GL.FRAMEBUFFER, this.layer.framebuffer);
    // Clear the framebuffer
    this.gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    {
      const view = pose.views[0];
      const vp = this.layer.getViewport(view)!;
      this.gl.viewport(vp.x, vp.y, vp.width, vp.height);
      this.renderer.drawScene(view, scene);
    }
  }
}
