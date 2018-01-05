
export class Store {
  
  constructor() {
    this.state = {};
    this.listeners = {};
    this.locked = false;
  }

  subscribe(key, callback) {
    let listenerList = this.listeners[key];
    if (listenerList === undefined) {
      listenerList = [];
      this.listeners[key] = listenerList;
    }
    listenerList.push(callback);
    return callback;
  };

  unSubscribe(key, callback) {
    const listenerList = this.listeners[key];
    for (let i = 0; i < listenerList.length; i++) {
      if (listenerList[i] === callback) {
        listenerList.splice(i, 1);
        return;
      }
    }
  };

  dispatch(key, newValue, oldValue) {
    if (this.locked === true) {
      throw 'concurrent state modification';
    }
    this.locked = true;
    try {
      let listenerList = this.listeners[key];
      if (listenerList !== undefined) {
        for (let i = 0; i < listenerList.length; i++) {
          const callback = listenerList[i];
          try {
            callback(newValue, oldValue, this);
          } catch(e) {
            console.error(e);
          }
        }
      }
    } finally {
      this.locked = false;      
    }
  };
  
  set(key, value) {
    let oldValue = this.state[key];
    this.state[key] = value;
    this.dispatch(key, value, oldValue);
  }

  get(key) {
    return this.state[key];
  }
}