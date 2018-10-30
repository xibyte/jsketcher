import React from 'react';

export default class ComboBoxControl extends React.Component {
  
  render() {
    let {onChange, value, children} = this.props;
    return <select value={value} onChange={e => onChange(e.target.value)}>
      {children}
    </select>  
  }
}

export function ComboBoxOption({children, value}) {
  return <option value={value}>{children}</option>
}
