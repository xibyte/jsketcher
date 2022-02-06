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
  const [visible, setVisible] = useState(!props.initialCollapse);

  const onTitleClick = props.collapsible ? () => setVisible(visible => !visible) : undefined;

  return <StackSection title={props.title} onTitleClick={onTitleClick} isClosed={!visible}>
    {visible && <ContainerWidget content={props.content} />}
  </StackSection>
}



