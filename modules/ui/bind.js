import React from 'react';
import context from 'context';

export default function bind(streamProvider) {
  return function (Component) {
    return class Connected extends React.Component {
      
      state = {hasError: false, value: null};
      
      onChange = value => streamProvider(context.streams, this.props).next(value);
      
      UNSAFE_componentWillMount() {
        this.stream = streamProvider(context.streams, this.props);
        this.detacher = this.stream.attach(value => {
          this.setState({
            hasError: false,
            value
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
        return <Component value={this.state.value}
                          onChange={this.onChange}
                          {...this.props} />;

      }

      componentDidCatch() {
        this.setState({hasError: true});
      }
    };
  };
}
