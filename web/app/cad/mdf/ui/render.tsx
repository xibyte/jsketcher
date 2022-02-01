import React from 'react';
import {DynamicComponentWidget} from "cad/mdf/ui/DynamicComponentWidget";
import {UIDefinition} from "cad/mdf/ui/uiDefinition";

export function uiDefinitionToReact(uiDefinition: UIDefinition)  {
  return () => <DynamicComponentWidget {...uiDefinition} />;
}
