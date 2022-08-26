import {TypeRegistry} from "cad/craft/schema/types";
import {ApplicationContext} from "cad/context";
import {
  isValueNotProvided,
  OperationParams,
  OperationParamsError,
  OperationParamsErrorReporter,
  OperationSchema
} from "cad/craft/schema/schema";

function createErrorReporter(path: string[], errors: OperationParamsError[]): OperationParamsErrorReporter {

  function report(message: string) {
    errors.push({path, message});
  }

  report.dot = segment => createErrorReporter([...path, segment], errors);

  return report;
}

export default function materializeParams(ctx: ApplicationContext,
                                          params: OperationParams,
                                          schema: OperationSchema,
                                          result: any,
                                          errors: OperationParamsError[]) {
  return materializeParamsImpl(ctx, params, schema, result, createErrorReporter([], errors))

}

function materializeParamsImpl(ctx: ApplicationContext,
                               params: OperationParams,
                               schema: OperationSchema,
                               result: any,
                               parentReportError: OperationParamsErrorReporter) {


  for (const field of Object.keys(schema)) {
    const reportError = parentReportError.dot(field);
    const md = schema[field];
    let value = params[field];

    if (isValueNotProvided(value)) {
      if (!md.optional) {
        reportError('required');
      }
    } else {
      const typeDef = TypeRegistry[md.type];
      value = typeDef.resolve(ctx, value, md as any, reportError, materializeParamsImpl);

      if (md.resolve !== undefined) {
        value = md.resolve(
          ctx, value, md as any, reportError
        )
        if (isValueNotProvided(value) && !md.optional) {
          reportError('required');
        }
      }

      // if (md.type === Types.NUMBER) {
      //   try {
      //     const valueType = typeof value;
      //     if (valueType === 'string') {
      //       value = ctx.expressionService.evaluateExpression(value);
      //     } else if (valueType !== 'number') {
      //       errors.push({path, message: 'invalid value'});
      //     }
      //   } catch (e) {
      //     errors.push({path, message: 'unable to evaluate expression'});
      //   }
      //
      //   if (md.min !== undefined ) {
      //     if (value < md.min) {
      //       errors.push({path, message: 'less than allowed'});
      //     }
      //   }
      //   if (md.max !== undefined ) {
      //     if (value > md.max) {
      //       errors.push({path, message: 'greater than allowed'});
      //     }
      //   }
      // } else if (md.type === Types.STRING) {
      //   if (typeof value !== 'string') {
      //     errors.push({path, message: 'not a string type'});
      //   }
      // } else if (md.type === Types.BOOLEAN) {
      //   value = !!value;
      // } else if (md.type === Types.ENUM) {
      //   if (md.values.indexOf(value) === -1) {
      //     value = md.defaultValue || md.values[0];
      //   }
      // } else if (isEntityType(md.type)) {
      //   if (typeof value !== 'string') {
      //     errors.push({path, message: 'not a valid model reference'});
      //   }
      //   let ref = value.trim();
      //   if (!ref && !md.optional) {
      //     errors.push({path, message: 'required'});
      //   }
      //   let model = ctx.cadRegistry.find(ref);
      //   if (!model) {
      //     errors.push({path, message: 'referrers to nonexistent ' + md.type});
      //   }
      //   value = model;
      // } else if (md.type === Types.ARRAY) {
      //   if (!Array.isArray(value)) {
      //     errors.push({path, message: 'not an array type'});
      //     continue;
      //   }
      //   if (md.min !== undefined && value.length < md.min) {
      //     errors.push({path, message: 'required minimum ' + md.min + ' elements'});
      //   }
      //   if (md.max !== undefined && value.length > md.max) {
      //     errors.push({path, message: 'required maximum ' + md.max + ' elements'});
      //   }
      //   if (md.itemType === Types.OBJECT) {
      //     value = value.map((item , i) => {
      //       let itemResult = {};
      //       materializeParams(ctx, item, md.schema, itemResult, errors, [...parentPath, i]);
      //       return itemResult;
      //     });
      //   } else {
      //     if (isEntityType(md.itemType)) {
      //       value.forEach(ref => {
      //         if (!ctx.cadRegistry.findEntity(md.itemType, ref)) {
      //           errors.push({path, message: 'referrers to nonexistent ' + md.itemType});
      //         }
      //       })
      //     }
      //   }
      // }
      result[field] = value;
    }
  }
}
