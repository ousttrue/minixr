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

import { BoxBuilder } from '../geometry/box-builder.mjs';
import { vec3, mat4 } from '../math/gl-matrix.mjs';
import { HoverMaterial } from '../materials/hover.mjs';
import { Rotater } from '../component/rotater.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { HoverPassive } from '../component/hover.mjs';


export async function cubeSeaFactory(
  world: World,
  cubeCount: number = 10,
  cubeScale: number = 1.0,
): Promise<void> {

  const positions = [
    [0, 0.25, -0.8],
    [0.8, 0.25, 0],
    [0, 0.25, 0.8],
    [-0.8, 0.25, 0],
  ]

  for (const pos of positions) {
    let boxBuilder = new BoxBuilder();
    // Build the spinning "hero" cubes
    boxBuilder.pushCube(pos, 0.1);
    const material = new HoverMaterial();
    let heroPrimitive = boxBuilder.finishPrimitive(material);
    const hover = new HoverPassive(
      () => {
        material.color.value.set(1, 0, 0, 1);;
      },
      () => {
        material.color.value.set(1, 1, 1, 1);;
      },
    )
    world.create(new mat4(), heroPrimitive, new Rotater(), hover);
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
          const hover = new HoverPassive(
            () => {
              material.color.value.set(1, 0, 0, 1);;
            },
            () => {
              material.color.value.set(1, 1, 1, 1);;
            },
          );

          const matrix = mat4.fromTranslation(pos[0], pos[1], pos[2]);
          world.create(matrix, cubeSeaPrimitive, hover);
        }
      }
    }
  }

  return Promise.resolve();
}
