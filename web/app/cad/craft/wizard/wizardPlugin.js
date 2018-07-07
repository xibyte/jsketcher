import {state} from '../../../../../modules/lstream';

export function activate({streams, services}) {

  streams.wizard = state(null); 
  
  services.wizard = {
    
    open: ({type}) => {

      let wizard = {
        type
      };

      streams.wizard.value = wizard;
    },
    
    close: () => {
      streams.wizard.value = null;
    }
  }
} 

