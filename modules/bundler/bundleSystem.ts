
export class BundleSystem {

  globalContext: any;
  activatedBundles = new Set<string>();
  waitingQueue = new Set<Bundle<any>>();
  perfectLoad = true;

  constructor(globalContext) {
    this.globalContext = globalContext;
  }

  activate(bundle: Bundle<any>) {

    if (!bundle.BundleName) {
      console.error("BundleName is not provided for the bundle");
      bundle.BundleName = "@Unknown_" + (UNKNOWNS_COUNTER++);
    }

    if (this.activatedBundles.has(bundle.BundleName)) {
      throw `Bundle ${bundle.BundleName} has already activated. Possible name collision`;
    }

    if (!this.readinessCheck(bundle)) {
      this.perfectLoad = false;
      this.waitingQueue.add(bundle);
      return;
    }

    this.doActivate(bundle);

    this.processWaitingQueue();
  }

  private doActivate(bundle) {
    bundle.activate(this.globalContext);
    this.activatedBundles.add(bundle.BundleName);
  }

  processWaitingQueue() {
    for (const bundle of this.waitingQueue) {
      if (this.readinessCheck(bundle)) {
        this.waitingQueue.delete(bundle);
        this.doActivate(bundle);
      }
    }
  }

  readinessCheck(bundle) {

    if (!bundle.activationDependencies) {
      return true;
    }

    for (const dep of bundle.activationDependencies) {
      if (!this.activatedBundles.has(dep)) {
        return false;
      }
    }
    return true;
  }

  checkDanglingBundles() {
    this.waitingQueue.forEach(dangling => {
      const unsatisfied = new Set(dangling.activationDependencies);
      this.activatedBundles.forEach(activated => unsatisfied.delete(activated));
      console.error('Bundle', dangling.BundleName, 'was never activated because of unsatisfied dependencies:', Array.from(unsatisfied).join(', '));
    })
  }

  checkPerfectLoad() {
    if (!this.perfectLoad) {
      console.warn("Bundle activation wasn't perfect. Consider reordering bundles to following:");
      console.info(Array.from(this.activatedBundles));
    }
  }
}

export type Spec = 'required';
export type ContextSpec<T> = {
  [Property in keyof T]: Spec;
};

export interface Bundle<WorkingContext> {

  activationDependencies?: string[];

  runtimeDependencies?: string[];

  activate(ctx: WorkingContext);

  BundleName: string,
}

let UNKNOWNS_COUNTER = 0;