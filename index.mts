const XR_SPACE_TYPE = 'local';


class MiniXRWebGL2Renderer {
  frame = 0;

  constructor(public gl: WebGL2RenderingContext) { }

  onRenderFrame(time: number, frame: XRFrame, space: XRReferenceSpace) {
    console.log(this.frame++);
  }
}


export async function MiniXRRunSession(session: XRSession) {
  // init WebGL2 for WebXR
  const canvas = document.createElement('canvas') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl2', {
    xrCompatible: true
  })!;
  const renderer = new MiniXRWebGL2Renderer(gl);
  session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

  const space = await session.requestReferenceSpace(XR_SPACE_TYPE);
  console.log('get space', space);

  // start main loop
  console.log('XRSession start');
  function onXRFrame(time: number, frame: XRFrame) {
    const session = frame.session;
    // render loop. next
    session.requestAnimationFrame(onXRFrame);
    // render scene
    renderer.onRenderFrame(time, frame, space);
  }
  session.requestAnimationFrame(onXRFrame);
}

