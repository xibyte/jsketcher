import {BiGitBranch} from "react-icons/bi";
import {LoopInsertTool} from "surfacing/ops/split/split.tool";

export const PatchInsertLoopAction = {
  id: 'PATCH_INSERT_LOOP',
  appearance: {
    label: 'Insert Loop',
    info: 'Interactive edge loop insertion across connected patches',
    icon: BiGitBranch,
  },
  invoke: (ctx: any) => {
    ctx.surfacingService?.view?.pushTool(new LoopInsertTool());
  },
};
