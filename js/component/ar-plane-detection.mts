// https://immersive-web.github.io/real-world-geometry/plane-detection.html
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { mat4 } from '../math/gl-matrix.mjs';
import { ArOcclusionShader, ArOcclusionShaderDebug, DetectedItem } from './ar-detection.mjs';
import { Material } from '../materials/material.mjs';
import { Primitive, PrimitiveAttribute } from '../geometry/primitive.mjs';


const GL = WebGLRenderingContext; // For enums


function createPrimitive(plane: XRPlane, material: Material): Primitive {

  const vertices = new Float32Array(4 * 3);
  let p = 0;
  for (let i = 0; i < plane.polygon.length && i < 4; ++i, p += 3) {
    // XZ plane
    vertices[p] = plane.polygon[i].x;
    vertices[p + 2] = plane.polygon[i].z;
  }
  const indices = new Uint16Array([0, 1, 2, 2, 3, 0])
  // const indices = new Uint16Array([0, 3, 2, 2, 1, 0])

  let vertexBuffer = new DataView(vertices.buffer);
  let attributes = [
    new PrimitiveAttribute('POSITION', vertexBuffer, 3, GL.FLOAT, 12, 0),
  ];
  // wrong d.ts ?
  // @ts-ignore
  const primitive = new Primitive(material, attributes, 4, indices);
  return primitive;
}

export class ArPlaneDetection {
  static get requiredFeature(): string {
    return 'plane-detection';
  }

  lastMap: Map<XRPlane, DetectedItem> = new Map();
  newMap: Map<XRPlane, DetectedItem> = new Map();
  arOcclusionMaterial: Material;

  constructor(mode: XRSessionMode) {
    if (mode == 'immersive-ar') {
      this.arOcclusionMaterial = new Material('ArOcclusionMaterial', ArOcclusionShader);
    }
    else {
      this.arOcclusionMaterial = new Material('ArOcclusionMaterialDebug', ArOcclusionShaderDebug);
    }
  }

  update(world: World, refsp: XRReferenceSpace, frame: XRFrame) {

    // @ts-ignore
    const detectedPlanes = frame.detectedPlanes as (XRPlaneSet | null);
    if (!detectedPlanes) {
      console.error('"plane-detection" faeature required');
      return;
    }

    this.newMap.clear();
    detectedPlanes.forEach(plane => {
      this._updatePlane(world, refsp, frame, plane);
    });

    // flicker ?
    this.lastMap.forEach((c, _) => {
      // not found. remove
      console.log('destroy', c.entity);
      world.destroy(c.entity);
    });

    const tmp = this.lastMap;
    this.lastMap = this.newMap;
    this.newMap = tmp;
  }

  _updatePlane(world: World, refsp: XRReferenceSpace, frame: XRFrame, plane: XRPlane) {
    const pose = frame.getPose(plane.planeSpace, refsp);
    if (!pose) {
      return;
    }

    const item = this.lastMap.get(plane);
    if (item) {
      if (plane.lastChangedTime > item.time) {
        // pose update ?
        const matrix = world.get(item.entity, mat4);
        if (matrix) {
          matrix.array.set(pose.transform.matrix);
        }
        else {
          console.warn('mat4 not found', item)
        }
        item.time = plane.lastChangedTime;
      }
      else {
        // keep same
        this.lastMap.delete(plane);
        this.newMap.set(plane, {
          entity: item.entity,
          time: plane.lastChangedTime
        });
      }
    }
    else {
      // create new
      const primitive = createPrimitive(plane, this.arOcclusionMaterial);
      const matrix = new mat4();
      matrix.array.set(pose.transform.matrix);
      const entity = world.create(matrix, primitive);

      // console.log('new plane', entity, plane)
      this.newMap.set(plane, {
        entity,
        time: plane.lastChangedTime
      });
    }
  }
}
