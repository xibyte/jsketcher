export default function(millis){
  if (millis < 1000) {
    return fixed(millis) + "ms";
  } else {
    return fixed(millis / 1000) + "s";
  } 
};

function fixed(v) {
  return v.toFixed(2);
}