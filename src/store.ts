import { create } from 'zustand'
import { Scene } from '../lib/scene.mjs';
import { Glb } from '../lib/glb.mjs';
import { Gltf2Loader } from '../lib/gltf2-loader.mjs';


type State = {
  status: string;
  file: File | null;
  reader: FileReader | null;
  glb: Glb | null;
  scene: Scene | null;
}


type Action = {
  setFile: (file: File) => void;
  setBytes: (bytes: ArrayBuffer) => void;
  setScene: (scene: Scene) => void;
}


export const useStore = create<State & Action>((set) => ({
  status: 'no file',
  file: null,
  reader: null,
  glb: null,
  scene: null,

  setFile: (file: File) => set((state) => {
    if (file instanceof File) {
      // File => ArrayBuffer
      const reader = new FileReader()
      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')
      reader.onload = () => {
        const bytes = reader.result;
        if (bytes instanceof ArrayBuffer) {
          state.setBytes(bytes);
        }
      }
      reader.readAsArrayBuffer(file);
      return {
        status: `file: ${file.name}`,
        reader: reader,
      };
    }
    else {
      return {
        status: 'no file',
      };
    }
  }),

  setBytes: (bytes: ArrayBuffer) => set((state) => {
    const glb = Glb.parse(bytes);
    if (glb) {
      const loader = new Gltf2Loader(glb.json, { binaryChunk: glb.bin });
      loader.load().then(() => {
        const scene = new Scene(glb, loader);
        state.setScene(scene);
      });
      return {
        glb
      };
    }
    else {
      return {};
    }
  }),

  setScene: (scene: Scene) => set((state) => {
    scene.load().then(() => {
    })
    return { scene }
  })
}));
