import {Types} from "cad/craft/schema/types";
import {isValueNotProvided, OperationSchema, SchemaField} from "cad/craft/schema/schema";
import {ApplicationContext} from "cad/context";

export default function initializeBySchema(schema: OperationSchema, context: ApplicationContext) {
  const fields = Object.keys(schema);
  const obj = {};
  for (const field of fields) {
    let val = undefined;
    const md = schema[field] as SchemaField;

    if (md.type === Types.array) {
      if (md.items.type === Types.entity && md.defaultValue !== undefined) {
        const defaultValue = md.defaultValue;
        if (defaultValue.usePreselection === true) {
          const entitySchema = md.items;
          const currentSelection =
            context.entityContextService.selectedEntities.value.filter(entitySchema.entityCapture);
          val = currentSelection.map(e => e.id);
        }
      } else {
        val = md.defaultValue || [];
      }
    } else if (md.type === Types.entity && md.defaultValue !== undefined) {
      const defaultValue = md.defaultValue;
      if (defaultValue.usePreselection === true && defaultValue.preselectionIndex !== undefined) {
        const currentSelection =
          context.entityContextService.selectedEntities.value.filter(md.entityCapture);

        const mObject = currentSelection[defaultValue.preselectionIndex as number];
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


export function fillUpMissingFields(params: any, schema: OperationSchema, context: ApplicationContext) {
  const fields = Object.keys(schema);
  for (const field of fields) {
    const md = schema[field] as SchemaField;

    let val = params[field];

    const isPrimitive =
         md.type !== Types.array
      && md.type !== Types.object
      && md.type !== Types.entity;

    if (isPrimitive && isValueNotProvided(val) && !md.optional) {
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