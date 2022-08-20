import {Bundle} from "bundler/bundleSystem";
import {AttributesService} from "cad/attributes/attributesService";
import {contributeComponent} from "cad/dom/components/ContributedComponents";
import {DisplayOptionsDialogManager} from "cad/attributes/ui/DisplayOptionsDialog";
import {RequiresAnyModelSelection} from "cad/actions/actionHelpers";
import {IoColorPalette} from "react-icons/io5";
import {FaTable} from "react-icons/fa";
import {ApplicationContext} from "cad/context";

export interface AttributesBundleContext {
  attributesService: AttributesService;
}

export const AttributesBundle: Bundle<ApplicationContext> = {

  activationDependencies: [
    '@ActionSystem'
  ],

  activate(ctx: ApplicationContext) {
    ctx.attributesService = new AttributesService();
    contributeComponent(DisplayOptionsDialogManager);

    ctx.actionService.registerActions([
      {
        id: 'ModelDisplayOptions',
        appearance: {
          icon: IoColorPalette,
          label: 'display options...',
          info: 'open a dialog with display options for model(s)',
        },
        invoke: (ctx: ApplicationContext, e) => ctx.attributesService
          .openDisplayOptionsEditor(ctx.entityContextService.selectedIds, e),
        ...RequiresAnyModelSelection,
      },
      {
        id: 'ModelAttributesEditor',
        appearance: {
          icon: FaTable,
          label: 'edit attributes...',
          info: 'open a dialog with attributes editor for the model',
        },
        invoke: ({services}) => services.sketcher.sketchFace(services.selection.face.single),
        ...RequiresAnyModelSelection,
      },
    ])
  },

  BundleName: "@Attributes",
}


