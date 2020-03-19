import {MdZoomOutMap} from "react-icons/md";
import {AiOutlineCopy, AiOutlineExport, AiOutlineFile, AiOutlineFolderOpen, AiOutlineSave} from "react-icons/ai";
import * as ui from "../../ui/ui";

export default [

  {
    id: 'New',
    shortName: 'New',
    kind: 'Common',
    description: 'Create new sketch',
    icon: AiOutlineFile,

    invoke: (ctx) => {
      ctx.app.newSketch();
    }
  },

  {
    id: 'Clone',
    shortName: 'Clone',
    kind: 'Common',
    description: 'Clone sketch',
    icon: AiOutlineCopy,

    invoke: (ctx, e) => {
      ctx.app.cloneSketch();
    }
  },

  {
    id: 'Open',
    shortName: 'Open',
    kind: 'Common',
    description: 'Open sketch',
    icon: AiOutlineFolderOpen,

    invoke: (ctx, e) => {
      ctx.app._sketchesList.refresh();
      ui.openWin(ctx.app._sketchesWin, e);
    }
  },

  {
    id: 'Save',
    shortName: 'Save',
    kind: 'Common',
    description: 'Save sketch',
    icon: AiOutlineSave,

    invoke: (ctx) => {
      const sketchData = ctx.viewer.io.serializeSketch();
      const sketchId = ctx.app.getSketchId();
      localStorage.setItem(sketchId, sketchData);
    }
  },

  {
    id: 'Export',
    shortName: 'Export',
    kind: 'Common',
    description: 'Export sketch to other formats',
    icon: AiOutlineExport,

    invoke: (ctx, e) => {
      ui.openWin(ctx.app._exportWin, e);
    }

  },

  {
    id: 'Fit',
    shortName: 'Fit',
    kind: 'Common',
    description: 'Fit Sketch On Screen',
    icon: MdZoomOutMap,

    invoke: (ctx) => {
      ctx.viewer.toolManager.releaseControl();
      ctx.app.fit();
      ctx.viewer.refresh();
    }

  },
]