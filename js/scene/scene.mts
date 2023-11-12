// Copyright 2018 The Immersive Web Community Group
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Node } from './node.mjs';
import { Primitive } from './geometry/primitive.mjs';


export type RenderCommands = Map<Primitive, Node[]>;


export class Scene {
  root = new Node("__root__");
  _renderCommands: RenderCommands = new Map();

  constructor() {
  }

  updateAndGetRenderList(time: number, frameDelta: number,
    refSpace: XRReferenceSpace, frame: XRFrame,
    inputSources: XRInputSourceArray): RenderCommands {

    this._renderCommands.clear();

    this._pushRenderCommandRecursive(time, frameDelta, refSpace, frame, inputSources, this.root);

    return this._renderCommands;
  }

  private _pushRenderCommandRecursive(time: number, frameDelta: number,
    refSpace: XRReferenceSpace, frame: XRFrame, inputSources: XRInputSourceArray, node: Node) {

    if (!node.visible) {
      return;
    }

    node.update(time, frameDelta, refSpace, frame, inputSources);

    for (const prim of node.primitives) {
      const nodes = this._renderCommands.get(prim);
      if (nodes) {
        nodes.push(node);
      }
      else {
        this._renderCommands.set(prim, [node]);
      }
    }

    for (const child of node.children) {
      this._pushRenderCommandRecursive(time, frameDelta, refSpace, frame, inputSources, child);
    }
  }

}
