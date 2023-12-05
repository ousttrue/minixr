import React from 'react'
import './App.css'
import MyDropzone from './dropzone.jsx';
import { Glb } from '../lib/glb.js';
import type * as GLTF2 from '../lib/GLTF2.d.ts';
import JsonTree from './jsontree.jsx';
import Split from 'react-split'
import WebGLCanvas from './webgl.jsx';
import { World } from '../lib/uecs/index.mjs';
import { Gltf2Loader } from '../lib/gltf2-loader.mjs';
import { vec3, quat, mat4 } from '../lib/math/gl-matrix.mjs';


class FileState {
  file: File | null = null;
  bytes: ArrayBuffer | null = null;
  reader: FileReader | null = null;
  glb: Glb | null = null;
  status = '';
  world = new World();
  setJson: Function;

  constructor() {
    this.setJson = () => { };
  }

  toString(): string {
    if (!this.file) {
      return 'no file';
    }
    return `file: ${this.file.name} ${this.status}`
  }

  setFile(file: File) {
    if (file instanceof File) {
      // File => ArrayBuffer
      this.status = 'reading...';
      const reader = new FileReader()
      this.reader = reader;
      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          this.setBytes(reader.result);
        }
      }
      reader.readAsArrayBuffer(file);
    }
  }

  setBytes(bytes: ArrayBuffer) {
    this.bytes = bytes;
    if (bytes) {
      // ArrayBuffer => Glb
      this.status = 'parse...';
      const glb = Glb.parse(bytes);
      this.setGlb(glb);
    }
  }

  setGlb(glb: Glb) {
    this.glb = glb;
    this.status = 'glb';
    this.world = new World();

    if (this.glb) {
      this.setJson(this.glb.json);
      const loader = new Gltf2Loader(this.glb.json, { binaryChunk: this.glb.bin });
      loader.load().then(() => {
        this.setLoader(loader);
      });
    }
    else {
      // dispose ?
      // this.loader = null;
    }
  }

  setLoader(loader: Gltf2Loader) {
    if (!this.glb) {
      return;
    }
    const gltf = this.glb.json;
    if (gltf.scenes) {
      for (const scene of gltf.scenes) {
        if (scene.nodes) {
          for (const i of scene.nodes) {
            this.loadNode(loader, gltf, i);
          }
        }
      }
    }
  }

  loadNode(loader: Gltf2Loader, gltf: GLTF2.GlTf, i: number, parent?: mat4) {
    if (!gltf.nodes) {
      return;
    }
    const node = gltf.nodes[i];

    const matrix = mat4.identity();
    if (node.matrix) {
      matrix.array.set(node.matrix);
    }
    else {
      const t = vec3.fromValues(0, 0, 0);
      if (node.translation) {
        t.array.set(node.translation);
      }
      const r = quat.fromValues(0, 0, 0, 1);
      if (node.rotation) {
        r.array.set(node.rotation);
      }
      const s = vec3.fromValues(1, 1, 1);
      if (node.scale) {
        s.array.set(node.scale);
      }
      mat4.fromTRS(t, r, s, { out: matrix })
    }
    if (parent) {
      parent.mul(matrix, { out: matrix })
    }

    if (node.mesh != null) {
      const mesh = loader.meshes[node.mesh]
      this.world.create(matrix, mesh);
      // console.log(i, mesh);
    }
    if (node.children) {
      for (const child of node.children) {
        this.loadNode(loader, gltf, child, matrix);
      }
    }
  }
}


const state = new FileState();

export default function App() {
  const [json, setJson] = React.useState(null);
  state.setJson = setJson
  const ref = React.useRef(state);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <MyDropzone setFile={(file) => ref.current.setFile(file)}
        message={(isDragActive: boolean) => isDragActive ?
          <p style={{ textAlign: 'center' }}>🔽 Drop the files here ...</p> :
          <p style={{ textAlign: 'center' }}>➕ Drag 'n' drop some files here, or click to select files</p>
        }
      />
      <div>{ref.current.toString()}</div>
      <Split
        className="split"
      >
        <div style={{ overflowY: 'auto' }}>
          <JsonTree json={json} />
        </div>
        <WebGLCanvas world={ref.current.world} />
      </Split>
    </div>
  )
}
