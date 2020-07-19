
export class MObject {

  TYPE;
  
  id;
  ext = {};  
 
  constructor(TYPE, id) {
    this.TYPE = TYPE;
    this.id = id;
  }
}

const ID_REGISTRY = new Map();

export const MObjectIdGenerator = {
  next: entityType => {
    const id = ID_REGISTRY.get(entityType) || 0;
    ID_REGISTRY.set(entityType, id + 1);
    return id;
  },
  reset: () => ID_REGISTRY.clear()
};
