declare module '*.less' {
  const resource: {[key: string]: string};
  export = resource;
}
declare module "*.svg" {
  const content: any;
  export default content;
}

declare const verb: any;
declare const FS: any;
declare const __CAD_APP: any;
declare const __DEBUG__: any;
declare let out: any;
