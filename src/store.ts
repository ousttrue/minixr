import { create } from 'zustand'
import { Scene } from '../lib/scene.mjs';
import { Glb } from '../lib/glb.mjs';
import { Gltf2Loader } from '../lib/gltf2-loader.mjs';


type State = {
  status: string
  loader: Gltf2Loader | null
  scene: Scene | null
}


type Action = {
  setItems: (items: DataTransferItemList) => void
  setLoader: (loader: Gltf2Loader) => void
  setScene: (scene: Scene) => void
}


export const useStore = create<State & Action>((set, get) => ({
  status: 'no file',
  loader: null,
  scene: null,

  setItems: async (items: DataTransferItemList) => {
    if (items.length == 1) {
      const handle = await items[0].getAsFileSystemHandle();
      if (handle instanceof FileSystemFileHandle) {
        const file = await handle.getFile();
        if (file) {
          const bytes = await file.arrayBuffer();
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
      }
      else if (handle instanceof FileSystemDirectoryHandle) {
        set({
          status: 'directory',
        })
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
      const scene = new Scene(loader);
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
    await scene.load()
    set({
      status: 'scene',
      scene
    })
  },
}));
