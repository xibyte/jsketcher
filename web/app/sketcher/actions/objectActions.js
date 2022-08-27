import {BiPencil, BsTextareaT} from "react-icons/all";
import {Label} from "sketcher/shapes/label";
import {isConstraintAnnotation} from "sketcher/constr/constraintAnnotation";
import {editConstraint} from "sketcher/actions/constraintActions";

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

  {
    id: 'EditConstraintFromItsAnnotation',
    shortName: 'Edit Constraint',
    kind: 'Misc',
    description: 'Edit the constraint the annotation refers to',
    icon: BiPencil,
    selectionMatcher: {
      selector: 'function',
      match: (selection) => isConstraintAnnotation(selection[0])
    },
    invoke: (ctx) => {
      const [obj] = ctx.viewer.selected;
      editConstraint(ctx, obj.constraint, () => {
        ctx.viewer.parametricManager.constraintUpdated(obj.constraint);
      })
    }
  },


];

