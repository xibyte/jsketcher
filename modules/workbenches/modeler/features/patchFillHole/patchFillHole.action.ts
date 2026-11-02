import {BiShapeSquare} from "react-icons/bi";
import {FillHoleTool} from "surfacing/ops/fillHole/fillHole.tool";

export const PatchFillHoleAction = {
  id: 'PATCH_FILL_HOLE',
  appearance: {
    label: 'Fill Hole',
    info: 'Fill a 3 or 4 edge hole in the patch cage',
    icon: BiShapeSquare,
  },
  invoke: (ctx: any) => {
    ctx.surfacingService?.view?.pushTool(new FillHoleTool());
  },
};
