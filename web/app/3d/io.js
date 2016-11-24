import {ParseStl} from './stl/stl-reader'

export function LoadSTLFromURL(url, solidsConsumer) {
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (this.readyState == 4){
      //console.log(this.response, typeof this.response);
      if (this.status == 200) {
        const reader = new FileReader();
        reader.addEventListener("loadend", () => {
          let solids = ParseStl(reader.result);
          solidsConsumer(solids)
        });
        reader.readAsArrayBuffer(this.response);
      } else {
        solidsConsumer(null, this.status);
      }
    } 
  };
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}