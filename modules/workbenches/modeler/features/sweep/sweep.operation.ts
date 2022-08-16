import {ApplicationContext} from "cad/context";
import {EntityKind} from "cad/model/entities";
import {BooleanDefinition} from "cad/craft/schema/common/BooleanDefinition";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {MSketchLoop} from "cad/model/mloop";

interface SweepParams {
  profile: MSketchLoop;
  sweepPath: MSketchLoop;
  cornerStyle: string;
  boolean: BooleanDefinition;
}

export const SweepOperation: OperationDescriptor<SweepParams> = {
  id: 'SWEEP',
  label: 'Sweep',
  icon: 'img/cad/sweep',
  info: 'Sweeps 2D profile loop',
  path:__dirname,
  paramsInfo: () => `(?)`,
  run: (params: SweepParams, ctx: ApplicationContext) => {

    const occ = ctx.occService;
    const oci = occ.commandInterface;

    const myProfile = params.profile;
    const profile = occ.io.sketchLoader.pushContourAsWire(myProfile.contour, "sweepFace", myProfile.face.csys).wire;

    const myPath = params.sweepPath;
    const path = occ.io.sketchLoader.pushContourAsWire(myPath.contour, "sweepPath", myPath.face.csys).wire;


    oci.mksweep(path);
    oci.addsweep(profile, "-R");

    let cornerStyle = "";
    if (params.cornerStyle == "Round") cornerStyle = "-R";
    if (params.cornerStyle == "Sharp") cornerStyle = "-C";

    oci.buildsweep("sweepOutput", cornerStyle, "-S");

    const tools = [];
    tools.push(occ.io.getShell("sweepOutput"));
    return occ.utils.applyBooleanModifier(tools, params.boolean);

  },

  form: [
    {
      type: 'selection',
      name: 'profile',
      capture: [EntityKind.LOOP],
      label: 'profile',
      multi: false,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },

    {
      type: 'selection',
      name: 'sweepPath',
      capture: [EntityKind.LOOP],
      label: 'Path',
      multi: false,
      optional: true,
      defaultValue: {
        usePreselection: true,
        preselectionIndex: 0
      },
    },
    {
      type: 'choice',
      style: "dropdown",
      label: 'Corner Style',
      name: 'cornerStyle',
      values: ["Round", "Sharp"],
      defaultValue: "Round",
    },

    {
      type: 'boolean',
      name: 'boolean',
      label: 'boolean',
      optional: true,
    }

  ],
}
