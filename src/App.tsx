import { useState } from 'react'
import './App.css'
import MyDropzone from './dropzone.jsx';
import { Glb } from '../lib/glb.js';
import JsonTree, { JsonItem } from './jsontree.jsx';
import Split from 'react-split'
import WebGLCanvas from './webgl.jsx';


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

  static set(setState: Function, file: File, setContent: Function) {
    const reader = new Reader(file, (res: null | ArrayBuffer | string) => {
      if (typeof (res) == 'string') {
        setState(res);
      }
      else if (res instanceof ArrayBuffer) {
        const glb = Glb.parse(res);
        setState(glb);
        if (glb) {
          console.log(glb);
          setContent({ json: glb.json });
        }
      }
      else {
        setState(null);
      }
    });
    setState(reader);
  }
  toString(): string {
    return 'loading...';
  }
}


type State = null | Reader | string | Glb;


export default function App() {
  const [content, setContent] = useState<JsonItem>({});
  const [state, setState] = useState<State>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <MyDropzone setFile={(file) => Reader.set(setState, file, setContent)}
        message={(isDragActive: boolean) => isDragActive ?
          <p style={{ textAlign: 'center' }}>🔽 Drop the files here ...</p> :
          <p style={{ textAlign: 'center' }}>➕ Drag 'n' drop some files here, or click to select files</p>
        }
      />
      <div>
        {state ? state.toString() : 'null'}
      </div>
      <Split
        className="split"
      >
        <div style={{ overflowY: 'auto' }}>
          {
            (state instanceof Glb)
              ? (<JsonTree
                content={content}
                onChange={setContent}
              />)
              : ''
          }
        </div>
        <WebGLCanvas glb={state instanceof Glb ? state : undefined} />
      </Split>
    </div>
  )
}
