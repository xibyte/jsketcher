import React from 'react';

const CONTRIBUTED_COMPONENTS = [];

const mounted = new Set();

export default class ContributedComponents extends React.Component {


  componentDidMount() {
    mounted.add(this);
  }
  
  
  componentWillUnmount() {
    mounted.delete(this);
  }

  render() {
    return CONTRIBUTED_COMPONENTS;
  }
}



export function contributeComponent(comp) {
  CONTRIBUTED_COMPONENTS.push(comp);
  mounted.forEach(c => c.forceUpdate());
}