import React from 'react';
import ReactDOM from 'react-dom';
import WebApplication from './WebApplication';

export default function startReact(callback) {
  return ReactDOM.render(
    <WebApplication />,
    document.getElementById('app'),
    callback
  );
}