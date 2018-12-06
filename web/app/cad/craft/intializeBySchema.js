import {ENTITIES} from '../scene/entites';
import {isEntityType} from './schemaUtils';

export default function initializeBySchema(schema, context) {
  let fields = Object.keys(schema);
  let obj = {};
  for (let field of fields ) {
    let val;
    let md = schema[field];
    if (md.type === 'array') {
      if (md.itemType === 'object') {
        if (md.defaultValue) {
          if (md.defaultValue.type === 'selection') {
            let {itemField, entity} = md.defaultValue;
            val = context.streams.selection[entity].value.map(s => {
              let item = initializeBySchema(md.schema, context);
              item[itemField] = s;
              return item;
            });
          } else {
            val = md.defaultValue;
          }
        } else {
          val = [];
        }
      } else if (isEntityType(md.itemType)) {
        if (md.defaultValue && md.defaultValue.type === 'selection') {
          val = [...context.streams.selection[md.itemType].value];
        } else {
          val = []
        }
      } else {
        throw 'unsupport';
      }
    } else if (isEntityType(md.type) && md.defaultValue && md.defaultValue.type === 'selection') {
      val = context.streams.selection[md.type].value[0];
    } else if (md.type === 'object') {
      val = initializeBySchema(md.schema, context);
    } else if (md.type === 'number') {
      val = md.defaultValue;
    } else {
      val = md.defaultValue;
    }
    obj[field] = val;
  }
  return obj;
}
