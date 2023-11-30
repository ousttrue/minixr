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

    console.log(itemId);

    // root
    const data = this.json;

    return Promise.resolve({
      index: itemId,
      children: typeof (data) == 'object'
        ? Object.keys(data).map((x: string) => `${itemId}/${x}`)
        : [],
      data: this.json,
    });
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
        <Tree treeId="tree-1" rootItem="" treeLabel="Tree Example" />
      </UncontrolledTreeEnvironment>
    );
  }
  else {
    return <>no</>;
  }
}
