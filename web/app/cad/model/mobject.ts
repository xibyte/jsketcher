
export abstract class MObject {

  TYPE: string;
  
  id: string;
  ext: any = {};
 
  constructor(TYPE, id) {
    this.TYPE = TYPE;
    this.id = id;
  }

  traverse(callback: (obj: MObject) => {}) {
    callback(this);
  }
}

export const MObjectIdGenerator = {

  contexts: [{
    namespace: '',
    ID_REGISTRY: new Map()
  }],

  get context() {
    return this.contexts[this.contexts.length - 1];
  },

  next(entityType, prefix) {
    const context = this.context;
    const id = context.ID_REGISTRY.get(entityType) || 0;
    context.ID_REGISTRY.set(entityType, id + 1);
    return (context.namespace && '|') + prefix + ':' + id;
  },

  reset() {
    this.context.ID_REGISTRY.clear()
  },

  pushContext(namespace: string) {
    this.contexts.push({
      namespace,
      ID_REGISTRY: new Map()
    })
  },

  popContext() {
    this.contexts.pop();
  }

};
