import React, {useState} from "react";
import {ContainerBasicProps, ContainerWidget, ContainerWidgetProps} from "cad/mdf/ui/ContainerWidget";
import {Group} from "cad/craft/wizard/components/form/Form";
import {StackSection} from "ui/components/controls/FormSection";
import Entity from "cad/craft/wizard/components/form/EntityList";
import {CheckboxField} from "cad/craft/wizard/components/form/Fields";

export interface SectionWidgetProps extends ContainerBasicProps {

  type: 'section';

  title: string;

  collapsible: boolean;

  initialCollapse: boolean;

}

export function SectionWidget(props: SectionWidgetProps) {
  return <StackSection title={props.title}>
    <ContainerWidget content={props.content} />
  </StackSection>
}



