// Copyright 2018 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Node } from '../node.mjs';
import { Material, RENDER_ORDER } from '../material.mjs';
import { Primitive, PrimitiveAttribute } from '../buffer/mesh.mjs';
import { DataTexture } from '../texture.mjs';
// import { Gltf2Node } from '../nodes/gltf2.mjs';
import { vec3 } from '../../math/gl-matrix.mjs';

// This library matches XRInputSource profiles to available controller models for us.
import { fetchProfile } from 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/motion-controllers@1.0/dist/motion-controllers.module.js';

// The path of the CDN the sample will fetch controller models from.
const DEFAULT_PROFILES_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles';

const GL = WebGLRenderingContext; // For enums

// Laser texture data, 48x1 RGBA (not premultiplied alpha). This represents a
// "cross section" of the laser beam with a bright core and a feathered edge.
// Borrowed from Chromium source code.
const LASER_TEXTURE_DATA = new Uint8Array([
  0xff, 0xff, 0xff, 0x01, 0xff, 0xff, 0xff, 0x02, 0xbf, 0xbf, 0xbf, 0x04, 0xcc, 0xcc, 0xcc, 0x05,
  0xdb, 0xdb, 0xdb, 0x07, 0xcc, 0xcc, 0xcc, 0x0a, 0xd8, 0xd8, 0xd8, 0x0d, 0xd2, 0xd2, 0xd2, 0x11,
  0xce, 0xce, 0xce, 0x15, 0xce, 0xce, 0xce, 0x1a, 0xce, 0xce, 0xce, 0x1f, 0xcd, 0xcd, 0xcd, 0x24,
  0xc8, 0xc8, 0xc8, 0x2a, 0xc9, 0xc9, 0xc9, 0x2f, 0xc9, 0xc9, 0xc9, 0x34, 0xc9, 0xc9, 0xc9, 0x39,
  0xc9, 0xc9, 0xc9, 0x3d, 0xc8, 0xc8, 0xc8, 0x41, 0xcb, 0xcb, 0xcb, 0x44, 0xee, 0xee, 0xee, 0x87,
  0xfa, 0xfa, 0xfa, 0xc8, 0xf9, 0xf9, 0xf9, 0xc9, 0xf9, 0xf9, 0xf9, 0xc9, 0xfa, 0xfa, 0xfa, 0xc9,
  0xfa, 0xfa, 0xfa, 0xc9, 0xf9, 0xf9, 0xf9, 0xc9, 0xf9, 0xf9, 0xf9, 0xc9, 0xfa, 0xfa, 0xfa, 0xc8,
  0xee, 0xee, 0xee, 0x87, 0xcb, 0xcb, 0xcb, 0x44, 0xc8, 0xc8, 0xc8, 0x41, 0xc9, 0xc9, 0xc9, 0x3d,
  0xc9, 0xc9, 0xc9, 0x39, 0xc9, 0xc9, 0xc9, 0x34, 0xc9, 0xc9, 0xc9, 0x2f, 0xc8, 0xc8, 0xc8, 0x2a,
  0xcd, 0xcd, 0xcd, 0x24, 0xce, 0xce, 0xce, 0x1f, 0xce, 0xce, 0xce, 0x1a, 0xce, 0xce, 0xce, 0x15,
  0xd2, 0xd2, 0xd2, 0x11, 0xd8, 0xd8, 0xd8, 0x0d, 0xcc, 0xcc, 0xcc, 0x0a, 0xdb, 0xdb, 0xdb, 0x07,
  0xcc, 0xcc, 0xcc, 0x05, 0xbf, 0xbf, 0xbf, 0x04, 0xff, 0xff, 0xff, 0x02, 0xff, 0xff, 0xff, 0x01,
]);

const LASER_LENGTH = 1.0;
const LASER_DIAMETER = 0.01;
const LASER_FADE_END = 0.535;
const LASER_FADE_POINT = 0.5335;
const LASER_DEFAULT_COLOR = [1.0, 1.0, 1.0, 0.25];

