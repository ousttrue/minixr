import React from 'react'
import './App.css'
import MyDropzone from './dropzone.jsx';
import { Glb } from '../lib/glb.mjs';
import JsonTree from './jsontree.jsx';
import Split from 'react-split'
import WebGLCanvas from './webgl.jsx';
import { Gltf2Loader } from '../lib/gltf2-loader.mjs';
import { Scene } from '../lib/scene.mjs';


class FileState {
  file: File | null = null;
  bytes: ArrayBuffer | null = null;
  reader: FileReader | null = null;
  status = '';
  setJson: Function;
  scene: Scene | null = null;

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

  async setBytes(bytes: ArrayBuffer) {
    this.bytes = bytes;
    if (!bytes) {
      return;
    }

    // ArrayBuffer => Glb
    this.status = 'parse...';
    const glb = Glb.parse(bytes);
    this.status = 'glb';
    if (glb) {
      const loader = new Gltf2Loader(glb.json, { binaryChunk: glb.bin });
      await loader.load();
      this.scene = new Scene(glb, loader);
      await this.scene.load();
      this.setJson(glb.json);
    }
    else {
      this.setJson(null);
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
        <WebGLCanvas
          scene={ref.current.scene ?? undefined}
        />
      </Split>
    </div>
  )
}
