import React from 'react';
import context from 'context';

export default function connect(streamProvider) {
  return function (Component) {
    return class Connected extends React.Component {
      
      streamProps = {};

      componentWillMount() {
        let stream = streamProvider(context.streams, this.props);
        this.detacher = stream.attach(data =>  {
          this.streamProps = data;
          this.forceUpdate();
        });
      }

      componentWillUnmount() {
        this.detacher();
      }
      
      render() {
        return <Component {...this.streamProps}
                          {...this.props} />;

      }
    };
  }
}
