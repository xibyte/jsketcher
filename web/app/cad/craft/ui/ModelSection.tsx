import React from 'react';
import {MObject} from "cad/model/mobject";
import {GenericExplorerNode} from "ui/components/GenericExplorer";
import {ModelButtonBehavior} from "cad/craft/ui/ModelButtonBehaviour";

export function ModelSection({model, expandable = true, controlVisibility = false, ...props}: {
  model: MObject,
  children?: any,
  controlVisibility?: boolean,
  expandable?: boolean,
}) {

  return <ModelButtonBehavior model={model} controlVisibility={controlVisibility}>
    {behavior => <GenericExplorerNode defaultExpanded={false}
                                   expandable={expandable}
                                   label={behavior.label}
                                   selected={behavior.selected}
                                   select={behavior.select}
                                   highlighted={behavior.highlighted}
                                   onMouseEnter={behavior.onMouseEnter}
                                   onMouseLeave={behavior.onMouseLeave}
                                   controls={behavior.controls}>
      {props.children}
    </GenericExplorerNode>}
  </ModelButtonBehavior>;
}
