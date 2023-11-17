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

import {
  Node,
  HoverPassiveStartEvent, HoverPassiveEndEvent,
  HoverActiveStartEvent, HoverActiveEndEvent,
} from './nodes/node.mjs';
import { Primitive } from './geometry/primitive.mjs';
import { mat4 } from '../math/gl-matrix.mjs';
import { Component } from '../component/component.mjs';

export type RenderCommands = Map<Primitive, Node[]>;




export class Scene {
  root = new Node("__root__");
  _renderCommands: RenderCommands = new Map();
  _actives: Node[] = [];
  _hoverMap: Map<Node, HoverStatus> = new Map();
  _components: Component[] = [];

  constructor() {
  }

  addComponents(components: Component[]) {
    for (const component of components) {
      this._components.push(component);
    }
  }

  addNodes(nodes: Node[]) {
    for (const node of nodes) {
      this.root.addNode(node);
    }
  }

  add(obj: { nodes: Node[], components: Component[] }) {
    this.addNodes(obj.nodes);
    this.addComponents(obj.components);
  }

  updateAndGetRenderList(time: number, frameDelta: number,
    refSpace: XRReferenceSpace, frame: XRFrame,
    inputSources: XRInputSourceArray): RenderCommands {

    this._renderCommands.clear();
    this._actives = [];

    for (const component of this._components) {
      component.update(time, frameDelta, refSpace, frame, inputSources);
    }

    this._pushRenderCommandRecursive(time, frameDelta, refSpace, frame, inputSources, this.root);

    return this._renderCommands;
  }

  private _pushRenderCommandRecursive(time: number, frameDelta: number,
    refSpace: XRReferenceSpace, frame: XRFrame, inputSources: XRInputSourceArray, node: Node) {

    if (!node.visible) {
      return;
    }

    if (node.action == 'active') {
      this._actives.push(node);
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

  _toLocal = new mat4();
  private _hitTestRecursive(active: Node, hitList: Node[], node: Node) {
    if (!node.visible) {
      return;
    }
    if (node.action == 'active') {
      return;
    }

    if (node.action == 'passive') {
      if (node.primitives.length > 0) {

        const worldPoint = active.worldMatrix.getTranslation();

        node.worldMatrix.invert({ out: this._toLocal });
        const local = worldPoint.transformMat4(this._toLocal);

        for (const prim of node.primitives) {
          if (prim.hitTest(local)) {
            hitList.push(node);
            break;
          }
        }
      }
    }

    for (const child of node.children) {
      this._hitTestRecursive(active, hitList, child);
    }
  }
}
