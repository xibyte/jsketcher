import React from "react";
import {ModelButtonBehavior} from "cad/craft/ui/ModelButtonBehaviour";
import {MObject} from "cad/model/mobject";
import cx from "classnames";
import ls from './ModelButton.less'

interface ModelButtonProps {
  model: MObject;
  controlVisibility?: boolean;
}

export function ModelButton(props: ModelButtonProps) {
  return <ModelButtonBehavior model={props.model} controlVisibility={props.controlVisibility}>
    {behaviour => <div
      className={cx(ls.root,
        behaviour.selected&&'selected',
        behaviour.highlighted&&'highlighted'
      )}
      onMouseEnter={behaviour.onMouseEnter}
      onMouseLeave={behaviour.onMouseLeave}
      onClick={behaviour.select}
    >
      <span className={ls.label}>
        {behaviour.label}
      </span>
      <span className={ls.controls}>
        {behaviour.controls}
      </span>
    </div>}
  </ModelButtonBehavior>;
}