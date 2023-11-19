import { WebXRButton, WebXRSessionStartEvent } from './js/util/webxr-button.mjs';
import App from './app.mjs';


let g_app = new App();


document.addEventListener("DOMContentLoaded", _ => {

  const element = document.getElementById('xr-button');
  if (!element) {
    throw new Error('HTMLElement#xr-button not found');
  }

  // Adds a helper button to the page that indicates if any XRDevices are
  // available and let's the user pick between them if there's multiple.
  const xrButton = new WebXRButton({
    domElement: element,
    requiredFeatures: [
      'hand-tracking',
      'mesh-detection',
    ],
    optionalFeatures: [
      // 'layers',
      // 'local-floor',
      // 'bounded-floor',
      // 'high-fixed-foveation-level',
    ],
  });

  // Called when the user selects a device to present to. In response we
  // will request an exclusive session from that device.
  xrButton.addEventListener('webxrsession-start', async (e: Event) => {
    const event = e as WebXRSessionStartEvent;

    // Called when we've successfully acquired a XRSession. In response we
    // will set up the necessary session state and kick off the frame loop.
    g_app.startSession(event.session);
  });
});
