import { Node } from '../scene/nodes/node.mjs';
import { XRTTty } from './xrtty.mjs';
import { Fbo } from './fbo.mjs';
import CM from '../../xterm.mjs/Common.mjs';

export class XRTerm extends Node {
  fbo: Fbo;
  tty: XRTTty;
  previousFrameBuffer: any;
  count = 0;

  constructor(private readonly gl: WebGL2RenderingContext) {
    super("XRTTermBare");

    this.fbo = new Fbo(this.gl);

    this.tty = new XRTTty(gl, document.body);

    // ws to node-pty
    const protocol = (location.protocol == "https:") ? "wss" : "ws";
    const url = `${protocol}://${location.hostname}`;
    const socket = new WebSocket(`${url}:${CM.COMM_PORT}/`);
    // Listen on data, write it to the terminal
    socket.onmessage = ({ data }) => {
      this.tty.term.write(data);
      // this.tty.addon._renderer!.renderRows(0, this.tty.term._core.rows - 1);
    };
    socket.onclose = () => {
      this.tty.term.write('\r\nConnection closed.\r\n');
      // this.tty.addon._renderer!.renderRows(0, this.tty.term._core.rows - 1);
    };
    this.tty.term.onData((data: string) => {
      console.log(data)
      socket.send(data);
    });
  }

  private _beginFrame(w: number, h: number): [WebGLTexture, number, number] {
    const dpr = window.devicePixelRatio;
    w *= dpr;
    h *= dpr;

    const fbo = this.fbo.getOrCreate(w, h);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);

    return [this.fbo.fTexture!, w, h];
  }

  private getTermTexture(): WebGLTexture {
    if (this.tty.addon._renderer._invalidated) {
      console.log('fbo');
      this.tty.addon._renderer._invalidated = false;

      const cell = this.tty.addon._renderer!.dimensions.device.cell;
      const cols = this.tty.term.cols;
      const rows = this.tty.term.rows;
      const ww = cols * cell.width
      const hh = rows * cell.height;
      this.gl.viewport(0, 0,
        ww,
        hh
      );
      const [texture, w, h] = this._beginFrame(ww, hh)

      this.gl.viewport(0, 0, w, h);
      this.tty.addon._renderer.render();
    }

    return this.fbo.fTexture!;
  }

  // Called every frame so that the nodes can animate themselves
  protected _onUpdate(_timestamp: number, _frameDelta: number,
    _refsp: XRReferenceSpace, _frame: XRFrame, _inputSources: XRInputSourceArray) {

    // this.xrGLFactory = new XRWebGLBinding(session, this.gl);
    // this.quadLayer = this.xrGLFactory.createQuadLayer({
    //   space: refSpace,
    //   viewPixelWidth: 80 * 9,
    //   viewPixelHeight: 24 * 17,
    //   layout: "mono",
    // })
    // this.quadLayer.width = 1;
    // this.quadLayer.height = 1;
    // let pos = { x: -1, y: 0, z: -2 };
    // let orient = { x: 0, y: 0, z: 0, w: 1 };
    // this.quadLayer.transform = new XRRigidTransform(pos, orient);
    //
    // session.updateRenderState({
    //   layers: [this.quadLayer],
    // });
    //
    // if (quadLayer.needsRedraw) {
    //   let fb = gl.createFramebuffer();
    //   let glayer = xrGLFactory.getSubImage(quadLayer, frame);
    //   gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    //   gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glayer.colorTexture, 0);
    //
    //   if (quadTextureWidth != 0 && quadTextureHeight != 0) {
    //     stereoUtil.blit(false, quadTexture, 0, 0, 1, 1, quadTextureWidth, quadTextureHeight);
    //   }
    // }
  }
}
