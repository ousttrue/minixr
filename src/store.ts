import { create } from 'zustand'
import { Scene } from '../webxr/js/scene.mjs';
import { Glb } from '../webxr/js/glb.mjs';
import { Gltf2Loader } from '../webxr/js/gltf2-loader.mjs';


type State = {
  status: string
  loader: Gltf2Loader | null
  scene: Scene | null
}


interface Action {
  setItems(items: DataTransferItemList): void
  setLoader(loader: Gltf2Loader): void
  setScene(scene: Scene): void
}


function processBytes(get, set, bytes: ArrayBuffer) {
  try {
    const glb = Glb.parse(bytes);
    const loader = new Gltf2Loader(glb.json, { binaryChunk: glb.bin });
    get().setLoader(loader);
    set({
      status: 'glb',
    })
  }
  catch (err) {
    const decoder = new TextDecoder();
    const text = decoder.decode(bytes);
    const json = JSON.parse(text);
    const loader = new Gltf2Loader(json, {});
    get().setLoader(loader);
    set({
      status: 'gltf',
    })
  }
}


export const useStore = create<State & Action>((set, get) => ({
  status: 'no file',
  loader: null,
  scene: null,

  setItems: async (items: DataTransferItemList) => {
    if (items.length == 1) {
      // FileSystemApi
      const handle = await items[0].getAsFileSystemHandle();
      if (handle instanceof FileSystemFileHandle) {
        const file = await handle.getFile();
        if (file) {
          const bytes = await file.arrayBuffer();
          processBytes(get, set, bytes);
        }
      }
      else if (handle instanceof FileSystemDirectoryHandle) {
        set({
          status: 'directory',
        })
        // FileSystemApi
        for await (const [key, value] of handle.entries()) {
          if (key.endsWith(".glb")) {
            const file = await value.getFile();
            if (file) {
              const bytes = await file.arrayBuffer();
              processBytes(get, set, bytes);
            }
          }
          else if (key.endsWith(".gltf")) {
            const file = await value.getFile();
            if (file) {
              const bytes = await file.arrayBuffer();
              processBytes(get, set, bytes);
            }
          }
        }
      }
      else {
        set({
          status: 'not file',
        })
      }
    }
    else {
      set({
        status: 'multi',
      })
    }
  },

  setLoader: (loader: Gltf2Loader) => {
    loader.load().then(() => {
      const scene = new Scene();
      get().setScene(scene);
    }).catch((err) => {
      console.log(err);
      set({
        status: `error: ${err}`
      })
    });
    set({
      status: 'load',
      loader
    });
  },

  setScene: async (scene: Scene) => {
    await scene.load(get().loader!)
    set({
      status: 'scene',
      scene
    })
  },
}));