const CURSOR_RADIUS = 0.004;
const CURSOR_SHADOW_RADIUS = 0.007;
const CURSOR_SHADOW_INNER_LUMINANCE = 0.5;
const CURSOR_SHADOW_OUTER_LUMINANCE = 0.0;
const CURSOR_SHADOW_INNER_OPACITY = 0.75;
const CURSOR_SHADOW_OUTER_OPACITY = 0.0;
const CURSOR_OPACITY = 0.9;
const CURSOR_SEGMENTS = 16;
const CURSOR_DEFAULT_COLOR = [1.0, 1.0, 1.0, 1.0];
const CURSOR_DEFAULT_HIDDEN_COLOR = [0.5, 0.5, 0.5, 0.25];

const DEFAULT_RESET_OPTIONS = {
  controllers: true,
  lasers: true,
  cursors: true,
};

class LaserMaterial extends Material {
  constructor() {
    super();
    this.renderOrder = RENDER_ORDER.ADDITIVE;
    this.state.cullFace = false;
    this.state.blend = true;
    this.state.blendFuncSrc = GL.ONE;
    this.state.blendFuncDst = GL.ONE;
    this.state.depthMask = false;

    this.laser = this.defineSampler('diffuse');
    this.laser.texture = new DataTexture(LASER_TEXTURE_DATA, 48, 1);
    this.laserColor = this.defineUniform('laserColor', LASER_DEFAULT_COLOR);
  }

  get materialName() {
    return 'INPUT_LASER';
  }

  get vertexSource() {
    return `
    attribute vec3 POSITION;
    attribute vec2 TEXCOORD_0;

    varying vec2 vTexCoord;

    vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
      vTexCoord = TEXCOORD_0;
      return proj * view * model * vec4(POSITION, 1.0);
    }`;
  }

  get fragmentSource() {
    return `
    precision mediump float;

    uniform vec4 laserColor;
    uniform sampler2D diffuse;
    varying vec2 vTexCoord;

    const float fadePoint = ${LASER_FADE_POINT};
    const float fadeEnd = ${LASER_FADE_END};

    vec4 fragment_main() {
      vec2 uv = vTexCoord;
      float front_fade_factor = 1.0 - clamp(1.0 - (uv.y - fadePoint) / (1.0 - fadePoint), 0.0, 1.0);
      float back_fade_factor = clamp((uv.y - fadePoint) / (fadeEnd - fadePoint), 0.0, 1.0);
      vec4 color = laserColor * texture2D(diffuse, vTexCoord);
      float opacity = color.a * front_fade_factor * back_fade_factor;
      return vec4(color.rgb * opacity, opacity);
    }`;
  }
}

const CURSOR_VERTEX_SHADER = `
attribute vec4 POSITION;

varying float vLuminance;
varying float vOpacity;

vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
  vLuminance = POSITION.z;
  vOpacity = POSITION.w;

  // Billboarded, constant size vertex transform.
  vec4 screenPos = proj * view * model * vec4(0.0, 0.0, 0.0, 1.0);
  screenPos /= screenPos.w;
  screenPos.xy += POSITION.xy;
  return screenPos;
}`;

const CURSOR_FRAGMENT_SHADER = `
precision mediump float;

uniform vec4 cursorColor;
varying float vLuminance;
varying float vOpacity;

vec4 fragment_main() {
  vec3 color = cursorColor.rgb * vLuminance;
  float opacity = cursorColor.a * vOpacity;
  return vec4(color * opacity, opacity);
}`;

// Cursors are drawn as billboards that always face the camera and are rendered
// as a fixed size no matter how far away they are.
class CursorMaterial extends Material {
  constructor() {
    super();
    this.renderOrder = RENDER_ORDER.ADDITIVE;
    this.state.cullFace = false;
    this.state.blend = true;
    this.state.blendFuncSrc = GL.ONE;
    this.state.depthMask = false;

    this.cursorColor = this.defineUniform('cursorColor', CURSOR_DEFAULT_COLOR);
  }

