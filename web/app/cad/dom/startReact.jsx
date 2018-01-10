import React from 'react';
import ReactDOM from 'react-dom';
import WebApplication from './components/WebApplication';

export default function startReact(bus, callback) {
  return ReactDOM.render(
    <WebApplication bus={bus} />,
    document.getElementById('app'),
    callback
  );
}