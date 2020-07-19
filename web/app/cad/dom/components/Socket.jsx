import React from 'react';
import connect from 'ui/connect';
import mapContext from 'ui/mapContext';
import {state} from 'lstream';

@mapContext(ctx => ({
  getComponent: ctx.services.ui.getComponent
}))
@connect((streams, props) => {
  let stream = streams.ui.sockets[props.entry];
  if (!stream) {
    stream= state();
    streams.ui.sockets[props.entry] = stream;
  }
  return stream.map(componentId => ({componentId}));
})
export default class Socket extends React.Component {
  render() {
    let {getComponent, componentId, ...props} = this.props;
    if (!componentId) {
      return null;
    }
    let Component = getComponent(componentId);
    if (!Component) {
      return null;
    }
    return <Component {...props} />;
  }
};