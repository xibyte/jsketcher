import {BiRectangle} from "react-icons/bi";

export const PatchPlaneAction = {
  id: 'PATCH_PLANE',
  appearance: {
    label: 'Patch Plane',
    info: 'Add a Bézier patch plane to the scene',
    icon: BiRectangle,
  },
  invoke: (ctx: any) => {
    ctx.surfacingService.addPlane();
  },
};
