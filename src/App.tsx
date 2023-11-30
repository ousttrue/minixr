import { useState } from 'react'
import './App.css'
import MyDropzone from './dropzone.jsx';
import { Glb } from '../lib/glb.js';
import JsonTree from './jsontree.jsx';


class Reader {
  constructor(
    public readonly file: File,
    onLoaded: (result: null | string | ArrayBuffer) => void,
  ) {
    const reader = new FileReader()
    reader.onabort = () => console.log('file reading was aborted')
    reader.onerror = () => console.log('file reading has failed')
    reader.onload = () => {
      // const res = reader.result
      onLoaded(reader.result);
    }
    reader.readAsArrayBuffer(file);
  }

  toString(): string {
    return 'loading...';
  }
}


class Loader {
  state: string;
  glb: Glb | null = null;

  constructor(
    public readonly file: File,
    public readonly bytes: ArrayBuffer) {
    this.state = `${file.name}: ${bytes.byteLength} bytes`
    try {
      this.glb = Glb.parse(bytes);
    }
    catch (err) {
      console.warn(err);
    }
  }

  toString(): string {
    if (this.glb) {
      return `glTF: ${this.glb.json.asset.version}`;
    }
    return this.state;
  }
}


type State = null | Reader | string | Loader;



export default function App() {
  const [content, setContent] = useState<object>({});

  const [state, setState] = useState<State>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <MyDropzone setFile={(file) =>
        setState(new Reader(file, (res: null | ArrayBuffer | string) => {
          if (typeof (res) == 'string') {
            setState(res);
          }
          else if (res instanceof ArrayBuffer) {
            const loader = new Loader(file, res);
            setState(loader);
            const glb = loader.glb;
            if (glb) {
              setContent({ json: glb.json });
            }
          }
          else {
            setState(null);
          }
        }))}
        message={(isDragActive: boolean) => isDragActive ?
          <p style={{ textAlign: 'center' }}>🔽 Drop the files here ...</p> :
          <p style={{ textAlign: 'center' }}>➕ Drag 'n' drop some files here, or click to select files</p>
        }
      />
      <div>
        {state ? state.toString() : 'null'}
      </div>
      <div style={{ flexGrow: 1 }}>
        {(state instanceof Loader)
          ? <JsonTree
            content={content}
            onChange={setContent}
          />
          : ''}
      </div>
    </div>
  )
}
