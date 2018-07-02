import React from 'react';

export default function errorBoundary(message, fix) {
  return function(Comp) {
    return class extends React.Component {

      state = {
        hasError: false,
        fixAttempt: false
      };

      componentDidCatch() {
        this.setState({hasError: true});
        if (!this.state.fixAttempt) {
          if (fix) {
            fix(this.props);
            this.setState({hasError: false, fixAttempt: true});
          }
        }
      }

      render() {
        if (this.state.hasError) {
          return message || null;
        }
        return <Comp {...this.props} />;
      }
    }
  }
}