import React from 'react'
import './App.css'
import JsonTree from './jsontree.jsx';
import Split from 'react-split'
import WebGLCanvas from './webgl.jsx';
import { useStore } from './store.js';
// import MyDropzone from './dropzone.jsx';
// import { fromEvent } from 'file-selector';

export default function App() {
  const setItems = useStore((state) => state.setItems)
  const status = useStore((state) => state.status)
  const loader = useStore((state) => state.loader)
  const scene = useStore((state) => state.scene)

  const handleDragOver: React.DragEventHandler = (ev) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
  }
  const handleDrop: React.DragEventHandler = async (ev) => {
    ev.preventDefault()
    setItems(ev.dataTransfer.items);
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div>{status}</div>
      <Split
        className="split"
      >
        <div style={{ overflowY: 'auto' }}>
          <JsonTree json={loader ? loader.json : null} />
        </div>
        <WebGLCanvas
          scene={scene ?? undefined}
        />
      </Split>
    </div>
  )
}
