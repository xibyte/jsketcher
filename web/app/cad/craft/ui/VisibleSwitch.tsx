import React from 'react';
import {useStreamWithPatcher} from "ui/effects";
import {GenericExplorerControl} from "ui/components/GenericExplorer";
import {AiOutlineEye, AiOutlineEyeInvisible} from "react-icons/ai";
import {ModelAttributes} from "cad/attributes/attributesService";

export function VisibleSwitch({modelId}) {

  const [attrs, patch] = useStreamWithPatcher<ModelAttributes>(ctx => ctx.attributesService.streams.get(modelId));

  const onClick = (e) => {
    patch(attr => {
      attr.hidden = !attr.hidden
    });
    e.stopPropagation();
    return false;
  }

  return <GenericExplorerControl onClick={onClick} title={attrs.hidden ? 'show' : 'hide'} on={attrs.hidden}>
    {attrs.hidden ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
  </GenericExplorerControl>
}
