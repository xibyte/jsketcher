//import './utils/jqueryfy'
import App from './3d/modeler-app'
import startReact from './3d/dom/startReact';

startReact(() =>{
  window._TCAD_APP = new App();
});
