import React, {useContext, useEffect} from 'react';
import ls from './CameraControl.less';
import cameraControlRenderer from 'scene/cameraControlRenderer';
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";

export default function CameraControl() {

  const ctx = useContext(ReactApplicationContext);

  const domRef = React.useRef(null);

  useEffect(() => {
    if (!ctx.viewer || !domRef.current) {
      return;
    }
    const container = domRef.current;
    const renderer = cameraControlRenderer(container);
    const detacher = ctx.viewer.sceneSetup.sceneRendered$.attach(() => {
      const camera = ctx.viewer.sceneSetup.camera;
      renderer.render(camera)
    });

    return () => {
      detacher();
      renderer.dispose();
    }
  }, [domRef.current, ctx.viewer]);

  return <div ref={domRef} className={ls.cameraControl} />

}

