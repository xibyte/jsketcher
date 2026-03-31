import {NativeOperationService, createNativeOperationService} from "./nativeOperationService";

export interface NativeEngineBundleContext {

  nativeService: NativeOperationService;
}

export function activate(ctx) {
  ctx.nativeService = createNativeOperationService(ctx);
}

export const BundleName = "@NativeEngine";
