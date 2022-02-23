

type BagOfPlugins = Set<Plugin<any, any>>;

export class PluginSystem {

  plugins: BagOfPlugins = new Set();
  waitingQueue: BagOfPlugins = new Set();
  globalContext: any;

  constructor(globalContext: any) {
    this.globalContext = globalContext;
  }

  load(plugin: Plugin<any, any>) {
    this.waitingQueue.add(plugin);
    this.processWaitingQueue();
  }

  processWaitingQueue() {
    let needPass = true;
    while (needPass) {
      needPass = false;
      this.waitingQueue.forEach(plugin => {
        const localContext = plugin.readiness(this.globalContext);
        if (!!localContext) {
          try  {
            plugin.activate(localContext);
            needPass = true;
            this.plugins.add(plugin);
          } catch (error) {
            console.error(error);
          } finally {
            this.waitingQueue.delete(plugin)
          }
        }
      })
    }
  }

  unload(plugin: Plugin<any, any>) {
    this.waitingQueue.delete(plugin);
    this.plugins.delete(plugin);
    try {
      plugin.deactivate(this.globalContext);
    } catch (error) {
      console.error(error);
    }

    let needPass = true;
    while (needPass) {
      needPass = false;
      this.plugins.forEach(plugin => {
        if (!plugin.deactivate) {
          return;
        }
        const localContext = plugin.readiness(this.globalContext);
        if (!localContext) {
          try {
            plugin.deactivate(this.globalContext);
            this.plugins.delete(plugin);
            this.waitingQueue.add(plugin);
            needPass = true;
          } catch (error) {
            console.error(error);
          }
        }
      })
    }
  }
}


export interface Plugin<GlobalContext, WorkingContext> {

  readiness(ctx: GlobalContext): WorkingContext;

  activate(ctx: WorkingContext);

  deactivate?(ctx: WorkingContext);

}
