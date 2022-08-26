import {CallCommand} from "cad/craft/e0/interact";
import {MObject} from "cad/model/mobject";
import {OCCCommands} from "cad/craft/e0/OCI";

export type OCCCommandInterface = OCCCommands;

const pushedModels = new Set();

export function clearImplicitModels() {
  pushedModels.clear();
}

export const OCI: OCCCommandInterface = new Proxy({}, {
  get: function (target, prop: string, receiver) {
    return prop in target ? target[prop] : function(...argums) {
      if (typeof prop !== 'string') {
        return undefined;
      }
      prop = prop.replace(/^_/, '');
      const args = argums.map(arg => {
        const type = typeof arg;
        if (type === 'object') {
          if (arg instanceof MObject) {
            if (!pushedModels.has(arg.id)) {
              pushedModels.add(arg.id)
              __CAD_APP.occService.io.pushModel(arg, arg.id);
            }
            return arg.id;
          }
          return JSON.stringify(arg);
        } else {
          return arg + "";
        }
      });
      console.log("ARGUMENTS:", args);
      const returnCode = CallCommand(prop, [prop, ...args]);
      // if (returnCode !== 0) {
      //   throw 'command execution fail: ' + prop;
      // }
      return returnCode;
    };
  },
}) as any;


