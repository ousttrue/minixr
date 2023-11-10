import { Node } from '../node.mjs';
import { Gltf2Loader } from './gltf2.mjs';

export class WebWorkerLoader {

  loadasync(url: string): Promise<Node> {
    return new Promise(async resolved => {
      // TODO: use webworker
      const loader = new Gltf2Loader();
      const node = await loader.loadFromUrl(url);
      return resolved(node);
    });
  }

}

