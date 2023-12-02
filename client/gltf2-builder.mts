import { Gltf2Loader } from '../lib/gltf2-loader.mjs';
import { World } from './js/third-party/uecs-0.4.2/index.mjs';
import { vec3, quat, mat4 } from '../lib/math/gl-matrix.mjs';
import type * as GLTF2 from '../lib/GLTF2.d.ts';


function _processNodes(world: World,
  loader: Gltf2Loader, glNode: GLTF2.Node, parent?: mat4) {
  const matrix = new mat4();
  if (glNode.matrix) {
    matrix.array.set(new Float32Array(glNode.matrix));
  } else {
    const t = new vec3();
    if (glNode.translation) {
      t.x = glNode.translation[0];
      t.y = glNode.translation[1];
      t.z = glNode.translation[2];
    }

    const r = new quat();
    if (glNode.rotation) {
      r.x = glNode.rotation[0];
      r.y = glNode.rotation[1];
      r.z = glNode.rotation[2];
      r.w = glNode.rotation[3];
    }

    const s = vec3.fromValues(1, 1, 1);
    if (glNode.scale) {
      s.x = glNode.scale[0];
      s.y = glNode.scale[1];
      s.z = glNode.scale[2];
    }

    mat4.fromTRS(t, r, s, { out: matrix });
  }

  if (parent) {
    parent.mul(matrix, { out: matrix })
  }

  let prims = 0;
  if (glNode.mesh != null) {
    const mesh = loader.meshes[glNode.mesh];
    for (const primitive of mesh.primitives) {

      world.create(matrix, primitive);
      ++prims;
    }
  }

  if (glNode.children && loader.json.nodes) {
    for (const nodeId of glNode.children) {
      const glChildNode = loader.json.nodes[nodeId];
      _processNodes(world, loader, glChildNode, matrix);
    }
  }
}


export async function buildGltf(world: World, loader: Gltf2Loader, origin?: mat4) {
  // const sceneNode = new Node('gltf.scene');
  if (loader.json.nodes && loader.json.scenes) {
    const scene = loader.json.scenes[loader.json.scene ?? 0];
    if (scene.nodes) {
      for (const nodeId of scene.nodes) {
        const glNode = loader.json.nodes[nodeId];
        _processNodes(world, loader, glNode, origin);
      }
    }
  }
}

