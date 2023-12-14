import { JSONEditor } from "vanilla-jsoneditor";
import { useEffect, useRef } from "react";
// import 'vanilla-jsoneditor/themes/jse-theme-default.css';


export default function JsonTree(props: {
  json: any,
}) {

  const refContainer = useRef<HTMLDivElement | null>(null);
  const refEditor = useRef<JSONEditor | null>(null);

  useEffect(() => {
    if (!refContainer.current) {
      return;
    }

    // create editor
    console.log("create editor", refContainer.current);
    refEditor.current = new JSONEditor({
      target: refContainer.current,
      props: {}
    });

    if (refEditor.current) {
      console.log("update props", props);
      refEditor.current.updateProps({ content: { json: props.json } });
    }

    return () => {
      // destroy editor
      if (refEditor.current) {
        console.log("destroy editor");
        refEditor.current.destroy();
        refEditor.current = null;
      }
    };
  }, [props.json]);

  return (<div
    className="vanilla-jsoneditor-react"
    ref={refContainer}
    style={{ width: '100%', height: '100%' }}
  />);
}
