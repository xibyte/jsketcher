import {WizardSelectionContext} from "cad/craft/wizard/wizardSelectionPlugin";


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
        const ready = readiness(plugin, this.globalContext);
        if (ready) {
          try  {
            plugin.activate(this.globalContext);
            checkActivation(plugin, this.globalContext);
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
      if (plugin.deactivate) {
        plugin.deactivate(this.globalContext);
      }
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
        const isReady = readiness(plugin, this.globalContext);
        if (!isReady) {
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

function readiness(plugin: Plugin<any, any>, globalContext: any) {
  const specKeys = Object.keys(plugin.inputContextSpec);
  for (let key of specKeys) {
    if (!globalContext[key] && plugin.inputContextSpec[key] === 'required') {
      return false;
    }
  }
  return true;
}

function checkActivation(plugin: Plugin<any, any>, globalContext: any) {
  const specKeys = Object.keys(plugin.outputContextSpec);
  for (let key of specKeys) {
    if (!globalContext[key] && plugin.outputContextSpec[key] === 'required') {
      console.error("declared service was never activated: " + key);
    }
  }
}

export type Spec = 'required' | 'optional';

export type ContextSpec<T> = {
  [Property in keyof T]: Spec;
};


export interface Plugin<InputContext, OutputContext, WorkingContext = InputContext&OutputContext> {

  inputContextSpec: ContextSpec<InputContext>;

  outputContextSpec: ContextSpec<OutputContext>;

  activate(ctx: InputContext&OutputContext);

  deactivate?(ctx: InputContext&OutputContext);

}