  get materialName() {
    return 'INPUT_CURSOR';
  }

  get vertexSource() {
    return CURSOR_VERTEX_SHADER;
  }

  get fragmentSource() {
    return CURSOR_FRAGMENT_SHADER;
  }
}

class CursorHiddenMaterial extends Material {
  constructor() {
    super();
    this.renderOrder = RENDER_ORDER.ADDITIVE;
    this.state.cullFace = false;
    this.state.blend = true;
    this.state.blendFuncSrc = GL.ONE;
    this.state.depthFunc = GL.GEQUAL;
    this.state.depthMask = false;

    this.cursorColor = this.defineUniform('cursorColor', CURSOR_DEFAULT_HIDDEN_COLOR);
  }

  // TODO: Rename to "program_name"
  get materialName() {
    return 'INPUT_CURSOR_2';
  }

  get vertexSource() {
    return CURSOR_VERTEX_SHADER;
  }

  get fragmentSource() {
    return CURSOR_FRAGMENT_SHADER;
  }
}

export class InputRenderer extends Node {
  private _maxInputElements: number;
  private _controllers: null;
  private _lasers: null;
  private _cursors: null;
  private _activeControllers: number;
  private _activeLasers: number;
  private _activeCursors: number;
  private _blurred: boolean;
  constructor() {
    super("InputRenderer");

    this._maxInputElements = 32;

    this._controllers = null;
    this._lasers = null;
    this._cursors = null;

    this._activeControllers = 0;
    this._activeLasers = 0;
    this._activeCursors = 0;

    this._blurred = false;
  }

  useProfileControllerMeshes(session) {
    // As input sources are connected if they are tracked-pointer devices
    // look up which meshes should be associated with their profile and
    // load as the controller model for that hand.
    session.addEventListener('inputsourceschange', (event) => {
      for (let inputSource of event.added) {
        if (inputSource.targetRayMode == 'tracked-pointer') {
          fetchProfile(inputSource, DEFAULT_PROFILES_PATH).then(({ profile, assetPath }) => {
            this.setControllerMesh(new Gltf2Node({ url: assetPath }), inputSource.handedness);
          });
        }
      }
    });

    session.addEventListener('visibilitychange', (event) => {
      // remove hand controller while blurred
      if (event.session.visibilityState === 'visible-blurred') {
        this._blurred = true;
      } else if (event.session.visibilityState === 'visible') {
        this._blurred = false;
      }
    });
  }

  setControllerMesh(controllerNode, handedness = 'right') {
    if (!this._controllers) {
      this._controllers = {};
    }
    this._controllers[handedness] = { nodes: [controllerNode], activeCount: 0 };
    controllerNode.visible = false;
    // FIXME: Temporary fix to initialize for cloning.
    this.addNode(controllerNode);
  }

  addController(gripMatrix, handedness = 'right') {
    if (!this._controllers || this._blurred) { return; }
    let controller = this._controllers[handedness];

    if (!controller) { return; }

    let controllerNode = null;
    if (controller.activeCount < controller.nodes.length) {
      controllerNode = controller.nodes[controller.activeCount];
    } else {
      controllerNode = controller.nodes[0].clone();
      this.addNode(controllerNode);
      controller.nodes.push(controllerNode);
    }
    controller.activeCount = (controller.activeCount + 1) % this._maxInputElements;

    controllerNode.matrix = gripMatrix;
    controllerNode.visible = true;
  }

