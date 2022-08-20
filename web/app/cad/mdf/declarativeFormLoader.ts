import {OperationSchema} from "cad/craft/schema/schema";
import {
  DynamicWidgetProps,
  FieldWidgetProps,
  FormDefinition,
  isContainerWidgetProps,
  isFieldWidgetProps,
  isSubFormWidgetProps,
  UIDefinition
} from "cad/mdf/ui/uiDefinition";
import {uiDefinitionToReact} from "cad/mdf/ui/render";
import {ComponentLibrary, DynamicComponents} from "cad/mdf/ui/componentRegistry";


export function loadDeclarativeForm(form: FormDefinition) {
  const uiDefinition: UIDefinition = {
    type: 'group',
    content: form
  }
  const derivedSchema = deriveSchema(uiDefinition);
  return {
    form: uiDefinitionToReact(uiDefinition),
    schema: derivedSchema
  }
}

function traverseUIDefinition(uiDefinition: UIDefinition|UIDefinition[], onField: (comp: FieldWidgetProps) => void) {
  function inorder(comp: DynamicWidgetProps) {

    const libraryItemFn = ComponentLibrary[comp.type];

    if (libraryItemFn) {
      const libraryItem = libraryItemFn(comp);
      inorder(libraryItem)
      return;
    }

    if (isFieldWidgetProps(comp)) {
      onField(comp);
    }

    if (isContainerWidgetProps(comp)) {
      if (!isSubFormWidgetProps(comp)) {
        comp.content.forEach(comp => inorder(comp))
      }
    }
  }

  if (Array.isArray(uiDefinition)) {
    uiDefinition.forEach(def => traverseUIDefinition(def, onField));
  } else {
    inorder(uiDefinition);
  }
}

export function deriveSchema(uiDefinition: UIDefinition): OperationSchema {

  const schema: OperationSchema = {};

  traverseUIDefinition(uiDefinition, (field) => {
    const propsToSchema = DynamicComponents[field.type].propsToSchema;
    const fieldSchema = propsToSchema(field as any, deriveSchema);
    schema[field.name] = fieldSchema;
  });

  return schema;
}
