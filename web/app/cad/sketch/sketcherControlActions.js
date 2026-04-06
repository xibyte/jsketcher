import {FcCancel, FcCheckmark} from "react-icons/fc";
import {FaUndo, FaRedo} from "react-icons/fa";

export default [
  {
    id: 'sketchSaveAndExit',
    appearance: {
      info: 'save sketch changes and exit',
      label: 'commit',
      icon: FcCheckmark,

    },
    invoke: ({services}) => {
      services.sketcher.inPlaceEditor.save();
      services.sketcher.inPlaceEditor.exit();
    }
  },
  {
    id: 'sketchExit',
    appearance: {
      info: 'drop sketch changes and exit',
      label: 'exit sketch',
      icon: FcCancel,
    },
    invoke: ({services}) => {
      services.sketcher.inPlaceEditor.exit();
    }
  },
  {
    id: 'sketchUndo',
    appearance: {
      info: 'Undo last action (Ctrl+Z)',
      label: 'undo',
      icon: FaUndo,
    },
    invoke: ({services}) => {
      const viewer = services.sketcher?.inPlaceEditor?.viewer;
      if (viewer?.historyManager) {
        viewer.historyManager.undo();
      }
    }
  },
  {
    id: 'sketchRedo',
    appearance: {
      info: 'Redo last action (Ctrl+Y)',
      label: 'redo',
      icon: FaRedo,
    },
    invoke: ({services}) => {
      const viewer = services.sketcher?.inPlaceEditor?.viewer;
      if (viewer?.historyManager) {
        viewer.historyManager.redo();
      }
    }
  }
]