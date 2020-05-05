import {FcCancel, FcCheckmark} from "react-icons/fc";
import {RiExternalLinkLine} from "react-icons/ri";

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
    id: 'sketchOpenInTab',
    appearance: {
      info: 'save changes and open sketch 2D in a tab',
      label: '2D',
      icon: RiExternalLinkLine,
    },
    invoke: ({services}) => {
      let face = services.sketcher.inPlaceEditor.face;
      services.sketcher.inPlaceEditor.save();
      services.sketcher.inPlaceEditor.exit();
      services.sketcher.sketchFace2D(face);
    }
  }
]