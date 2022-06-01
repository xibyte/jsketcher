import {BsTextareaT} from "react-icons/all";
import {Label} from "sketcher/shapes/label";

export default [

  {
    id: 'AddObjectLabel',
    shortName: 'Add Label',
    kind: 'Misc',
    description: 'Add Label',
    icon: BsTextareaT,
    selectionMatcher: {
      selector: 'function',
      match: (selection) => true
    },
    invoke: (ctx, params) => {
      const selection = ctx.viewer.selected;
      ctx.ui.$wizardRequest.next({
        title: "Label Text",
        schema:  [
          {
            name: 'text',
            label: 'Label Text',
            type: 'string'
          }
        ],
        onApply: (params) => {
          selection.forEach(obj => {
            const label = new Label(params.text, obj);
            ctx.viewer.labelLayer.add(label);
          });
        }
      })

    }

  },


];

