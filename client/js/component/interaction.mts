import { Spinner } from '../component/spinner.mjs';
import { World } from '../uecs/index.mjs';
import { HoverPassive } from '../component/hover.mjs';
import { CubeInstancing } from './cube-instance.mjs';
import type { Updater } from './updater.mjs';


export async function interactionFactory(world: World, instancing: CubeInstancing): Promise<Updater> {

  const [index, matrix] = instancing.newInstance()

  const hover = new HoverPassive(
    () => {
      instancing.setCubeColor(index, 1);
    },
    () => {
      instancing.setCubeColor(index, 7);
    })
  instancing.setCubeColor(index, 7);

  world.create(matrix, new Spinner(), hover);

  return Promise.resolve((_session: XRSession, _xrRefSpace: XRReferenceSpace,
    time: number, frameDelta: number,
    _frame: XRFrame,
    world: World) => {
    Spinner.system(world, time, frameDelta);
  });
}
