import {Types} from "cad/craft/schema/types";
import {isValueNotProvided, OperationSchema, SchemaField} from "cad/craft/schema/schema";
import {CoreContext} from "context";

export default function initializeBySchema(schema: OperationSchema, context: CoreContext) {
  let fields = Object.keys(schema);
  let obj = {};
  for (let field of fields) {
    let val = undefined;
    let md = schema[field] as SchemaField;

    if (md.type === Types.array) {
      if (md.items.type === Types.entity && md.defaultValue !== undefined) {
        const defaultValue = md.defaultValue;
        if (defaultValue.usePreselection === true) {
          const entitySchema = md.items;
          const currentSelection =
            context.entityContextService.selectedEntities.value.filter(e => entitySchema.allowedKinds.includes(e.TYPE));
          val = currentSelection.map(e => e.id);
        }
      } else {
        val = md.defaultValue || [];
      }
    } else if (md.type === Types.entity && md.defaultValue !== undefined) {
      const defaultValue = md.defaultValue;
      if (defaultValue.usePreselection === true && defaultValue.preselectionIndex !== undefined) {
        const allowedKinds = md.allowedKinds;
        const currentSelection =
          context.entityContextService.selectedEntities.value.filter(e => allowedKinds.includes(e.TYPE));

        let mObject = currentSelection[defaultValue.preselectionIndex as number];
        if (mObject) {
          val = mObject.id;
        }
      }
    } else if (md.type === Types.object) {
      val = md.defaultValue || initializeBySchema(md.schema, context);
    } else {
      val = md.defaultValue;
    }
    obj[field] = val;
  }
  return obj;
}


export function fillUpMissingFields(params: any, schema: OperationSchema, context: CoreContext) {
  let fields = Object.keys(schema);
  for (let field of fields) {
    const md = schema[field] as SchemaField;

    if (md.optional) {
      continue;
    }

    let val = params[field];

    const isPrimitive =
         md.type !== Types.array
      && md.type !== Types.object
      && md.type !== Types.entity;

    if (isPrimitive && isValueNotProvided(val)) {
      params[field] = md.defaultValue;
    } else if (md.type === Types.object) {
      if (!val) {
        val = {};
        params[field] = val;
      }
      fillUpMissingFields(val, md.schema, context);
    }
  }

}