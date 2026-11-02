import {BiShapePolygon} from "react-icons/bi";
import {BridgeTool} from "surfacing/ops/bridge/bridge.tool";

export const PatchBridgeAction = {
  id: 'PATCH_BRIDGE',
  appearance: {
    label: 'Bridge Surface',
    info: 'Create a surface between two patch edges',
    icon: BiShapePolygon,
  },
  invoke: (ctx: any) => {
    ctx.surfacingService?.view?.pushTool(new BridgeTool());
  },
};
