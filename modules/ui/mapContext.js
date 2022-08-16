import React from 'react';
import context from 'cad/context';

export default function mapContext(mapper) {
  return function (Component) {
    return function ContextMapper(props) {
      const actions = mapper(context, props);
      return <Component {...actions} {...props} />
    }
  }
}