import { useState } from 'react'
import './App.css'
import MyDropzone from './dropzone.jsx';
import { Glb } from '../lib/glb.js';
import JsonTree, { JsonItem } from './jsontree.jsx';
import Split from 'react-split'
import WebGLCanvas from './webgl.jsx';


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


export default function App() {
  const [content, setContent] = useState<JsonItem>({});
  const [fileState, setFileState] = useState<FileState | null>(null);

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
        <WebGLCanvas glb={(fileState && fileState.glb) ? fileState.glb : undefined} />
      </Split>
    </div>
  )
}
