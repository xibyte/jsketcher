import React from 'react';

export default class ComboBoxControl extends React.Component {
  
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

    return <select value={value} onChange={e => onChange(e.target.value)}>
      {nonExistent}
      {children}
    </select>  
  }
}

export function ComboBoxOption({children, value}) {
  return <option value={value}>{children}</option>
}
