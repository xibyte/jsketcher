import React from "react";
import {useStream} from "ui/effects";

export function CurrentWorkbenchIcon() {
  const currentWorkbench = useStream(ctx => ctx.workbenchService.currentWorkbench$);
  const Icon = currentWorkbench.icon;
  return <Icon />;
}