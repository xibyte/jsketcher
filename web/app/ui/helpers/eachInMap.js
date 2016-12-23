export default function( map, block ) {
  let out = '';
  Object.keys( map ).map(function( prop ) {
    out += block.fn( {key: prop, value: map[ prop ]} );
  });
  return out;
};