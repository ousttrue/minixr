import { IViewLayer } from './iviewlayer.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { mat4 } from '../../../lib/math/gl-matrix.mjs';
import { Mesh } from '../../../lib/buffer/primitive.mjs';
import { Renderer } from '../render/renderer.mjs';


const GL = WebGL2RenderingContext;

// https://github.com/immersive-web/webxr-samples/blob/main/layers-samples/proj-multiview.html

export class OculusMultiview implements IViewLayer {
  renderer: Renderer;
  xrFramebuffer: WebGLFramebuffer;
  layer: XRProjectionLayer;
  depthStencilTex: WebGLTexture | null = null;
  xrGLFactory: XRWebGLBinding;

  constructor(
    public readonly session: XRSession,
    public readonly gl: WebGL2RenderingContext,
    public readonly space: XRReferenceSpace,
    public readonly ext: OCULUS_multiview | OVR_multiview2,
    public readonly is_multisampled: boolean,
  ) {
    this.renderer = new Renderer(gl, true);
    this.xrGLFactory = new XRWebGLBinding(session, gl);
    this.layer = this.xrGLFactory.createProjectionLayer({
      textureType: "texture-array",
      depthFormat: GL.DEPTH_COMPONENT24
    });
    session.updateRenderState({
      layers: [this.layer],
    });
    this.xrFramebuffer = gl.createFramebuffer()!;
  }

  get referenceSpace(): XRReferenceSpace {
    return this.space;
  }

  render(pose: XRViewerPose, world: World): void {
    const gl = this.gl;

    for (let i = 0; i < pose.views.length; ++i) {

      const glLayer = this.xrGLFactory.getViewSubImage(this.layer, pose.views[i]);
      // @ts-ignore
      glLayer.framebuffer = this.xrFramebuffer;

      if (i == 0) {
        this.gl.bindFramebuffer(GL.FRAMEBUFFER, this.xrFramebuffer);

        // for multiview we need to set fbo only once, 
        // so only do this for the first view
        this.ext.framebufferTextureMultiviewOVR(
          GL.DRAW_FRAMEBUFFER, GL.COLOR_ATTACHMENT0,
          glLayer.colorTexture, 0, 0, 2);

        if (glLayer.depthStencilTexture === null) {
          if (this.depthStencilTex === null) {
            console.log("MaxViews = " + gl.getParameter(this.ext.MAX_VIEWS_OVR));
            this.depthStencilTex = gl.createTexture();
            gl.bindTexture(GL.TEXTURE_2D_ARRAY, this.depthStencilTex);
            gl.texStorage3D(GL.TEXTURE_2D_ARRAY, 1, GL.DEPTH_COMPONENT24,
              glLayer.viewport.width, glLayer.viewport.height, 2);
          }
        } else {
          this.depthStencilTex = glLayer.depthStencilTexture;
        }
        this.ext.framebufferTextureMultiviewOVR(
          GL.DRAW_FRAMEBUFFER, GL.DEPTH_ATTACHMENT,
          this.depthStencilTex, 0, 0, 2);

        gl.disable(GL.SCISSOR_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(glLayer.viewport.x, glLayer.viewport.y,
          glLayer.viewport.width, glLayer.viewport.height);
      }
    }

    const renderList = world.view(mat4, Mesh);
    {
      const state = {
        prevProgram: null,
        prevMaterial: null,
        prevVao: null,
      }
      renderList.each((_entity, matrix, primitive) => {
        this.renderer.drawPrimitive(pose.views[0], matrix, primitive, state, pose.views[1]);
      });
    }
  }
}
