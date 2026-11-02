import React from 'react';
import {FieldId} from './Field';

export default class ComboBoxControl extends React.Component {
  static contextType = FieldId;
  
  render() {
    const {onChange, value, includeNonExistent, children} = this.props;
    let nonExistent = null;
    if (includeNonExistent) {
      let needsInclusion = false;
      React.Children.forEach(children, opt => {
        if (opt.value === value) {
          needsInclusion = false;
        }
      });
      if (needsInclusion) {
        nonExistent = <ComboBoxOption value={value}>{value ?  value+'' : '<empty>'}</ComboBoxOption>;
      }
    }

    return <select id={this.context === -1 ? undefined : this.context} value={value} onChange={e => onChange(e.target.value)}>
      {nonExistent}
      {children}
    </select>  
  }
}

export function ComboBoxOption({children, value}) {
  return <option value={value}>{children}</option>
}
