import { IViewLayer } from './iviewlayer.mjs';
import { InlineMonoView } from './inlinemonoview.mjs';
import { ImmersiveStereoView } from './immersivestereoview.mjs';
import { OculusMultiview } from './oculusmultiview.mjs';


export async function createViewLayer(
  mode: XRSessionMode, session: XRSession,
  canvas: HTMLCanvasElement, gl: WebGL2RenderingContext): Promise<IViewLayer> {

  // Get a frame of reference, which is required for querying poses. In
  // this case an 'local' frame of reference means that all poses will
  // be relative to the location where the XRDevice was first detected.
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

  if (!space) {
    // fallback
    try {
      space = await session.requestReferenceSpace('local');
      console.log('local', space);
    }
    catch (err) {
      throw new Error('no space !');
    }
  }

  if (mode == 'inline') {
    return new InlineMonoView(session, canvas, gl, space!);
  }

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

  return Promise.resolve(new ImmersiveStereoView(session, gl, space!));
}
