import React from 'react';

export default class CheckboxControl extends React.Component {
  
  render() {
    let {onChange, value} = this.props;
    return <input type='checkbox' 
              defaultValue={value} 
              onChange={e => onChange(e.target.value)}  /> 
  }
}
