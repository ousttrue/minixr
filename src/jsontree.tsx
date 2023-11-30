import { JSONEditor } from "vanilla-jsoneditor";
import { useEffect, useRef } from "react";
import 'vanilla-jsoneditor/themes/jse-theme-default.css';


type JsonItem = boolean | number | string | Array<JsonItem> | { [key: string]: JsonItem };

class JsonTreePovider implements TreeDataProvider<JsonItem> {
  constructor(
    public readonly json: JsonItem,
  ) { }
  // onDidChangeTreeData?: (listener: (changedItemIds: TreeItemIndex[]) => void) => Disposable;
  getTreeItem(itemId: TreeItemIndex): Promise<TreeItem<JsonItem>> {

    if (typeof (itemId) !== 'string') {
      throw new Error('invalid key');
    }
    if (itemId[0] != '/') {
      throw new Error('first must /');
    }

    const path: string[] = itemId == '/'
      ? []
      : itemId.substring(1).split('/');

    // root
    let data: JsonItem = this.json;
    while (path.length > 0) {
      const next = path.shift()!;
      switch (typeof (data)) {
        case 'boolean':
        case 'number':
        case 'string':
          // literal
          throw new Error("literal !");
      }
      if (Array.isArray(data)) {
        const index = parseInt(next);
        if (index == null) {
          throw new Error('not number key');
        }
        data = data[index];
      }
      else {
        data = data[next];
      }
    }
    // console.log(itemId, path, data);

    const item: TreeItem<JsonItem> = {
      index: itemId,
      data: this.json,
    };

    const parent = itemId == '/' ? '/' : itemId + '/';
    switch (typeof (data)) {
      case 'boolean':
      case 'number':
      case 'string':
        // literal
        break;
      default:
        if (Array.isArray(data)) {
          item.children = [];
          for (let i = 0; i < data.length; ++i) {
            item.children.push(`${parent}${i}`);
          }
          item.isFolder = true;
        }
        else {
          item.children = Object.keys(data).map(x => `${parent}${x}`);
          item.isFolder = true;
        }
        break;
    }


    return Promise.resolve(item);
  }

  // getTreeItems?: (itemIds: TreeItemIndex[]) => Promise<TreeItem[]>;
  // onRenameItem?: (item: TreeItem<T>, name: string) => Promise<void>;
  // onChangeItemChildren?: (itemId: TreeItemIndex, newChildren: TreeItemIndex[]) => Promise<void>;
}


export default function JsonTree(props: {
  content: JsonItem,
  onChange: Function,
}) {

  const refContainer = useRef(null);
  const refEditor = useRef(null);

  useEffect(() => {
    // create editor
    console.log("create editor", refContainer.current);
    refEditor.current = new JSONEditor({
      target: refContainer.current,
      props: {}
    });

    return () => {
      // destroy editor
      if (refEditor.current) {
        console.log("destroy editor");
        refEditor.current.destroy();
        refEditor.current = null;
      }
    };
  }, []);

  // update props
  useEffect(() => {
    if (refEditor.current) {
      console.log("update props", props);
      refEditor.current.updateProps(props);
    }
  }, [props]);

  return <div className="vanilla-jsoneditor-react" ref={refContainer}></div>;
  // if (props.json) {
  //   const provider = new JsonTreePovider(props.json);
  //
  //   function getTitle(item: TreeItem<JsonItem>): string {
  //     if (typeof (item.index) == 'string') {
  //       return item.index.split('/').at(-1)!;
  //     }
  //     else {
  //       return `${item.index}`;
  //     }
  //   }
  //
  //   return (
  //     <UncontrolledTreeEnvironment
  //       dataProvider={provider}
  //       getItemTitle={getTitle}
  //       viewState={{}}
  //     >
  //       <Tree treeId="tree-1" rootItem="/" treeLabel="Tree Example" />
  //     </UncontrolledTreeEnvironment>
  //   );
  // }
  // else {
  //   return <>no</>;
  // }
}
