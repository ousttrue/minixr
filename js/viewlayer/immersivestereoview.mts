import { IViewLayer } from './iviewlayer.mjs';
import { Renderer } from '../render/renderer.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { mat4 } from '../math/gl-matrix.mjs';
import { Primitive } from '../buffer/primitive.mjs';


const GL = WebGL2RenderingContext;


// for XRSessionMode=='immersive'
export class ImmersiveStereoView implements IViewLayer {
  renderer: Renderer;
  layer: XRWebGLLayer;

  toString(): string {
    return "immersive mode";
  }

  constructor(session: XRSession,
    public readonly gl: WebGL2RenderingContext,
    public readonly space: XRReferenceSpace) {
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

  render(pose: XRViewerPose, world: World): void {
    if (pose.views.length != 2) {
      throw new Error("not 2?");
    }

    // If we do have a valid pose, bind the WebGL layer's framebuffer,
    // which is where any content to be displayed on the XRDevice must be
    // rendered.
    this.gl.bindFramebuffer(GL.FRAMEBUFFER, this.layer.framebuffer);
    // Clear the framebuffer
    this.gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    const renderList = world.view(mat4, Primitive);
    {
      // left eye
      const view = pose.views[0];
      const vp = this.layer.getViewport(view)!;
      this.gl.viewport(vp.x, vp.y, vp.width, vp.height);
      const state = {
        prevProgram: null,
        prevMaterial: null,
        prevVao: null,
      }
      renderList.each((_entity, matrix, primitive) => {
        this.renderer.drawPrimitive(view, 0, matrix, primitive, state);
      });
    }
    {
      // right eye
      const view = pose.views[1];
      const vp = this.layer.getViewport(view)!;
      if (vp.width > 0) {
        this.gl.viewport(vp.x, vp.y, vp.width, vp.height);
        const state = {
          prevProgram: null,
          prevMaterial: null,
          prevVao: null,
        }
        renderList.each((_entity, matrix, primitive) => {
          this.renderer.drawPrimitive(view, 1, matrix, primitive, state);
        });
      }
      else {
        // polyfill emulator
      }
    }
  }
}
