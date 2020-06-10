import React, {useContext} from 'react';
import {useStreamWithUpdater} from "./effects";
import {AppContext} from "../../web/app/cad/dom/components/AppContext";

export default function bind(streamProvider) {
  return function (Component) {
    return function Connected (props) {

      const context = useContext(AppContext);
      const [value, updater] = useStreamWithUpdater(streamProvider(context, props));


      return <Component value={value} onChange={updater} {...props} />;
    };
  };
}
