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
          val = md.defaultValue;
        } else if (md.initializeBySelection === true) {
          let {itemField, entity} = md.defaultValue;
          val = context.streams.selection[entity].value.map(s => {
            let item = initializeBySchema(md.schema, context);
            item[itemField] = s;
            return item;
          });
        } else {
          val = [];
        }
      } else if (isEntityType(md.itemType)) {
        if (md.initializeBySelection === true) {
          let entityContext = context.streams.selection[md.itemType];
          if (entityContext) {
            val = [...entityContext.value];
          }
        } else {
          val = []
        }
      } else {
        throw 'unsupported';
      }
    } else if (isEntityType(md.type) && md.initializeBySelection !== undefined) {
      const entityContext = context.streams.selection[md.type];
      if (entityContext) {
        val = entityContext.value[md.initializeBySelection];
      }
    } else if (md.type === 'object') {
      val = initializeBySchema(md.schema, context);
    } else {
      val = md.defaultValue;
    }
    obj[field] = val;
  }
  return obj;
}
