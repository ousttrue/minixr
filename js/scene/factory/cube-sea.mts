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

import { Node } from '../nodes/node.mjs';
import { BoxBuilder } from '../geometry/box-builder.mjs';
import { vec3 } from '../../math/gl-matrix.mjs';
import { HoverMaterial } from '../materials/hover.mts';
import { Rotater } from '../component/rotater.mts';
import { Component } from '../component/component.mts';


export async function cubeSeaFactory(
  cubeCount: number = 10,
  cubeScale: number = 1.0,
): Promise<{ nodes: Node[], components: Component[] }> {

  const positions = [
    [0, 0.25, -0.8],
    [0.8, 0.25, 0],
    [0, 0.25, 0.8],
    [-0.8, 0.25, 0],
  ]

  const nodes: Node[] = []
  const components: Component[] = []
  for (const pos of positions) {
    let boxBuilder = new BoxBuilder();
    // Build the spinning "hero" cubes
    boxBuilder.pushCube(pos, 0.1);
    const material = new HoverMaterial();
    let heroPrimitive = boxBuilder.finishPrimitive(material);
    const heroNode = new Node("hero");
    heroNode.action = 'passive';
    heroNode.primitives.push(heroPrimitive);
    heroNode.addEventListener('hover-passive-start', (_: Event) => {
      material.color.value.set(1, 0, 0, 1);;
    });
    heroNode.addEventListener('hover-passive-end', (_: Event) => {
      material.color.value.set(1, 1, 1, 1);;
    });
    nodes.push(heroNode);

    const rotater = new Rotater(heroNode);
    components.push(rotater);
  }

  {
    // Build the cube sea
    let halfGrid = cubeCount * 0.5;
    for (let x = 0; x < cubeCount; ++x) {
      for (let y = 0; y < cubeCount; ++y) {
        for (let z = 0; z < cubeCount; ++z) {
          let pos = [x - halfGrid, y - halfGrid, z - halfGrid];
          // Only draw cubes on one side. Useful for testing variable render
          // cost that depends on view direction.
          if (pos[2] > 0) {
            continue;
          }

          // Don't place a cube in the center of the grid.
          if (pos[0] == 0 && pos[1] == 0 && pos[2] == 0) {
            continue;
          }

          let boxBuilder = new BoxBuilder();
          let size = 0.4 * cubeScale;
          boxBuilder.pushCube([0, 0, 0], size);
          const material = new HoverMaterial();
          let cubeSeaPrimitive = boxBuilder.finishPrimitive(material);

          const node = new Node('sea');
          node.action = 'passive';
          node.primitives.push(cubeSeaPrimitive);
          node.local.translation = vec3.fromValues(pos[0], pos[1], pos[2]);

          node.addEventListener('hover-passive-start', (_: Event) => {
            material.color.value.set(1, 0, 0, 1);;
          });

          node.addEventListener('hover-passive-end', (_: Event) => {
            material.color.value.set(1, 1, 1, 1);;
          });

          nodes.push(node);
        }
      }
    }
  }

  return Promise.resolve({ nodes, components });
}
