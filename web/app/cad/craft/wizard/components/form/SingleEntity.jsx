import React from 'react';
import PropTypes from 'prop-types';
import {entitySelectionToken} from '../../../../scene/controls/pickControlPlugin';
import {attachToForm} from './Form';
import mapContext from 'ui/mapContext';

@attachToForm
@mapContext(({streams}) => ({streams}))  
class SingleEntityImpl extends React.Component {

  constructor({initValue}) {
    super();
    this.state = {
      selectedItem: initValue
    }
  }
  
  selectionChanged = selection => {
    let selectedItem = selection[0];
    this.setState({selectedItem});
    this.props.onChange(selectedItem);
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
      {this.props.name}: {this.state.selectedItem}
    </div>;
  }
}

export default function SingleEntity(props, {streams}) {
  return <SingleEntityImpl defaultValue={streams.selection[props.entity].value[0]} {...props}/> 
}

SingleEntity.contextTypes = {
  streams: PropTypes.object
};