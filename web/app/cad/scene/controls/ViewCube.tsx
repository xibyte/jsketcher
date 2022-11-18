import React, {useContext} from "react";
import {ApplicationContext} from "cad/context";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";
import {useStream} from "ui/effects";
import {Matrix4} from "three";
import ls from './ViewCube.less';
import cx from "classnames";

export function ViewCube() {

  const context: ApplicationContext = useContext(ReactApplicationContext);

  const cssMatrix = useStream(ctx => ctx.viewer.sceneSetup.sceneRendered$.map(() => {
    const mat = new Matrix4();
    mat.extractRotation( ctx.viewer.sceneSetup.camera.matrixWorldInverse );
    return getCameraCSSMatrix( mat );
  }));

  return <div className={ls.cubeHolder}>
    <div className={ls.cube} style={{
      transform: `translateZ(-300px) ${cssMatrix}`
    }}>
      <div className={cx(ls.face, ls.front)} onClick={() => context.actionService.run('StandardViewFront')}>Front</div>
      <div className={cx(ls.face, ls.back)} onClick={() => context.actionService.run('StandardViewBack')}>Back</div>
      <div className={cx(ls.face, ls.right)} onClick={() => context.actionService.run('StandardViewRight')}>Right</div>
      <div className={cx(ls.face, ls.left)} onClick={() => context.actionService.run('StandardViewLeft')}>Left</div>
      <div className={cx(ls.face, ls.top)} onClick={() => context.actionService.run('StandardViewTop')}>Top</div>
      <div className={cx(ls.face, ls.bottom)} onClick={() => context.actionService.run('StandardViewBottom')}>Bottom</div>
    </div>
  </div>


}

function getCameraCSSMatrix(matrix) {

  var elements = matrix.elements;

  return 'matrix3d(' +
    epsilon(elements[0]) + ',' +
    epsilon(-elements[1]) + ',' +
    epsilon(elements[2]) + ',' +
    epsilon(elements[3]) + ',' +
    epsilon(elements[4]) + ',' +
    epsilon(-elements[5]) + ',' +
    epsilon(elements[6]) + ',' +
    epsilon(elements[7]) + ',' +
    epsilon(elements[8]) + ',' +
    epsilon(-elements[9]) + ',' +
    epsilon(elements[10]) + ',' +
    epsilon(elements[11]) + ',' +
    epsilon(elements[12]) + ',' +
    epsilon(-elements[13]) + ',' +
    epsilon(elements[14]) + ',' +
    epsilon(elements[15]) +
    ')';

}

function epsilon( value ) {

  return Math.abs( value ) < 1e-10 ? 0 : value;

}