  addLaserPointer(rigidTransform) {
    if (this._blurred) { return; }
    // Create the laser pointer mesh if needed.
    if (!this._lasers) {
      this._lasers = [this._createLaserMesh()];
      this.addNode(this._lasers[0]);
    }

    let laser = null;
    if (this._activeLasers < this._lasers.length) {
      laser = this._lasers[this._activeLasers];
    } else {
      laser = this._lasers[0].clone();
      this.addNode(laser);
      this._lasers.push(laser);
    }
    this._activeLasers = (this._activeLasers + 1) % this._maxInputElements;

    laser.matrix = rigidTransform.matrix;
    laser.visible = true;
  }

  addCursor(cursorPos: vec3) {
    if (this._blurred) { return; }
    // Create the cursor mesh if needed.
    if (!this._cursors) {
      this._cursors = [this._createCursorMesh()];
      this.addNode(this._cursors[0]);
    }

    let cursor = null;
    if (this._activeCursors < this._cursors.length) {
      cursor = this._cursors[this._activeCursors];
    } else {
      cursor = this._cursors[0].clone();
      this.addNode(cursor);
      this._cursors.push(cursor);
    }
    this._activeCursors = (this._activeCursors + 1) % this._maxInputElements;

    cursor.translation = cursorPos;
    cursor.visible = true;
  }

  reset(options) {
    if (!options) {
      options = DEFAULT_RESET_OPTIONS;
    }
    if (this._controllers && options.controllers) {
      for (let handedness in this._controllers) {
        let controller = this._controllers[handedness];
        controller.activeCount = 0;
        for (let controllerNode of controller.nodes) {
          controllerNode.visible = false;
        }
      }
    }
    if (this._lasers && options.lasers) {
      for (let laser of this._lasers) {
        laser.visible = false;
      }
      this._activeLasers = 0;
    }
    if (this._cursors && options.cursors) {
      for (let cursor of this._cursors) {
        cursor.visible = false;
      }
      this._activeCursors = 0;
    }
  }

  _createLaserMesh() {
    let lr = LASER_DIAMETER * 0.5;
    let ll = LASER_LENGTH;

    // Laser is rendered as cross-shaped beam
    let laserVerts = [
      // X    Y   Z    U    V
      0.0, lr, 0.0, 0.0, 1.0,
      0.0, lr, -ll, 0.0, 0.0,
      0.0, -lr, 0.0, 1.0, 1.0,
      0.0, -lr, -ll, 1.0, 0.0,

      lr, 0.0, 0.0, 0.0, 1.0,
      lr, 0.0, -ll, 0.0, 0.0,
      -lr, 0.0, 0.0, 1.0, 1.0,
      -lr, 0.0, -ll, 1.0, 0.0,

      0.0, -lr, 0.0, 0.0, 1.0,
      0.0, -lr, -ll, 0.0, 0.0,
      0.0, lr, 0.0, 1.0, 1.0,
      0.0, lr, -ll, 1.0, 0.0,

      -lr, 0.0, 0.0, 0.0, 1.0,
      -lr, 0.0, -ll, 0.0, 0.0,
      lr, 0.0, 0.0, 1.0, 1.0,
      lr, 0.0, -ll, 1.0, 0.0,
    ];
    let laserIndices = [
      0, 1, 2, 1, 3, 2,
      4, 5, 6, 5, 7, 6,
      8, 9, 10, 9, 11, 10,
      12, 13, 14, 13, 15, 14,
    ];

    let laserMaterial = new LaserMaterial();
    let laserVertexBuffer = new DataView(new Float32Array(laserVerts).buffer);
    let laserAttribs = [
      new PrimitiveAttribute('POSITION', laserVertexBuffer, 3, GL.FLOAT, 20, 0),
      new PrimitiveAttribute('TEXCOORD_0', laserVertexBuffer, 2, GL.FLOAT, 20, 12),
    ];
    let laserIndexBuffer = new Uint16Array(laserIndices);
    let laserPrimitive = new Primitive(laserMaterial,
      laserAttribs, laserVerts.length / 5, laserIndexBuffer);
    let meshNode = new Node('laser');
    meshNode.primitives.push(laserPrimitive);
    return meshNode;
  }

