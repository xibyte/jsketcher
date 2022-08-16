// @deprecated - use streams
export default class Bus {
  
  constructor() {
    this.listeners = {};
    this.state = {};
    this.keepStateFor = new Set();
    this.lock = new Set();
    this.stateConnections = new Map();
  }
  
  subscribe(token, callback) {
    let listenerList = this.listeners[token];
    if (listenerList === undefined) {
      listenerList = [];
      this.listeners[token] = listenerList;
    }
    listenerList.push(callback);
    return callback;
  }

  unsubscribe(key, callback) {
    const listenerList = this.listeners[key];
    for (let i = 0; i < listenerList.length; i++) {
      if (listenerList[i] === callback) {
        listenerList.splice(i, 1);
        return;
      }
    }
  }

  tokensToStates(tokens) {
    return tokens.map( token => this.state[token] );
  }
  
  connectToState(tokens, callback) {
    if (!Array.isArray(tokens)) {
      tokens = [tokens];
    }

    const connection = () => {
      callback(this.tokensToStates(tokens));
    };
    tokens.forEach(token => {
      if (!this.keepStateFor.has(token)) {
        throw `unable to connect to stateless token ${token}. state for a token should be initialized before connecting`;
      }
      this.subscribe(token, connection);
    });
    this.stateConnections.set(connection, tokens);
    return connection;
  }

  disconnectFromState(connection) {
    this.stateConnections.get(connection).forEach(token => this.unsubscribe(token, connection));
    this.stateConnections.delete(connection);
  }

  updateStates(tokens, updater) {
    const updated = updater(this.tokensToStates(tokens));
    for (let i = 0; i < tokens.length; ++i) {
      this.dispatch(tokens[i], updated[i]);
    }
  }

  updateState(token, updater) {
    this.dispatch(token, updater(this.state[token]));
  }

  setState(token, partialState) {
    this.dispatch(token, Object.assign({}, this.state[token], partialState));
  }

  getState(fqn) {
    return this.state[createToken(fqn)];
  }
  
  dispatch(key, data) {
    // console.log('dispatch: %c' + key, 'color: #0a0');
    // console.dir(data);

    if (this.lock.has(key)) {
      console.warn('recursive dispatch');
      return
    }
    let oldValue;
    if (this.keepStateFor.has(key)) {
      oldValue = this.state[key]; 
      this.state[key] = data;
    }
    this.lock.add(key);
    try {
      const listenerList = this.listeners[key];
      if (listenerList !== undefined) {
        for (let i = 0; i < listenerList.length; i++) {
          const callback = listenerList[i];
          callback(data, oldValue);
        }
      }
    } finally {
      this.lock.delete(key);
    }
  }

  enableState(forToken, initValue) {
    this.keepStateFor.add(forToken);
    this.state[forToken] = initValue;
  }

  disableState(forToken) {
    this.keepStateFor.delete(forToken);
    delete this.state[forToken];
  }
  
  externalAPI = {
    setState: this.setState.bind(this),
    dispatch: this.dispatch.bind(this),
    updateState: this.updateState.bind(this),
    updateStates: this.updateStates.bind(this)
  }
}

export function createToken(...fqn) {
  return fqn.join('.');
}

