import React from "react";
import ls from "./SceneInlineSection.less";

interface SceneInlineSectionProps {
  title: any;
  children: any;
}

export function SceneInlineSection(props: SceneInlineSectionProps) {

  return <React.Fragment>
    <SceneInlineTitleBar>{props.title}</SceneInlineTitleBar>
    <div className={ls.scrollableArea}>
      {props.children}
    </div>
  </React.Fragment>

}

export function SceneInlineTitleBar({children, ...props}) {
  return <div className={ls.titleBar} {...props}>{children}</div>;
}

export function SceneInlineDelineation({children, ...props}) {
  return <div className={ls.delineation} {...props}>{children}</div>;
}