import { IViewLayer } from './iviewlayer.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { mat4 } from '../math/gl-matrix.mjs';
import { Primitive } from '../buffer/primitive.mjs';
import { Renderer } from '../render/renderer.mjs';


const GL = WebGL2RenderingContext;

// https://github.com/immersive-web/webxr-samples/blob/main/layers-samples/proj-multiview.html

export class OculusMultiview implements IViewLayer {
  renderer: Renderer;
  xrFramebuffer: WebGLFramebuffer;
  layer: XRProjectionLayer;
  depthStencilTex: WebGLTexture | null = null;

  constructor(
    public readonly session: XRSession,
    public readonly gl: WebGL2RenderingContext,
    public readonly space: XRReferenceSpace,
    public readonly xrGLFactory: XRWebGLBinding,
    public readonly ext: OCULUS_multiview | OVR_multiview2,
    public readonly is_multisampled: boolean,
  ) {
    this.renderer = new Renderer(gl, true);
    this.layer = this.xrGLFactory.createProjectionLayer({
      textureType: "texture-array",
      depthFormat: GL.DEPTH_COMPONENT24
    });
    this.xrFramebuffer = gl.createFramebuffer()!;
  }

  get referenceSpace(): XRReferenceSpace {
    return this.space;
  }

  render(pose: XRViewerPose, world: World): void {
    const gl = this.gl;

    this.gl.bindFramebuffer(GL.FRAMEBUFFER, this.xrFramebuffer);
    // Clear the framebuffer
    this.gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

    const viewports: XRViewport[] = [];
    for (const view of pose.views) {
      const glLayer = this.xrGLFactory.getViewSubImage(this.layer, view);
      glLayer.framebuffer = this.xrFramebuffer;

      const viewport = glLayer.viewport;
      if (viewports.length == 0) {
        // for multiview we need to set fbo only once, 
        // so only do this for the first view
        // if (!this.is_multisampled)
        this.ext.framebufferTextureMultiviewOVR(GL.DRAW_FRAMEBUFFER,
          GL.COLOR_ATTACHMENT0, glLayer.colorTexture, 0, 0, 2);
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
        this.ext.framebufferTextureMultiviewOVR(GL.DRAW_FRAMEBUFFER,
          GL.DEPTH_ATTACHMENT, this.depthStencilTex, 0, 0, 2);
        // else
        //   mv_ext.framebufferTextureMultisampleMultiviewOVR(GL.DRAW_FRAMEBUFFER, GL.DEPTH_ATTACHMENT, depthStencilTex, 0, samples, 0, 2);
        //
        gl.disable(GL.SCISSOR_TEST);
      }
    }

    const renderList = world.view(mat4, Primitive);
    {
      // multiview
      // const view = pose.views[0];
      // const vp = this.layer.getViewport(view)!;
      // this.gl.viewport(vp.x, vp.y, vp.width, vp.height);
      const state = {
        prevProgram: null,
        prevMaterial: null,
        prevVao: null,
      }
      renderList.each((_entity, matrix, primitive) => {
        this.renderer.drawMultiview(pose.views, matrix, primitive, state);
      });
    }
  }
}
