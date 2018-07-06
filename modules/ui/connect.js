import React from 'react';
import context from 'context';

export default function connect(streamProvider) {
  return function (Component) {
    return class Connected extends React.Component {
      
      state = {hasError: false};
      
      streamProps = {};

      componentWillMount() {
        let stream = streamProvider(context.streams, this.props);
        this.detacher = stream.attach(data =>  {
          this.streamProps = data;
          if (this.state.hasError) {
            this.setState({hasError: false});
            return;
          }
          this.forceUpdate();
        });
      }

      componentWillUnmount() {
        this.detacher();
      }
      
      render() {
        if (this.state.hasError) {
          return null;
        }
        
        return <Component {...this.streamProps}
                          {...this.props} />;

      }

      componentDidCatch() {
        this.setState({hasError: true});
      }
    };
  }
}
