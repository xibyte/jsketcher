import {BiGitBranch} from "react-icons/bi";

export const PatchInsertLoopAction = {
  id: 'PATCH_INSERT_LOOP',
  appearance: {
    label: 'Insert Loop',
    info: 'Interactive edge loop insertion across connected patches',
    icon: BiGitBranch,
  },
  invoke: () => {
    document.dispatchEvent(new CustomEvent('patch-insert-loop-toggle'));
  },
};
