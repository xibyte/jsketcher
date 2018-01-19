import React from 'react';
import ReactDOM from 'react-dom';
import WebApplication from './components/WebApplication';

export default function startReact(context, callback) {
  return ReactDOM.render(
    <WebApplication appContext={context} />,
    document.getElementById('app'),
    callback
  );
}