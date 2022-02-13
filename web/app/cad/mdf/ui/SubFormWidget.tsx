import React from 'react';
import {ContainerBasicProps, ContainerWidget} from "cad/mdf/ui/ContainerWidget";
import {Group, SubForm} from "cad/craft/wizard/components/form/Form";
import {ParamsPathSegment} from "cad/craft/wizard/wizardTypes";
import {Types} from "cad/craft/schema/types";
import {FieldBasicProps, fieldToSchemaGeneric} from "cad/mdf/ui/field";

export interface SubFormWidgetProps extends ContainerBasicProps, FieldBasicProps {

  type: 'sub-form',

  name: ParamsPathSegment

}

export function SubFormWidget({name, content}: SubFormWidgetProps) {

  return <Group>
    <SubForm name={name}>
      <ContainerWidget content={content} />
    </SubForm>
  </Group>;
}

SubFormWidget.propsToSchema = (props: SubFormWidgetProps, deriveSchema) => {
  return {
    type: Types.object,
    schema: deriveSchema(props.content),
    ...fieldToSchemaGeneric(props),
  }
}



