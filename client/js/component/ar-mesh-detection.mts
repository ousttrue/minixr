import { MeshVertexAttribute, Mesh, SubMesh } from '../buffer/mesh.mjs';
import { BufferSource } from '../buffer/buffersource.mjs';
import { mat4 } from '../math/gl-matrix.mjs';
import { World } from '../uecs/index.mjs';
import { ArOcclusionShader, ArOcclusionShaderDebug, DetectedItem } from './ar-detection.mjs';
import { Material } from '../materials/material.mjs';


const GL = WebGLRenderingContext; // For enums


function createPrimitive(mesh: XRMesh, material: Material): Mesh {
  let vertexBuffer = new BufferSource(3, mesh.vertices);
  let attributes = [
    new MeshVertexAttribute('POSITION', vertexBuffer, 3, GL.FLOAT, 12, 0),
  ];
  // wrong d.ts ?
  // @ts-ignore
  const indices = mesh.indices as Uint32Array;
  const primitive = new Mesh(attributes, mesh.vertices.length / 3,
    [new SubMesh(material, indices.length)],
    new BufferSource(1, indices));
  return primitive;
}

export class ArMeshDetection {

  static get requiredFeature(): string {
    return 'mesh-detection';
  }

  lastMap: Map<XRMesh, DetectedItem> = new Map();
  newMap: Map<XRMesh, DetectedItem> = new Map();
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
    const detectedMeshes = frame.detectedMeshes as (XRMeshSet | null);
    if (!detectedMeshes) {
      console.error('"mesh-detection" faeature required');
      return;
    }

    this.newMap.clear();
    detectedMeshes.forEach(mesh => {
      this._updateMesh(world, refsp, frame, mesh);
    });

    this.lastMap.forEach((c, _) => {
      // not found. remove
      console.log('destroy', c.entity);
      world.destroy(c.entity);
    });

    const tmp = this.lastMap;
    this.lastMap = this.newMap;
    this.newMap = tmp;
  }

  _updateMesh(world: World, refsp: XRReferenceSpace, frame: XRFrame, mesh: XRMesh) {
    const pose = frame.getPose(mesh.meshSpace, refsp);
    if (!pose) {
      return;
    }

    const item = this.lastMap.get(mesh);
    if (item) {
      if (mesh.lastChangedTime > item.time) {
        // pose update ?
        const matrix = world.get(item.entity, mat4);
        if (matrix) {
          matrix.array.set(pose.transform.matrix);
        }
        else {
          console.warn('mat4 not found', item)
        }
        item.time = mesh.lastChangedTime;
      }
      else {
        // keep same
        this.lastMap.delete(mesh);
        this.newMap.set(mesh, {
          entity: item.entity,
          time: mesh.lastChangedTime
        });
      }
    }
    else {
      // create new
      const primitive = createPrimitive(mesh, this.arOcclusionMaterial);
      const matrix = new mat4();
      matrix.array.set(pose.transform.matrix);
      const entity = world.create(matrix, primitive);

      console.log('new mesh', entity, mesh.semanticLabel)
      this.newMap.set(mesh, {
        entity,
        time: mesh.lastChangedTime
      });
    }
  }
}
