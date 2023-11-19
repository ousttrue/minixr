import { PrimitiveAttribute, Primitive } from '../geometry/primitive.mjs';
import { mat4, Transform } from '../math/gl-matrix.mjs';
import { World, Entity } from '../third-party/uecs-0.4.2/index.mjs';
import { Material } from '../materials/material.mjs';


const GL = WebGLRenderingContext; // For enums


class ArOcclusionMaterial extends Material {
  constructor() {
    super();
  }

  get materialName() {
    return 'ArOcclusion';
  }

  get vertexSource() {
    return `
uniform mat4 PROJECTION_MATRIX, VIEW_MATRIX, MODEL_MATRIX;
in vec3 POSITION;

void main() {
  gl_Position = PROJECTION_MATRIX * VIEW_MATRIX * MODEL_MATRIX * vec4(POSITION, 1.0);
}`;
  }

  get fragmentSource() {
    return `
precision mediump float;
out vec4 _Color;

void main() {
  _Color = vec4(0, 0, 0, 0);
  // _Color = vec4(0, 0, 0, 1);
}`;
  }
}


type MeshItem = {
  entity: Entity,
  time: number,
}


function createPrimitive(mesh: XRMesh, material: Material): Primitive {
  let vertexBuffer = new DataView(
    mesh.vertices.buffer, mesh.vertices.byteOffset, mesh.vertices.byteLength);
  let attributes = [
    new PrimitiveAttribute('POSITION', vertexBuffer, 3, GL.FLOAT, 12, 0),
  ];
  // wrong d.ts ?
  // @ts-ignore
  const indices = mesh.indices as Uint32Array;
  const primitive = new Primitive(material, attributes, mesh.vertices.length / 3, indices);
  return primitive;
}

export class ArMeshDetection {

  static get requiredFeature(): string {
    return 'mesh-detection';
  }

  lastMap: Map<XRMesh, MeshItem> = new Map();
  newMap: Map<XRMesh, MeshItem> = new Map();
  arOcclusionMaterial = new ArOcclusionMaterial();

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
        // create new
        const primitive = createPrimitive(mesh, this.arOcclusionMaterial);
        const transform = new Transform();
        transform.matrix = new mat4(pose.transform.matrix);
        const entity = world.create(transform, primitive);

        console.log('update mesh', entity, mesh.semanticLabel,
          mesh.lastChangedTime, item.time)
        this.newMap.set(mesh, {
          entity,
          time: mesh.lastChangedTime
        });
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
      const transform = new Transform();
      transform.matrix = new mat4(pose.transform.matrix);
      const entity = world.create(transform, primitive);

      console.log('new mesh', entity, mesh.semanticLabel)
      this.newMap.set(mesh, {
        entity,
        time: mesh.lastChangedTime
      });
    }
  }
}
