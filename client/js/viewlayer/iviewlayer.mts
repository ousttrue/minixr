import { World } from '../../../lib/uecs/index.mjs';


// reder type
// | mode          | view | drawcall |
// | --            | --   | --       |
// | inline        | 1    | 1        |
// | vr            | 2    | 2        |
// | vr(multiview) | 2    | 1        | OCULUS_multiview / OVR_multiview2 

export interface IViewLayer {
  get referenceSpace(): XRReferenceSpace;
  render(pose: XRViewerPose, world: World): void;
}
