import React from 'react';
import {ContainerBasicProps, ContainerWidget} from "cad/mdf/ui/ContainerWidget";
import {Group} from "cad/craft/wizard/components/form/Form";

export interface GroupWidgetProps extends ContainerBasicProps {

  type: 'group',

}


export function GroupWidget({content}: GroupWidgetProps) {

  return <Group>
    <ContainerWidget content={content} />
  </Group>

}




