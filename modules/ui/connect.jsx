import React from 'react';
import PropTypes from 'prop-types';
import shallowEqual from "../gems/shallowEqual";

export default function connect(WrappedComponent, tokens, {staticProps, mapProps, mapActions}) {

  if (!Array.isArray(tokens)) {
    tokens = [tokens];
  }

  mapProps = createMapper(mapProps);

  mapActions = mapActions || function(dispatch) {
    return dispatch;
  };

  return class StateConnector extends React.Component {

    constructor(context) {
      super();
      this.mounted = false;
      this.stateProps = {};
      this.dispatchProps = mapActions(this.dispatch);
    }

    componentWillMount() {
      this.externalStateConnection = this.context.bus.connectToState(tokens, this.setExternalState);
      this.externalStateConnection();
    }

    componentDidMount() {
      this.mounted = true;
    }

    componentWillUnmount() {
      this.mounted = false;
      this.context.bus.disconnectFromState(this.externalStateConnection);
    }

    setExternalState = (state) => {
      this.stateProps = mapProps(state);
      if (this.mounted) {
        this.forceUpdate();
      }
    };

    shouldComponentUpdate(nextProps, nextState) {
      return !shallowEqual(this.props, nextProps);
      
    }
    
    dispatch = (event, data) => {
      this.context.bus.dispatch(event, data);
    };

    render() {
      return <WrappedComponent {...this.stateProps} {...this.dispatchProps} {...staticProps} />
    }

    componentDidCatch() {
    }

    static contextTypes = {
      bus: PropTypes.object
    };
  }
}

function createMapper(mapper) {
  if (!mapper) {
    return function (state) {
      let props = {};
      state.forEach(stateItem => Object.assign(props, stateItem));
      return props;
    };
  } else if (Array.isArray(mapper)) {
    return function (state) {
      let props = {};
      for (let i = 0; i < state.length; i++) {
        let stateItem = state[i];
        let mapperItem = mapper[i];
        Object.assign(props, mapperItem ? mapperItem(stateItem) : stateItem)
      }
      return props;
    };
  }
  return mapper;
}



