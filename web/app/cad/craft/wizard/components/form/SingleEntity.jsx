import React from 'react';
import PropTypes from 'prop-types';
import {attachToForm, formFieldDecorator} from './Form';
import mapContext from 'ui/mapContext';
import {camelCaseSplitToStr} from 'gems/camelCaseSplit';

@attachToForm
@mapContext(({streams}) => ({streams}))
export default class SingleEntity extends React.Component {

  constructor({initValue}) {
    super();
    this.state = {
      selectedItem: initValue
    }
  }
  
  selectionChanged = selection => {
    let selectedItem = selection[0];
    if (selectedItem) {
      this.setState({selectedItem});
      this.props.onChange(selectedItem);
    }
  };
  
  componentDidMount() {
    let {streams, entity} = this.props;
    this.detacher = streams.selection[entity].attach(this.selectionChanged);
  }

  componentWillUnmount() {
    this.detacher();
  }

  render() {
    return <div>
      {camelCaseSplitToStr(this.props.name)}: {this.state.selectedItem}
    </div>;
  }
}
