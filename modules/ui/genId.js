
let COUNTER = 0;
const PREFIX = 'id_';

export default function genId() {
  return `${PREFIX}_${COUNTER++}`;  
}