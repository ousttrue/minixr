import { WebXRSampleApp } from './lib/webxr-sample-app.js';
import { Gltf2Node } from './lib/nodes/gltf2.js';

// WebXR sample app setup
class CustomWebXRSampleApp extends WebXRSampleApp {
  onCreateGL() {
    // This sample will create an offscreen canvas for WebGL rather than
    // the usual canvas Dom element.
    let offscreenCanvas = new OffscreenCanvas(16, 16);

    // workaround
    offscreenCanvas.style = { width: 0, height: 0 };

    return offscreenCanvas.getContext('webgl', {
      xrCompatible: true
    });
  }
};

let app = new CustomWebXRSampleApp({
  immersiveMode: 'immersive-ar',
});
document.querySelector('header').appendChild(app.xrButton.domElement);

app.scene.addNode(new Gltf2Node({ url: './assets/gltf/space/space.gltf' }));

// Start the XR application.
app.run();
