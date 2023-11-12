import { Node } from '../nodes/node.mjs';
import { CubeSeaNode } from '../nodes/cube-sea.mjs';
import { Gltf2Loader } from './gltf2.mjs';
import { UrlTexture } from '../materials/texture.mjs';

export class WebWorkerLoader {

  loadGltfAsync(url: string): Promise<Node> {
    return new Promise(async resolved => {
      // TODO: use webworker
      const loader = new Gltf2Loader();
      const node = await loader.loadFromUrl(url);
      return resolved(node);
    });
  }

  async loadCubeSeaAsync(): Promise<Node> {
    const texture = new UrlTexture('../../assets/textures/cube-sea.png');
    await texture._promise;

    const cubeSea = new CubeSeaNode({
      texture: texture,

      // Number and size of the static cubes. Use the larger
      // cube count from heavyGpu to avoid inconsistent defaults.
      cubeCount: 12,
      cubeScale: 1,

      // If true, use a very heavyweight shader to stress the GPU.
      heavyGpu: false,

      // Draw only half the world cubes. Helps test variable render cost
      // when combined with heavyGpu.
      halfOnly: false,

      // Automatically spin the world cubes. Intended for automated testing,
      // not recommended for viewing in a headset.
      autoRotate: true,
    });
    // @ts-ignore
    return Promise.resolve(cubeSea);
  }
}
