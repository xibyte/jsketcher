import React from 'react';
import PropTypes from 'prop-types';

export default function connect(tokens, WrappedComponent, staticProps, mapper, dispatchMapper) {

  if (!Array.isArray(tokens)) {
    tokens = [tokens];
  }

  mapper = createMapper(mapper);

  dispatchMapper = dispatchMapper || function(dispatch) {
    return dispatch;
  };

  return class StateConnector extends React.Component {

    constructor(context) {
      super();
      this.mounted = false;
      this.stateProps = {};
      this.dispatchProps = dispatchMapper(this.dispatch);
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
      this.stateProps = mapper(state);
      if (this.mounted) {
        this.forceUpdate();
      }
    };

    dispatch = (event, data) => {
      this.context.bus.dispatch(event, data);
    };

    render() {
      return <WrappedComponent {...this.stateProps} {...this.dispatchProps} {...staticProps} />
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



