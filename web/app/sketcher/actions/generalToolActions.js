import {desktopFileMode, requestDesktopFileAction} from 'cad/desktopFileActions';
import {AiOutlineImport} from 'react-icons/ai';
import {ReferencePointTool} from "../tools/origin";
import {IoIosHand} from "react-icons/io";
import {GiCrosshair} from "react-icons/gi";

export default [
  ...(desktopFileMode ? [{
    id: 'ImportDxf', shortName: 'Import DXF', kind: 'Tool',
    description: 'Import supported DXF shapes from My files into this sketch',
    icon: AiOutlineImport,
    invoke: () => requestDesktopFileAction('import-dxf')
  }] : []),
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