import React from 'react';
import PropTypes from 'prop-types';
import {entitySelectionToken} from '../../../../scene/controls/pickControlPlugin';
import {attachToForm} from './Form';

const SingleEntityImpl = attachToForm(class SingleEntityImpl extends React.Component {

  constructor({initValue}) {
    super();
    this.state = {
      selectedItem: initValue
    }
  }
  
  selectionChanged = selection => {
    let selectedItem = selection[0];
    this.setState({selectedItem});
    this.onChange(selectedItem);
  };
  
  componentDidMount() {
    this.context.bus.subscribe(entitySelectionToken(this.props.entity), this.selectionChanged);
  }

  componentWillUnmount() {
    this.context.bus.unsubscribe(entitySelectionToken(this.props.entity), this.selectionChanged);
  }

  render() {
    return <div>
      {this.props.name}: {this.state.selectedItem}
    </div>;
  }

  static contextTypes = {
    bus: PropTypes.object
  };
});

export default function SingleEntity(props, {bus}) {
  return <SingleEntityImpl defaultValue={bus.state[entitySelectionToken(props.entity)][0]} {...props}/> 
}

SingleEntity.contextTypes = {
  bus: PropTypes.object
};