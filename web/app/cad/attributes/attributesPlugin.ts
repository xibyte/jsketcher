import {Plugin} from "plugable/pluginSystem";
import {AttributesService} from "cad/attributes/attributesService";

interface AttributesPluginInputContext {
}

export interface AttributesPluginContext {
  attributesService: AttributesService;
}

type AttributesPluginWorkingContext = AttributesPluginInputContext&AttributesPluginContext;

declare module 'context' {
  interface ApplicationContext extends AttributesPluginContext {}
}

export const AttributesPlugin: Plugin<AttributesPluginInputContext, AttributesPluginContext, AttributesPluginWorkingContext> = {

  inputContextSpec: {
  },

  outputContextSpec: {
    attributesService: 'required',
  },

  activate(ctx: AttributesPluginWorkingContext) {
    ctx.attributesService = new AttributesService();
  },

}


