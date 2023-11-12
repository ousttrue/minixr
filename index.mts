// import WebXRPolyfill from './js/third-party/webxr-polyfill/build/webxr-polyfill.module.mjs'
import { WebXRButton } from './js/util/webxr-button.mjs';
import App from './app.mjs';

// @ts-ignore
let xrButton: WebXRButton = null;
let isAR = true;
let g_app: App | null = null;

// let webxrPolyfill = null;
//
// function getXR(usePolyfill: 'if-needed' | 'yes' | 'no'): XRSystem {
//   let tempXR;
//
//   switch (usePolyfill) {
//     case "if-needed":
//       tempXR = navigator.xr;
//       if (!tempXR) {
//         webxrPolyfill = new WebXRPolyfill();
//         tempXR = webxrPolyfill;
//         isAR = false;
//       }
//       break;
//     case "yes":
//       webxrPolyfill = new WebXRPolyfill();
//       tempXR = webxrPolyfill;
//       isAR = false;
//       break;
//     case "no":
//     default:
//       tempXR = navigator.xr;
//       break;
//   }
//
//   // @ts-ignore
//   return tempXR;
// }
// const xr = getXR('no');
const xr = navigator.xr;


// Called when the user selects a device to present to. In response we
// will request an exclusive session from that device.
async function onRequestSession() {
  const session = await xr!.requestSession(isAR ? 'immersive-ar' : 'immersive-vr',
    {
      optionalFeatures: [
        'local-floor',
        'bounded-floor',
        'hand-tracking',
        'mesh-detection',
        'high-fixed-foveation-level',
      ]
    });

  // This informs the 'Enter XR' button that the session has started and
  // that it should display 'Exit XR' instead.
  xrButton.setSession(session);

  // Called either when the user has explicitly ended the session (like in
  // onEndSession()) or when the UA has ended the session for any reason.
  // At this point the session object is no longer usable and should be
  // discarded.
  function onSessionEnded(_event: Event) {
    console.log('onSessionEnded');

    xrButton.setSession(null);

    // In this simple case discard the WebGL context too, since we're not
    // rendering anything else to the screen with it.
    g_app = null;
  }

  // Listen for the sessions 'end' event so we can respond if the user
  // or UA ends the session for any reason.
  session.addEventListener('end', onSessionEnded);

  // Called when we've successfully acquired a XRSession. In response we
  // will set up the necessary session state and kick off the frame loop.
  const app = new App(session);
  g_app = app;
  await app.initSpace(session);

  // Inform the session that we're ready to begin drawing.
  session.requestAnimationFrame((t, f) => app.onXRFrame(t, f));
}

// Called when the user clicks the 'Exit XR' button. In response we end
// the session.
function onEndSession(session: XRSession) {
  session.end();
}

// Checks to see if WebXR is available and, if so, queries a list of
// XRDevices that are connected to the system.
function initXR() {
  // Adds a helper button to the page that indicates if any XRDevices are
  // available and let's the user pick between them if there's multiple.
  xrButton = new WebXRButton({
    onRequestSession: onRequestSession,
    onEndSession: onEndSession
  });
  document.querySelector('header')!.appendChild(xrButton.domElement);

  // Is WebXR available on this UA?
  if (xr) {
    // If the device allows creation of exclusive sessions set it as the
    // target of the 'Enter XR' button.
    xr!.isSessionSupported(isAR ? 'immersive-ar' : 'immersive-vr').then((supported) => {
      xrButton.enabled = supported;
    });
  }
}
// Start the XR application.
initXR();

