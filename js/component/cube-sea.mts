import { vec3, mat4 } from '../math/gl-matrix.mjs';
import { Rotater } from '../component/rotater.mjs';
import { World } from '../third-party/uecs-0.4.2/index.mjs';
import { HoverPassive, HoverMaterial } from '../component/hover.mjs';
import { cubeInstancePrimitive } from './cube-instance.mjs';

const defaultIndex = 0;
const hoverIndex = 1;

export async function cubeSeaFactory(
  world: World,
  cubeCount: number = 10,
  cubeScale: number = 1.0,
): Promise<void> {

  const [primitive, matrices, faces] = cubeInstancePrimitive()
  world.create(mat4.identity(), primitive)
  primitive.instanceCount = 0;

  let matrixIndex = 0;
  let faceIndex = 0;

  const positions = [
    [0, 0.25, -0.8],
    [0.8, 0.25, 0],
    [0, 0.25, 0.8],
    [-0.8, 0.25, 0],
  ]
  for (let i = 0; i < positions.length; ++i
  ) {
    const pos = positions[i];
    const hover = new HoverPassive(
      () => {
        faces[faceIndex] = hoverIndex;
        faces[faceIndex + 1] = hoverIndex;
        faces[faceIndex + 2] = hoverIndex;
        faces[faceIndex + 4] = hoverIndex;
        faces[faceIndex + 5] = hoverIndex;
        faces[faceIndex + 6] = hoverIndex;
      },
      () => {
        faces[faceIndex] = defaultIndex;
        faces[faceIndex + 1] = defaultIndex;
        faces[faceIndex + 2] = defaultIndex;
        faces[faceIndex + 4] = defaultIndex;
        faces[faceIndex + 5] = defaultIndex;
        faces[faceIndex + 6] = defaultIndex;
      },
    )
    const matrix = new mat4(matrices.subarray(matrixIndex, matrixIndex + 16))
    mat4.fromScaling(vec3.fromValues(0.1, 0.1, 0.1), { out: matrix })
    matrix.m30 = pos[0]
    matrix.m31 = pos[1]
    matrix.m32 = pos[2]
    matrix.m33 = 1
    world.create(matrix, new Rotater(() => {
      primitive.instanceUpdated = true;
    }), hover);

    ++primitive.instanceCount;
    matrixIndex += 16, faceIndex += 8
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

          const hover = new HoverPassive(
            () => {
              faces[faceIndex] = hoverIndex;
              faces[faceIndex + 1] = hoverIndex;
              faces[faceIndex + 2] = hoverIndex;
              faces[faceIndex + 4] = hoverIndex;
              faces[faceIndex + 5] = hoverIndex;
              faces[faceIndex + 6] = hoverIndex;
            },
            () => {
              faces[faceIndex] = defaultIndex;
              faces[faceIndex + 1] = defaultIndex;
              faces[faceIndex + 2] = defaultIndex;
              faces[faceIndex + 4] = defaultIndex;
              faces[faceIndex + 5] = defaultIndex;
              faces[faceIndex + 6] = defaultIndex;
            },
          );

          let size = 0.4 * cubeScale;
          const matrix = new mat4(
            matrices.subarray(matrixIndex, matrixIndex + 16))
          mat4.fromScaling(vec3.fromValues(size, size, size), { out: matrix })
          matrix.m30 = pos[0]
          matrix.m31 = pos[1]
          matrix.m32 = pos[2]
          matrix.m33 = 1
          world.create(matrix, hover);

          ++primitive.instanceCount;
          matrixIndex += 16, faceIndex += 8
        }
      }
    }
  }

  return Promise.resolve();
}
