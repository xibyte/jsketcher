
/**
 * CoreContext shouldn't contain any UI services because it can be potentially used in the headless mode
 */
export interface CoreContext {
}

export interface ApplicationContext extends CoreContext {
  services: any,
  streams: any,
}

export default {

  services: {},
  streams: {}

} as ApplicationContext;

