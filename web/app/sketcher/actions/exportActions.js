import {IO} from "../io";
import React from "react";
import {AiOutlineExport} from "react-icons/ai";


export default [
  {
    id: 'ExportSVG',
    shortName: 'Export to SVG',
    kind: 'Export',
    description: 'Export sketch to SVG',
    icon: AiOutlineExport,

    invoke: (ctx) => {
      IO.exportTextData(ctx.viewer.io.svgExport(), ctx.project.getSketchId() + ".svg");
    }
  },

  {
    id: 'ExportDXF',
    shortName: 'Export to DXF',
    kind: 'Export',
    description: 'Export sketch to DXF',
    icon: AiOutlineExport,

    invoke: (ctx) => {
      IO.exportTextData(ctx.viewer.io.dxfExport(), ctx.project.getSketchId() + ".dxf");
    }

  },
];