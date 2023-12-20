import { World } from '../uecs/index.mjs';


export type Updater = (
  session: XRSession, xrRefSpace: XRReferenceSpace,
  time: number, frameDelta: number,
  frame: XRFrame,
  world: World) => void;

