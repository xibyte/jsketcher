import {BiCylinder} from "react-icons/bi";

export const PatchCylinderAction = {
  id: 'PATCH_CYLINDER',
  appearance: {
    label: 'Patch Cylinder',
    info: 'Add a Bézier patch cylinder to the scene',
    icon: BiCylinder,
  },
  invoke: (ctx: any) => {
    ctx.surfacingService.addCylinder();
  },
};
