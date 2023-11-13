import { Node } from './node.mjs';
import { PrimitiveAttribute, Primitive } from '../geometry/primitive.mjs';
import { mat4 } from '../../math/gl-matrix.mjs';
import { Material } from '../materials/material.mjs';

const GL = WebGLRenderingContext; // For enums

type MeshPrimitive = {
  node: Node,
  time: number,
}

export class ArOcclusionMaterial extends Material {
  constructor() {
    super();
  }

  get materialName() {
    return 'ArOcclusion';
  }

  get vertexSource() {
    return `
    attribute vec3 POSITION;

    vec4 vertex_main(mat4 proj, mat4 view, mat4 model) {
      return proj * view * model * vec4(POSITION, 1.0);
    }`;
  }

  get fragmentSource() {
    return `
      precision mediump float;

      vec4 fragment_main() {
        return vec4(0, 0, 0, 0);
      }`;
  }
}
export class ArMeshOccusion extends Node {

  lastMap: Map<XRMesh, MeshPrimitive> = new Map();
  newMap: Map<XRMesh, MeshPrimitive> = new Map();
  arOcclusionMaterial = new ArOcclusionMaterial();

  constructor() {
    super("ArMeshOccusion");
    // this.arOcclusionMaterial.baseColorFactor.value = [0, 0, 0, 0];
  }

  protected _onUpdate(_timestamp: number, _frameDelta: number,
    refsp: XRReferenceSpace, frame: XRFrame, _inputSources: XRInputSourceArray) {

    // @ts-ignore
    const detectedMeshes = frame.detectedMeshes as (XRMeshSet | null);
    if (!detectedMeshes) {
      console.error('"mesh-detection" faeature required');
      return;
    }

    this.newMap.clear();

    detectedMeshes.forEach(mesh => {

      const pose = frame.getPose(mesh.meshSpace, refsp);
      if (!pose) {
        return;
      }

      const meshPrimitive = this.lastMap.get(mesh);
      if (meshPrimitive) {
        if (mesh.lastChangedTime > meshPrimitive.time) {
          // create new
          const node = this._createMeshNode(mesh, pose);
          this.newMap.set(mesh, {
            node,
            time: mesh.lastChangedTime
          });
          this.addNode(node);
        }
        else {
          // keep same
          this.lastMap.delete(mesh);
          this.newMap.set(mesh, {
            node: meshPrimitive.node,
            time: mesh.lastChangedTime
          });
        }
      }
      else {
        // create new
        const node = this._createMeshNode(mesh, pose);
        this.newMap.set(mesh, {
          node,
          time: mesh.lastChangedTime
        });
        this.addNode(node);
      }
    });

    this.lastMap.forEach((c, _) => {
      // not found. remove
      this.removeNode(c.node);
    });

    const tmp = this.lastMap;
    this.lastMap = this.newMap;
    this.newMap = tmp;
  }

  private _createMeshNode(mesh: XRMesh, pose: XRPose): Node {
    // new primitive
    let vertexBuffer = new DataView(mesh.vertices.buffer, mesh.vertices.byteOffset, mesh.vertices.byteLength);
    let attributes = [
      new PrimitiveAttribute('POSITION', vertexBuffer, 3, GL.FLOAT, 0, 0),
    ];
    // wrong d.ts ?
    // @ts-ignore
    const indices = mesh.indices as Uint32Array;
    const primitive = new Primitive(this.arOcclusionMaterial, attributes, mesh.vertices.length / 3, indices);

    const node = new Node(`meshDetection: ${mesh.semanticLabel}`);
    node.primitives.push(primitive);

    node.local.matrix = new mat4(pose.transform.matrix);

    console.log('new node', node)
    return node;
  }
}

