import React from 'react';
import connect from 'ui/connect';

@connect(streams => streams.sketcher.sketchingMode.map(sketchingMode => ({visible: sketchingMode})))
export default class SketcherMode extends React.Component {
  
  render() {
    if (!this.props.visible) {
      return null;
    }
    return this.props.children;
  }
}