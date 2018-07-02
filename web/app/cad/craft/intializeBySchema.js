import {ENTITIES} from '../scene/entites';

export default function initializeBySchema(schema, context) {
  let fields = Object.keys(schema);
  let obj = {};
  for (let field of fields ) {
    let val;
    let md = schema[field];
    if (md.type === 'array') {
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
    } else if (ENTITIES.indexOf(md.type) !== -1 && md.defaultValue && md.defaultValue.type === 'selection') {
      val = context.streams.selection[md.type].value[0];
    } else if (md.type === 'object') {
      val = initializeBySchema(md.schema, context);
    } else {
      val = md.defaultValue;
    }
    obj[field] = val;
  }
  return obj;
}
