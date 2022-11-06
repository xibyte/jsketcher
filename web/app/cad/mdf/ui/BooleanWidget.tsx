import React from "react";
import {FieldBasicProps} from "cad/mdf/ui/field";
import {EntityKind} from "cad/model/entities";
import {SectionWidgetProps} from "cad/mdf/ui/SectionWidget";

export interface BooleanWidgetProps extends FieldBasicProps {

  type: 'boolean';

  simplify?: boolean;

}

const ENTITY_CAPTURE = [EntityKind.SHELL];

const BOOLEAN_OPTIONS = ['NONE', 'UNION', 'SUBTRACT', 'INTERSECT'];

export const BooleanWidgetDefinition = (props: BooleanWidgetProps) => ({

  type: 'section',

  title: props.label,

  collapsible: true,

  initialCollapse: false,

  content: [
    {
      type: 'sub-form',
      name: props.name,
      optional: props.optional,
      content: [
        {
          name: "kind",
          label: 'kind',
          type: "choice",
          optional: true,
          defaultValue: props.defaultValue||'NONE',
          values: BOOLEAN_OPTIONS
        },
        {
          name: "simplify",
          label: 'simplify',
          type: "checkbox",
          defaultValue: true
        },
        {
          name: "targets",
          label: 'target',
          type: "selection",
          capture: ENTITY_CAPTURE,
          multi: true,
          optional: true,
        }

      ]
    },

  ]
} as SectionWidgetProps);
