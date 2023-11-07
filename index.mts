import { WebXRButton } from './lib/webxr-button.js';
import { Scene } from './lib/scene.js';
import { Renderer, createWebGLContext } from './lib/renderer.js';

import { InlineViewerHelper } from './lib/inline-viewer-helper.js';

import { Gltf2Node } from './lib/gltf2.js';

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


// XR globals.
let xrButton = null;
let xrImmersiveRefSpace = null;
let inlineViewerHelper = null;

// WebGL scene globals.
let gl = null;
let renderer = null;
let scene = new Scene();

let solarSystem = new Gltf2Node({ url: './assets/gltf/space/space.gltf' });
// The solar system is big (citation needed). Scale it down so that users
// can move around the planets more easily.
solarSystem.scale = [0.1, 0.1, 0.1];
scene.addNode(solarSystem);

function initXR() {
  xrButton = new WebXRButton({
    onRequestSession: onRequestSession,
    onEndSession: onEndSession,
    textEnterXRTitle: "START AR",
    textXRNotFoundTitle: "AR NOT FOUND",
    textExitXRTitle: "EXIT  AR",
  });
  document.querySelector('header').appendChild(xrButton.domElement);

  if (navigator.xr) {
    // Checks to ensure that 'immersive-ar' mode is available, and only
    // enables the button if so.
    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
      xrButton.enabled = supported;
    });

    navigator.xr.requestSession('inline').then(onSessionStarted);
  }
}

function onRequestSession() {
  // Requests an 'immersive-ar' session, which ensures that the users
  // environment will be visible either via video passthrough or a
  // transparent display. This may be presented either in a headset or
  // fullscreen on a mobile device.
  return navigator.xr.requestSession('immersive-ar')
    .then((session) => {
      xrButton.setSession(session);
      session.isImmersive = true;
      onSessionStarted(session);
    });
}

function initGL() {
  if (gl)
    return;

  gl = createWebGLContext({
    xrCompatible: true
  });
  document.body.appendChild(gl.canvas);

  function onResize() {
    gl.canvas.width = gl.canvas.clientWidth * window.devicePixelRatio;
    gl.canvas.height = gl.canvas.clientHeight * window.devicePixelRatio;
  }
  window.addEventListener('resize', onResize);
  onResize();

  renderer = new Renderer(gl);

  scene.setRenderer(renderer);
}

function onSessionStarted(session) {
  session.addEventListener('end', onSessionEnded);

  initGL();

  session.updateRenderState({ baseLayer: new XRWebGLLayer(session, gl) });

  let refSpaceType = session.isImmersive ? 'local' : 'viewer';
  session.requestReferenceSpace(refSpaceType).then((refSpace) => {
    if (session.isImmersive) {
      xrImmersiveRefSpace = refSpace;
    } else {
      inlineViewerHelper = new InlineViewerHelper(gl.canvas, refSpace);
    }
    session.requestAnimationFrame(onXRFrame);
  });
}

function onEndSession(session) {
  session.end();
}

function onSessionEnded(event) {
  if (event.session.isImmersive) {
    xrButton.setSession(null);
  }
}

// Called every time a XRSession requests that a new frame be drawn.
function onXRFrame(t, frame) {
  let session = frame.session;
  let refSpace = session.isImmersive ?
    xrImmersiveRefSpace :
    inlineViewerHelper.referenceSpace;
  let pose = frame.getViewerPose(refSpace);

  scene.startFrame();

  session.requestAnimationFrame(onXRFrame);

  scene.drawXRFrame(frame, pose);

  scene.endFrame();
}

// Start the XR application.
initXR();
