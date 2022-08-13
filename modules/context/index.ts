import {ProjectService} from "cad/projectPlugin";

export interface LegacyContext {
  services: any,
  streams: any,
}

export interface ApplicationContext extends LegacyContext {

  projectService: ProjectService;

}

export type CoreContext = ApplicationContext;

export default {

  services: {},
  streams: {}

} as ApplicationContext;

