import { WebXRButton, WebXRSessionStartEvent } from './js/util/webxr-button.mjs';
import { AppSession } from './AppSession.mjs';
import { BoundsRenderer } from './js/component/bounds-renderer.mjs';
import { ArMeshDetection } from './js/component/ar-mesh-detection.mjs';
import { ArPlaneDetection } from './js/component/ar-plane-detection.mjs';


// scene
import { World } from './js/uecs/index.mjs';
import { vec3, quat, mat4 } from './js/math/gl-matrix.mjs';
import { StatsGraph } from './js/component/stats-graph.mjs';
import { SevenSegmentText } from './js/component/seven-segment-text.mjs';
import { CubeInstancing } from './js/component/cube-instance.mjs';
import { interactionFactory } from './js/component/interaction.mjs';
import { cubeSeaFactory } from './js/component/cube-sea.mjs';
import { hoverSystem } from './js/component/hover.mjs';
import { animationSystem } from './js/component/animation.mjs';
import { Animation } from './js/animation.mjs';
import { bitmapFontFactory } from './js/component/bitmap-font.mjs';
import { HandTracking } from './js/component/hand-tracking.mjs';
// import { InputRenderer } from './js/scene/nodes/input-renderer.mjs';
import { Gltf2Loader } from './js/gltf2/gltf2-loader.mjs';
// import { XRTerm } from './js/xterm/xrterm.mjs';
import { Scene } from './js/scene.mjs';


let g_appSession: AppSession | null = null;


async function loadGltf(appSession: AppSession, dir: string, name: string, origin?: mat4) {
  if (dir == 'assets') {
    const loader = await Gltf2Loader.loadFromUrl(`./assets/gltf/${name}/${name}.gltf`);
    const scene = new Scene(appSession.scene.world);
    await scene.load(loader, origin);
  }
  else if (dir == 'glTF-Sample-Models') {
    const loader = await Gltf2Loader.loadFromUrl(
      `./glTF-Sample-Models/2.0/${name}`);
    const scene = new Scene(appSession.scene.world);
    await scene.load(loader, origin);
  }
}


function toSeconds(xrTime: number) {
  return xrTime * 0.001;
}


async function loadScene(appSession: AppSession) {
  appSession.pushUpdater((_session: XRSession, _xrRefSpace: XRReferenceSpace,
    time: number, _frameDelta: number,
    _frame: XRFrame,
    world: World) => {
    animationSystem(world);
    world.view(Animation).each((_entity, animation) => {
      animation.update(toSeconds(time));
    });
  });

  {
    const matrix = mat4.fromTRS(
      vec3.fromValues(0, 1.4, -0.5),
      quat.fromEuler(-10.0, 0.0, 0.0),
      vec3.fromValues(0.3, 0.3, 0.3),
    );
    await StatsGraph.factory(appSession.scene.world, matrix);
    await SevenSegmentText.factory(appSession.scene.world, matrix);
  }

  const instancing = new CubeInstancing(65535, appSession.scene.world);
  appSession.pushUpdater((_session: XRSession, _xrRefSpace: XRReferenceSpace,
    _time: number, _frameDelta: number,
    _frame: XRFrame,
    world: World) => {
    hoverSystem(world);
  });

  {
    await HandTracking.factory(appSession.scene.world, instancing, "left");
    await HandTracking.factory(appSession.scene.world, instancing, "right");
    appSession.pushUpdater((
      session: XRSession, xrRefSpace: XRReferenceSpace,
      time: number, frameDelta: number,
      frame: XRFrame, world: World) => {
      HandTracking.system(
        world, time, frameDelta, xrRefSpace, frame, session.inputSources);
    });
  }
  {
    const updater = await interactionFactory(appSession.scene.world, instancing);
    appSession.pushUpdater(updater);
  }
  {
    const updater = await cubeSeaFactory(appSession.scene.world, instancing, 6, 0.5)
    appSession.pushUpdater(updater);
  }

  {
    const textgrid = await bitmapFontFactory(
      appSession.scene.world, vec3.fromValues(0.2, 1.2, -0.4));
    textgrid.puts(0, 0, window.navigator.userAgent);
    textgrid.puts(0, 0.1, appSession.viewspace.toString());
  }

  {
    // await loadGltf(appSession, 'assets', 'garage');
    const m = mat4.fromTRS(
      vec3.fromValues(-0.5, 0, -1),
      new quat(),
      vec3.fromValues(1, 1, 1)
    )
    // await loadGltf(appSession, 'glTF-Sample-Models', 'CesiumMan/glTF-Binary/CesiumMan.glb', m);
    // await loadGltf(appSession, 'glTF-Sample-Models', 'CesiumMan/glTF/CesiumMan.gltf', m);
    // await loadGltf(appSession, 'glTF-Sample-Models', 'DamagedHelmet/glTF-Binary/DamagedHelmet.glb', m);
    await loadGltf(appSession, 'glTF-Sample-Models', 'FlightHelmet/glTF/FlightHelmet.gltf', m);
  }
}


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
      'local-floor',
    ],
    optionalFeatures: [
      HandTracking.requiredFeature,
      ArMeshDetection.requiredFeature,
      ArPlaneDetection.requiredFeature,
      BoundsRenderer.requiredFeature,
      'layers',
      // 'high-fixed-foveation-level',
    ],
  });

  // Called when the user selects a device to present to. In response we
  // will request an exclusive session from that device.
  xrButton.addEventListener('webxrsession-start', async (e: Event) => {
    const event = e as WebXRSessionStartEvent;

    // Called when we've successfully acquired a XRSession. In response we
    // will set up the necessary session state and kick off the frame loop.
    const appSession = await AppSession.startSession(event.mode, event.session);
    g_appSession = appSession;
    appSession.session.addEventListener('end', _ => {
      console.log('XrApp.endSession');
      appSession.shutdown();
    });

    //
    // load scene
    //
    loadScene(appSession);
  });

  xrButton.onClick('inline');
});

