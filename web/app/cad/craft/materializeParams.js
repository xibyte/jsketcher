import {isEntityType} from './schemaUtils';

export default function materializeParams(ctx, params, schema, result, errors, parentPath) {

  parentPath = parentPath || ROOT_PATH; 

  for (let field of Object.keys(schema)) {
    let md = schema[field];
    if (!md) {
      continue;
    }
    let value = params[field];
    if (value === undefined || value === null || value === '') {
      if (!md.optional) {
        errors.push({path: [...parentPath, field], message: 'required'});
      }
    } else {
      if (md.type === 'number') {
        try {
          const valueType =  typeof value;
          if (valueType === 'string') {
            value = ctx.expressionService.evaluateExpression(value);
          } else if (valueType !== 'number') {
            errors.push({path: [...parentPath, field], message: 'invalid value'});
          }
        } catch (e) {
          errors.push({path: [...parentPath, field], message: 'unable to evaluate expression'});
        }
        
        if (md.min !== undefined ) {
          if (value < md.min) {
            errors.push({path: [...parentPath, field], message: 'less than allowed'});
          }
        }
        if (md.max !== undefined ) {
          if (value > md.max) {
            errors.push({path: [...parentPath, field], message: 'greater than allowed'});
          }
        }
      } else if (md.type === 'string') {
        if (typeof value !== 'string') {
          errors.push({path: [...parentPath, field], message: 'not a string type'});
        }
      } else if (md.type === 'boolean') {
        value = !!value;
      } else if (md.type === 'enum') {
        if (md.values.indexOf(value) === -1) {
          value = md.defaultValue || md.values[0]; 
        }
      } else if (isEntityType(md.type)) {
        if (typeof value !== 'string') {
          errors.push({path: [...parentPath, field], message: 'not a valid model reference'});
        }
        let ref = value.trim();
        if (!ref && !md.optional) {
          errors.push({path: [...parentPath, field], message: 'required'});
        }
        let model = ctx.cadRegistry.findEntity(md.type, ref);
        if (!model) {
          errors.push({path: [...parentPath, field], message: 'referrers to nonexistent ' + md.type});
        }
      } else if (md.type === 'array') {
        if (!Array.isArray(value)) {
          errors.push({path: [...parentPath, field], message: 'not an array type'});
          continue;
        }
        if (md.min !== undefined && value.length < md.min) {
          errors.push({path: [...parentPath, field], message: 'required minimum ' + md.min + ' elements'});
        }
        if (md.max !== undefined && value.length > md.max) {
          errors.push({path: [...parentPath, field], message: 'required maximum ' + md.max + ' elements'});
        }
        if (md.itemType === 'object') {
          value = value.map((item , i) => {
            let itemResult = {};
            materializeParams(ctx, item, md.schema, itemResult, errors, [...parentPath, i]);
            return itemResult;
          });
        } else {
          if (isEntityType(md.itemType)) {
            value.forEach(ref => {
              if (!ctx.cadRegistry.findEntity(md.itemType, ref)) {
                errors.push({path: [...parentPath, field], message: 'referrers to nonexistent ' + md.itemType});
              }
            })
          }
        }
      }
      result[field] = value;
    }
  }
}

const ROOT_PATH = [];