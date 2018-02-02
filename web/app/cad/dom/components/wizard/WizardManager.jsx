import React from 'react';
import PropTypes from 'prop-types';
import {TOKENS as WIZARD_TOKENS} from '../../../craft/wizard/wizardPlugin';
import connect from 'ui/connect';
import Wizard from "./Wizard";
import {createPreviewer} from "../../../preview/scenePreviewer";

function WizardManager({wizards, close}, {services}) {
  return wizards.map( ({type, initialState}, wizardIndex) => {
    let {metadata, previewGeomProvider, run} = services.operation.get(type);
    
    function onOK(params) {
      services.craft.modify({type, params});
      close();
    }
    
    let previewer = createPreviewer(previewGeomProvider, services);
    return <Wizard key={wizardIndex} previewer={previewer} metadata={metadata}
                   onOK={onOK}
                   onCancel={close}
                   initialState={initialState} title={type} left={70 + wizardIndex * 250 + 20} />
  });
}

WizardManager.contextTypes = {
  services: PropTypes.object
};

export default connect(WizardManager, WIZARD_TOKENS.WIZARDS, {
  mapProps: ([wizards]) => ({wizards}),
  mapActions: ({dispatch}) => ({
    close: wizard => dispatch(WIZARD_TOKENS.CLOSE, wizard)
  })
});
