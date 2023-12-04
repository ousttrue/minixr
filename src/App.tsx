import React from 'react'
import './App.css'
import MyDropzone from './dropzone.jsx';
import { Glb } from '../lib/glb.js';
import JsonTree, { JsonItem } from './jsontree.jsx';
import Split from 'react-split'
import WebGLCanvas from './webgl.jsx';
import { World } from '../lib/uecs/index.mjs';


class FileState {

  reader: FileReader | null = null;
  glb: Glb | null = null;
  status = '';

  constructor(
    public readonly file: File,
    public readonly bytes: ArrayBuffer | null,
    setState: (state: FileState) => void,
    setContent: (content: JsonItem) => void,
  ) {
    if (bytes) {
      // ArrayBuffer => Glb
      this.status = 'parse...';
      this.glb = Glb.parse(bytes);
      this.status = 'glb';
      setContent({ json: this.glb.json });
    }
    else if (file instanceof File) {
      // File => ArrayBuffer
      this.status = 'reading...';
      const reader = new FileReader()
      this.reader = reader;
      reader.onabort = () => console.log('file reading was aborted')
      reader.onerror = () => console.log('file reading has failed')
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          setState(new FileState(this.file, reader.result, setState, setContent));
        }
      }
      reader.readAsArrayBuffer(file);
    }
    else {
      throw new Error('invalid type');
    }
  }

  toString(): string {
    return `file: ${this.file.name} ${this.status}`
  }
}

const world = new World();

export default function App() {
  const [content, setContent] = React.useState<JsonItem>({});
  const [fileState, setFileState] = React.useState<FileState | null>(null);
  const ref = React.useRef(world);

  // if (glb != this.glb) {
  //   this.glb = glb ?? null;
  //   if (this.glb) {
  //     const loader = new Gltf2Loader(this.glb.json, { binaryChunk: this.glb.bin });
  //     loader.load().then(() => {
  //       this.loader = loader;
  //     });
  //   }
  //   else {
  //     // dispose ?
  //     this.loader = null;
  //   }
  // }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <MyDropzone setFile={(file) => setFileState(new FileState(file, null, setFileState, setContent))}
        message={(isDragActive: boolean) => isDragActive ?
          <p style={{ textAlign: 'center' }}>🔽 Drop the files here ...</p> :
          <p style={{ textAlign: 'center' }}>➕ Drag 'n' drop some files here, or click to select files</p>
        }
      />
      <div>
        {fileState ? fileState.toString() : 'null'}
      </div>
      <Split
        className="split"
      >
        <div style={{ overflowY: 'auto' }}>
          {
            (fileState && fileState.glb)
              ? (<JsonTree
                content={content}
                onChange={setContent}
              />)
              : ''
          }
        </div>
        <WebGLCanvas world={ref.current} />
      </Split>
    </div>
  )
}