  _createCursorMesh() {
    // Cursor is a circular white dot with a dark "shadow" skirt around the edge
    // that fades from black to transparent as it moves out from the center.
    // Cursor verts are packed as [X, Y, Luminance, Opacity]
    let cursorVerts = [];
    let cursorIndices = [];

    let segRad = (2.0 * Math.PI) / CURSOR_SEGMENTS;

    // Cursor center
    for (let i = 0; i < CURSOR_SEGMENTS; ++i) {
      let rad = i * segRad;
      let x = Math.cos(rad);
      let y = Math.sin(rad);
      cursorVerts.push(x * CURSOR_RADIUS, y * CURSOR_RADIUS, 1.0, CURSOR_OPACITY);

      if (i > 1) {
        cursorIndices.push(0, i - 1, i);
      }
    }

    let indexOffset = CURSOR_SEGMENTS;

    // Cursor Skirt
    for (let i = 0; i < CURSOR_SEGMENTS; ++i) {
      let rad = i * segRad;
      let x = Math.cos(rad);
      let y = Math.sin(rad);
      cursorVerts.push(x * CURSOR_RADIUS, y * CURSOR_RADIUS,
        CURSOR_SHADOW_INNER_LUMINANCE, CURSOR_SHADOW_INNER_OPACITY);
      cursorVerts.push(x * CURSOR_SHADOW_RADIUS, y * CURSOR_SHADOW_RADIUS,
        CURSOR_SHADOW_OUTER_LUMINANCE, CURSOR_SHADOW_OUTER_OPACITY);

      if (i > 0) {
        let idx = indexOffset + (i * 2);
        cursorIndices.push(idx - 2, idx - 1, idx);
        cursorIndices.push(idx - 1, idx + 1, idx);
      }
    }

    let idx = indexOffset + (CURSOR_SEGMENTS * 2);
    cursorIndices.push(idx - 2, idx - 1, indexOffset);
    cursorIndices.push(idx - 1, indexOffset + 1, indexOffset);

    let cursorMaterial = new CursorMaterial();
    let cursorHiddenMaterial = new CursorHiddenMaterial();
    let cursorVertexBuffer = new DataView(new Float32Array(cursorVerts).buffer);
    let cursorIndexBuffer = new Uint16Array(cursorIndices);
    let cursorAttribs = [
      new PrimitiveAttribute('POSITION', cursorVertexBuffer, 4, GL.FLOAT, 16, 0),
    ];
    let cursorPrimitive = new Primitive(cursorMaterial,
      cursorAttribs, cursorVerts.length / 4, cursorIndexBuffer);
    let cursorHiddenPrimitive = new Primitive(cursorHiddenMaterial,
      cursorAttribs, cursorVerts.length / 4, cursorIndexBuffer);

    // Cursor renders two parts: The bright opaque cursor for areas where it's
    // not obscured and a more transparent, darker version for areas where it's
    // behind another object.
    let meshNode = new Node('cursor');
    meshNode.primitives.push(cursorPrimitive);
    meshNode.primitives.push(cursorHiddenPrimitive);
    return meshNode;
  }
}

