import React, { useCallback } from 'react'
import Dropzone, { useDropzone } from 'react-dropzone'

export default function MyDropzone(props: {
  setFile: (file: File) => void,
  message: (isDragActive: boolean) => JSX.Element,
}) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      props.setFile(acceptedFiles[0]);
    }

  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div className="dropZone" {...getRootProps()}>
      <input {...getInputProps()} />
      {props.message(isDragActive)}
    </div>
  )
}
