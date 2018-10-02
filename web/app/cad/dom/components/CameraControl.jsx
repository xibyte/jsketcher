import React from 'react';
import ReactDOM from 'react-dom';
import ls from './CameraControl.less';
import mapContext from 'ui/mapContext';
import cameraControlRenderer from 'scene/cameraControlRenderer';

@mapContext(({services, streams}) => ({
  getCamera: () => services.viewer && services.viewer.sceneSetup.camera,
  sceneRendered$: streams.cadScene.sceneRendered
}))
export default class CameraControl extends React.Component {
  
  render () {
    return <div className={ls.cameraControl} />
  }
  
  componentDidMount() {
    let container = ReactDOM.findDOMNode(this);
    this.renderer = cameraControlRenderer(container);
    this.detacher = this.props.sceneRendered$.attach(() => {
      let camera = this.props.getCamera();
      if (camera) {
        this.renderer.render(camera)
      }
    });
  }
  
  componentWillUnmount() {
    this.detacher();
    this.renderer.dispose();
  }
  
}

