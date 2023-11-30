import { useState } from 'react'
import './App.css'
import MyDropzone from './dropzone.jsx';
import { Glb } from '../lib/glb.js';


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


function App() {
  const [state, setState] = useState<State>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <MyDropzone setFile={(file) =>
        setState(new Reader(file, (res: null | ArrayBuffer | string) => {
          if (typeof (res) == 'string') {
            setState(res);
          }
          else if (res instanceof ArrayBuffer) {
            setState(new Loader(file, res));
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
      <div style={{ flexGrow: 1 }}>
        {state ? state.toString() : 'null'}
      </div>
    </div>
  )
}

export default App
