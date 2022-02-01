import React from 'react';
import {DynamicWidgetProps} from "cad/mdf/ui/uiDefinition";
import {DynamicComponentWidget} from "cad/mdf/ui/DynamicComponentWidget";

export interface ContainerBasicProps  {

  content: DynamicWidgetProps[];

}

export interface ContainerWidgetProps extends ContainerBasicProps {

  type: 'container',

}


export function ContainerWidget({content}: ContainerBasicProps) {

  return <React.Fragment>{content.map((comp, i) => <DynamicComponentWidget key={i} {...comp} />)}</React.Fragment>;

}




