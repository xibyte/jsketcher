import React, {useContext} from 'react';
import {useStreamWithUpdater} from "./effects";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";

export default function bind(streamProvider) {
  return function (Component) {
    return function Connected (props) {

      const context = useContext(ReactApplicationContext);
      const [value, updater] = useStreamWithUpdater(streamProvider(context, props));


      return <Component value={value} onChange={updater} {...props} />;
    };
  };
}
