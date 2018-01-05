export default class Bus {
  
  constructor() {
    this.listeners = {};
    this.state = {};
    this.recordFor = new Set();
    this.lock = new Set();
  }
  
  subscribe(key, callback) {
    let listenerList = this.listeners[key];
    if (listenerList === undefined) {
      listenerList = [];
      this.listeners[key] = listenerList;
    }
    listenerList.push(callback);
    
    if (this.recordFor.has(key)) {
      callback(this.state[key]);
    }
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
  
  dispatch(key, data) {
    if (this.lock.has(key)) {
      console.warn('recursive dispatch');
      return
    }
    this.lock.add(key);
    try {
      let listenerList = this.listeners[key];
      if (listenerList !== undefined) {
        for (let i = 0; i < listenerList.length; i++) {
          const callback = listenerList[i];
          try {
            callback(data);
          } catch(e) {
            console.error(e);
          }
        }
      }
    } finally {
      this.lock.delete(key);
      if (this.recordFor.has(key)) {
        this.state[key] = data;
      }
    }
  };

  enableState(forEvent, initValue) {
    this.recordFor.add(forEvent);
    this.state[forEvent] = initValue;
  }

  disableState(forEvent) {
    this.recordFor.delete(forEvent);
  }
}




