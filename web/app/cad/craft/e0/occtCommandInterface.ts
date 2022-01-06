import {MShell} from "cad/model/mshell";
import {readShellEntityFromJson} from "cad/scene/wrappers/entityIO";
import {Interrogate, CallCommand} from "cad/craft/e0/interact";


export interface OCCInteractions {

  getModel(shapeName: string): MShell;

}

export const OCI: OCCCommands & OCCInteractions = new Proxy({

  getModel(shapeName: string): MShell {
    const shapeJson = Interrogate(shapeName);
    return readShellEntityFromJson(shapeJson);
  }

}, {
  get: function (target, prop: string, receiver) {
    return prop in target ? target[prop] : function() {
      prop = prop.replace(/^_/, '');
      const args = Array.from(arguments).map(a => a + "");
      console.log("ARGUMENTS:", args);
      const returnCode = CallCommand(prop, [prop, ...args]);
      if (returnCode !== 0) {
        throw 'command execution fail: ' + prop;
      }
      return returnCode;
    };
  },
}) as any;


