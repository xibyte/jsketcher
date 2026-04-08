import {BiShapeSquare} from "react-icons/bi";

export const PatchFillHoleAction = {
  id: 'PATCH_FILL_HOLE',
  appearance: {
    label: 'Fill Hole',
    info: 'Fill a 3 or 4 edge hole in the patch cage',
    icon: BiShapeSquare,
  },
  invoke: () => {
    document.dispatchEvent(new CustomEvent('patch-fill-hole-toggle'));
  },
};
