import React, {useContext} from 'react';
import {AppContext} from "cad/dom/components/AppContext";
import {useStream} from "ui/effects";
import {MSketchObject} from "cad/model/msketchObject";
import {VisibleSwitch} from "cad/craft/ui/SceneInlineObjectExplorer";
import {MOpenFaceShell} from "cad/model/mopenFace";
import {MObject} from "cad/model/mobject";
import {ModelIcon} from "cad/craft/ui/ModelIcon";

interface IModelButtonBehavior {
  select: () => void;
  selected: boolean;
  highlighted: boolean;
  label: any;
  controls: any;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function ModelButtonBehavior({children, model, controlVisibility}: {
  children: (props:IModelButtonBehavior) => any,
  model: MObject,
  controlVisibility?: boolean
}) {

  const ctx = useContext(AppContext);

  if (controlVisibility === undefined) {
    controlVisibility = !model.parent
  }

  const selection: string[] = useStream(ctx => ctx.streams.selection.all);
  const highlights = useStream(ctx => ctx.highlightService.highlighted$);

  let typeLabel = model.TYPE as string;
  let idLabel: string = model.id;
  let visibilityOf = model;
  if (model instanceof MSketchObject) {
    typeLabel = model.sketchPrimitive.constructor.name
  } else if (model instanceof MOpenFaceShell) {
    typeLabel='surface';
    model = model.face;
  }

  const select = () => ctx.services.pickControl.pick(model);
  const selected = selection.indexOf(model.id) !== -1;
  const highlighted = highlights.has(model.id)

  const onMouseEnter= () => ctx.highlightService.highlight(model.id);
  const onMouseLeave= () => ctx.highlightService.unHighlight(model.id);

  const label = <>
    <ModelIcon entityType={model.TYPE} style={{marginRight: 5}} />
    <SafeLength text={idLabel} />
  </>;

  const controls = <>
    {controlVisibility && <VisibleSwitch modelId={visibilityOf.id}/>}
  </>;

  return children({
    select,
    selected,
    highlighted,
    label,
    controls,
    onMouseEnter,
    onMouseLeave
  });
}

function SafeLength(props: { text: string }): any {

  const limit = 40;
  const mid = limit / 2;
  const text = props.text;
  if (text.length > limit) {
    return <span title={text}>{text.substring(0, mid)}...{text.substring(text.length - mid, text.length)}</span>;
  } else {
    return text;
  }
}
