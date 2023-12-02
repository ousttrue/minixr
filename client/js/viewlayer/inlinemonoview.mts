import { IViewLayer } from './iviewlayer.mjs';
import { Renderer } from '../render/renderer.mjs';
import { InlineViewerHelper } from '../util/inline-viewer-helper.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { mat4 } from '../../../lib/math/gl-matrix.mjs';
import { Primitive } from '../../../lib/buffer/primitive.mjs';


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

  render(pose: XRViewerPose, world: World): void {
    if (pose.views.length != 1) {
      throw new Error("not 1?");
    }

    // If we do have a valid pose, bind the WebGL layer's framebuffer,
    // which is where any content to be displayed on the XRDevice must be
    // rendered.
    this.gl.bindFramebuffer(GL.FRAMEBUFFER, this.layer.framebuffer);
    // Clear the framebuffer
    this.gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    const renderList = world.view(mat4, Primitive);
    {
      const view = pose.views[0];
      // Loop through each of the views reported by the frame and draw them
      // into the corresponding viewport.
      const vp = this.layer.getViewport(view)!;
      this.gl.viewport(vp.x, vp.y, vp.width, vp.height);
      const state = {
        prevProgram: null,
        prevMaterial: null,
        prevVao: null,
      }
      renderList.each((_entity, matrix, primitive) => {
        this.renderer.drawPrimitive(view, matrix, primitive, state);
      });
    }
  }
}
