import {
  UncontrolledTreeEnvironment, StaticTreeDataProvider, Tree,
  TreeItemIndex,
  TreeDataProvider,
  TreeItem,
} from 'react-complex-tree';

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
  json?: JsonItem,
}) {

  if (props.json) {
    const provider = new JsonTreePovider(props.json);

    function getTitle(item: TreeItem<JsonItem>): string {
      if (typeof (item.index) == 'string') {
        return item.index.split('/').at(-1)!;
      }
      else {
        return `${item.index}`;
      }
    }

    return (
      <UncontrolledTreeEnvironment
        dataProvider={provider}
        getItemTitle={getTitle}
        viewState={{}}
      >
        <Tree treeId="tree-1" rootItem="/" treeLabel="Tree Example" />
      </UncontrolledTreeEnvironment>
    );
  }
  else {
    return <>no</>;
  }
}
