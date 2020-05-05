import {ReferencePointTool} from "../tools/origin";
import {IoIosHand} from "react-icons/io";
import {GiCrosshair} from "react-icons/gi";

export default [
  {
    id: 'PanTool',
    shortName: 'Pan',
    kind: 'Tool',
    description: 'Pan mode',
    icon: IoIosHand,

    invoke: (ctx) => {
      ctx.viewer.toolManager.releaseControl();
    }

  },

  {
    id: 'ReferencePointTool',
    shortName: 'Set Origin',
    kind: 'Tool',
    description: 'Sets reference point for commands',
    icon: GiCrosshair,
    command: 'origin',
    invoke: (ctx) => {
      ctx.viewer.toolManager.takeControl(new ReferencePointTool(ctx.viewer));
    }

  },
]