//   this._inputRenderer = null;
// get inputRenderer() {
// private _inputRenderer: InputRenderer | null;
//   if (!this._inputRenderer) {
//     this._inputRenderer = new InputRenderer();
//     this.root.addNode(this._inputRenderer);
//   }
//   return this._inputRenderer;
// }
// // Helper function that automatically adds the appropriate visual elements for
// // all input sources.
// updateInputSources(frame: XRFrame, refSpace: XRReferenceSpace) {
//   let newHoveredNodes = [];
//   let lastHoverFrame = this._hoverFrame;
//   this._hoverFrame++;
//
//   for (let inputSource of frame.session.inputSources) {
//     let targetRayPose = frame.getPose(inputSource.targetRaySpace, refSpace);
//
//     if (!targetRayPose) {
//       continue;
//     }
//
//     if (inputSource.targetRayMode == 'tracked-pointer') {
//       // If we have a pointer matrix and the pointer origin is the users
//       // hand (as opposed to their head or the screen) use it to render
//       // a ray coming out of the input device to indicate the pointer
//       // direction.
//       this.inputRenderer.addLaserPointer(targetRayPose.transform);
//     }
//
//     // If we have a pointer matrix we can also use it to render a cursor
//     // for both handheld and gaze-based input sources.
//
//     // Check and see if the pointer is pointing at any selectable objects.
//     let hitResult = this.root.hitTest(targetRayPose.transform);
//     if (hitResult) {
//       // Render a cursor at the intersection point.
//       this.inputRenderer.addCursor(hitResult.intersection);
//
//       if (hitResult.node._hoverFrameId != lastHoverFrame) {
//         hitResult.node.onHoverStart();
//       }
//       hitResult.node._hoverFrameId = this._hoverFrame;
//       newHoveredNodes.push(hitResult.node);
//     } else {
//       // Statically render the cursor 1 meters down the ray since we didn't
//       // hit anything selectable.
//       let targetRay = new Ray(new mat4(targetRayPose.transform.matrix));
//       const cursorPos = targetRay.advance(1.0)
//       this.inputRenderer.addCursor(cursorPos);
//     }
//
//     if (inputSource.gripSpace) {
//       let gripPose = frame.getPose(inputSource.gripSpace, refSpace);
//
//       // Any time that we have a grip matrix, we'll render a controller.
//       if (gripPose) {
//         this.inputRenderer.addController(gripPose.transform.matrix, inputSource.handedness);
//       }
//     }
//   }
//
//   for (let hoverNode of this._hoveredNodes) {
//     if (hoverNode._hoverFrameId != this._hoverFrame) {
//       hoverNode.onHoverEnd();
//     }
//   }
//
//   this._hoveredNodes = newHoveredNodes;
// }
//
// handleSelect(inputSource: XRInputSource, frame: XRFrame, refSpace: XRReferenceSpace) {
//   let targetRayPose = frame.getPose(inputSource.targetRaySpace, refSpace);
//
//   if (!targetRayPose) {
//     return;
//   }
//
//   this.handleSelectPointer(targetRayPose.transform);
// }
//
// handleSelectPointer(rigidTransform: XRRigidTransform) {
//   if (rigidTransform) {
//     // Check and see if the pointer is pointing at any selectable objects.
//     let hitResult = this.root.hitTest(rigidTransform);
//
//     if (hitResult) {
//       // Render a cursor at the intersection point.
//       hitResult.node.handleSelect();
//     }
//   }
// }

// private _updateRay(refSpace: XRReferenceSpace, frame: XRFrame, inputSource: XRInputSource) {
//   let targetRayPose = frame.getPose(inputSource.targetRaySpace, refSpace);
//   if (targetRayPose) {
//     if (inputSource.targetRayMode == 'tracked-pointer') {
//       // this.scene.inputRenderer.addLaserPointer(targetRayPose.transform);
//     }
//
//     const targetRay = new Ray(new mat4(targetRayPose.transform.matrix));
//
//     const cursorPos = targetRay.advance(2.0);
//
//     // this.scene.inputRenderer.addCursor(cursorPos);
//   }
// }

// for (let inputSource of session.inputSources) {
//   if (inputSource.targetRaySpace) {
//     // udate ray
//     this._updateRay(refSpace, frame, inputSource);
//   }
//   if (inputSource.hand) {
//     // update hand-tracking
//     switch (inputSource.handedness) {
//       case 'left': this.leftHand.update(this.scene.root, refSpace, time, frame, inputSource); break;
//       case 'right': this.rightHand.update(this.scene.root, refSpace, time, frame, inputSource); break;
//       default: break;
//     }
//   }
// }


