import {Bundle} from "bundler/bundleSystem";
import {ApplicationContext} from "cad/context";


export interface LegacyStructureBundleContext {
  services: any,
  streams: any
}


export const LegacyStructureBundle: Bundle<ApplicationContext> = {

  activate(ctx: ApplicationContext) {
    ctx.services = {};
    ctx.streams = {};
  },

  BundleName: "@Legacy",

}


