import { vec3, mat4 } from '../../../lib/math/gl-matrix.mjs';
import { Rotater } from '../component/rotater.mjs';
import { World } from '../../../lib/uecs/index.mjs';
import { HoverPassive } from '../component/hover.mjs';
import { CubeInstancing } from './cube-instance.mjs';


const defaultIndex = 7;
const hoverIndex = 1;


export async function cubeSeaFactory(
  world: World,
  instancing: CubeInstancing,
  cubeCount: number = 10,
  cubeScale: number = 1.0,
): Promise<void> {

  function createHover(index: number): HoverPassive {
    const hover = new HoverPassive(
      () => {
        instancing.setCubeColor(index, hoverIndex);
      },
      () => {
        instancing.setCubeColor(index, defaultIndex);
      },
    )
    return hover;
  }

  const positions = [
    [0, 0.25, -0.8],
    [0.8, 0.25, 0],
    [0, 0.25, 0.8],
    [-0.8, 0.25, 0],
  ]
  for (let i = 0; i < positions.length; ++i
  ) {
    const pos = positions[i];

    const [index, matrix] = instancing.newInstance();
    instancing.setCubeColor(index, defaultIndex);

    mat4.fromScaling(vec3.fromValues(0.1, 0.1, 0.1), { out: matrix })
    matrix.m30 = pos[0]
    matrix.m31 = pos[1]
    matrix.m32 = pos[2]
    matrix.m33 = 1
    world.create(matrix, new Rotater(() => {
    }), createHover(index));
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

          const [index, matrix] = instancing.newInstance();

          instancing.setCubeColor(index, defaultIndex);
          let size = 0.4 * cubeScale;
          mat4.fromScaling(vec3.fromValues(size, size, size), { out: matrix })
          matrix.m30 = pos[0]
          matrix.m31 = pos[1]
          matrix.m32 = pos[2]
          matrix.m33 = 1
          world.create(matrix, createHover(index));
        }
      }
    }
  }

  return Promise.resolve();
}
