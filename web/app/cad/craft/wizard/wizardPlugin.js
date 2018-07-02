import {state} from '../../../../../modules/lstream';

export function activate({streams, services}) {

  streams.wizards = state([]); 
  
  services.wizard = {
    
    open: ({type}) => {

      let wizard = {
        type
      };

      streams.wizards.update(opened => [...opened, wizard]);
    },
    
    close: wizard => {
      streams.wizards.update(opened => opened.filter(w => w !== wizard));
    }
  }
} 

