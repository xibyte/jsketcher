import React from 'react';
import context from 'context';

export default function errorBoundary(message, fix, resetOn) {
  return function(Comp) {
    class ErrorBoundary extends React.Component {

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
        if (resetOn) {
          let stream = resetOn(context.streams);
          if (stream) {
            this.attcahing = true;
            this.detacher = stream.attach(this.reset);
            this.attcahing = false;
          }
        }
      }

      reset = () => {
        if (this.attcahing) {
          return;
        }
        this.setState({hasError: false, fixAttempt: false});
        if (this.detacher) {
          this.detacher();
        }
      };
      
      render() {
        if (this.state.hasError) {
          return message || null;
        }
        return <Comp {...this.props} />;
      }
    }
    return ErrorBoundary;
  }
}