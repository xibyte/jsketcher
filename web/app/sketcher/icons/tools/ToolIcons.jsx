import React from 'react';
import {SvgIcon} from 'svg/SvgIcon';
import measureCircleContent from './measure-circle-tool.svg';
import measureFreeContent from './measure-free-tool.svg';
import measureHorizontalContent from './measure-horizontal-tool.svg';
import measureVerticalContent from './measure-vertical-tool.svg';
import measureAngleBetweenContent from './measure-angle-between.svg';
import rectangleContent from './rectangle-tool.svg';
import bezierContent from './bezier-tool.svg';
import ellipseContent from './ellipse-tool.svg';
import ellipseArcContent from './ellipse-arc-tool.svg';
import arcContent from './arc-tool.svg';
import circleContent from './circle-tool.svg';
import mlineContent from './mline-tool.svg';
import lineContent from './line-tool.svg';
import pointContent from './point-tool.svg';

export function MeasureCircleToolIcon(props) {

  return <SvgIcon content={measureCircleContent} {...props}/>
}

export function MeasureFreeToolIcon(props) {

  return <SvgIcon content={measureFreeContent} {...props}/>
}

export function MeasureHorizontalToolIcon(props) {

  return <SvgIcon content={measureHorizontalContent} {...props}/>
}

export function MeasureVerticalToolIcon(props) {

  return <SvgIcon content={measureVerticalContent} {...props}/>
}

export function MeasureAngleBetweenAngle(props) {

  return <SvgIcon content={measureAngleBetweenContent} {...props}/>
}

export function RectangleToolIcon(props) {

  return <SvgIcon content={rectangleContent} {...props}/>
}

export function BezierToolIcon(props) {

  return <SvgIcon content={bezierContent} {...props}/>
}

export function EllipseArcToolIcon(props) {

  return <SvgIcon content={ellipseArcContent} {...props}/>
}

export function EllipseToolIcon(props) {

  return <SvgIcon content={ellipseContent} {...props}/>
}

export function ArcToolIcon(props) {

  return <SvgIcon content={arcContent} {...props}/>
}

export function CircleToolIcon(props) {

  return <SvgIcon content={circleContent} {...props}/>
}

export function MultiLineToolIcon(props) {

  return <SvgIcon content={mlineContent} {...props}/>
}

export function LineToolIcon(props) {

  return <SvgIcon content={lineContent} {...props}/>
}

export function PointToolIcon(props) {

  return <SvgIcon content={pointContent} {...props}/>
}
