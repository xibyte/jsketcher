import {GiCube} from "react-icons/gi";

export const PatchBoxAction = {
  id: 'PATCH_BOX',
  appearance: {
    label: 'Patch Box',
    info: 'Add a Bézier patch box (6 Coons patches) to the scene',
    icon: GiCube,
  },
  invoke: (ctx: any) => {
    ctx.surfacingService.addBox();
  },
};
