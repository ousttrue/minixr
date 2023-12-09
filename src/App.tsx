import React from 'react'
import './App.css'
import MyDropzone from './dropzone.jsx';
import JsonTree from './jsontree.jsx';
import Split from 'react-split'
import WebGLCanvas from './webgl.jsx';
import { useStore } from './store.js';


export default function App() {
  const setFile = useStore((state) => state.setFile)
  const status = useStore((state) => state.status)
  const glb = useStore((state) => state.glb)
  const scene = useStore((state) => state.scene)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <MyDropzone setFile={(file) => setFile(file)}
        message={(isDragActive: boolean) => isDragActive ?
          <p style={{ textAlign: 'center' }}>🔽 Drop the files here ...</p> :
          <p style={{ textAlign: 'center' }}>➕ Drag 'n' drop some files here, or click to select files</p>
        }
      />
      <div>{status}</div>
      <Split
        className="split"
      >
        <div style={{ overflowY: 'auto' }}>
          <JsonTree json={glb ? glb.json : null} />
        </div>
        <WebGLCanvas
          scene={scene ?? undefined}
        />
      </Split>
    </div>
  )
}
