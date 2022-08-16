import React from 'react';
import context from 'cad/context';

export default function connect(streamProvider) {
  return function (Component) {
    return class Connected extends React.Component {
      
      state = {hasError: false, streamProps: {}};
      
      UNSAFE_componentWillMount() {
        const stream = streamProvider(context.streams, this.props);
        this.detacher = stream.attach(data =>  {
          this.setState({
            hasError: false,
            streamProps: this.state.streamProps === data ? {...data} : data,
          });
        });
      }

      componentWillUnmount() {
        this.detacher();
      }
      
      render() {
        if (this.state.hasError) {
          return null;
        }
        return <Component {...this.state.streamProps}
                          {...this.props} />;

      }

      componentDidCatch() {
        this.setState({hasError: true});
      }
    };
  };
}
