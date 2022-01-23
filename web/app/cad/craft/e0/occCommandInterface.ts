import {CallCommand} from "cad/craft/e0/interact";

export type OCCCommandInterface = OCCCommands;

export const OCI: OCCCommandInterface = new Proxy({}, {
  get: function (target, prop: string, receiver) {
    return prop in target ? target[prop] : function() {
      prop = prop.replace(/^_/, '');
      const args = Array.from(arguments).map(a => a + "");
      console.log("ARGUMENTS:", args);
      const returnCode = CallCommand(prop, [prop, ...args]);
      // if (returnCode !== 0) {
      //   throw 'command execution fail: ' + prop;
      // }
      return returnCode;
    };
  },
}) as any;


