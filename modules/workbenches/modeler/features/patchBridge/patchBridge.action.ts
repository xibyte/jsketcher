import {BiShapePolygon} from "react-icons/bi";

export const PatchBridgeAction = {
  id: 'PATCH_BRIDGE',
  appearance: {
    label: 'Bridge Surface',
    info: 'Create a surface between two patch edges',
    icon: BiShapePolygon,
  },
  invoke: () => {
    document.dispatchEvent(new CustomEvent('patch-bridge-toggle'));
  },
};
