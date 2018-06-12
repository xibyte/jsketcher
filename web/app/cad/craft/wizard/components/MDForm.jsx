import React from 'react';
import camelCaseSplit from 'gems/camelCaseSplit';
import Label from 'ui/components/controls/Label';
import NumberControl from 'ui/components/controls/NumberControl';
import RadioButtons, {RadioButton} from 'ui/components/controls/RadioButtons';
import TextControl from 'ui/components/controls/TextControl';
import Field from 'ui/components/controls/Field';
import FaceSelectionControl from './FaceSelectionControl';
import Folder from 'ui/components/Folder';

export default class MDForm extends React.Component {
  
  render() {
    let {metadata, data} = this.props;
    return metadata.map(({name, label, type, ...options}, index) => {
      label = label || uiLabel(name);
      let value = data[name];
      
      if (type === 'array') {
        return <Folder title={label}>
          {value && value.map((itemData, i) =>
            <MDForm metadata={options.metadata} data={itemData} key={i} />
          )}
        </Folder>
      } else {
        return <Field key={index}>
          <Label>{label}</Label>
          {
            (() => {
              let commonProps = {initValue: value};
              if (type === 'number') {
                return <NumberControl {...commonProps} {...options} />;
              } else if (type === 'face') {
                return <FaceSelectionControl {...commonProps} {...options} />;
              } else if (type === 'choice') {
                return <RadioButtons {...commonProps}>
                  {options.options.map(op => <RadioButton value={op} label={op} key={op}/>)}
                </RadioButtons>;
              } else {
                return <TextControl {...commonProps} {...options} />;
              }
            })()
          }
        </Field>
      }
    });

  }

}

function uiLabel(name) {
  return camelCaseSplit(name).map(w => w.toLowerCase()).join(' ');
}
