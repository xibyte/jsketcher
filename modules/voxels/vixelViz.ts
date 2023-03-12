import {BoxGeometry, Color, Group, Mesh, MeshPhongMaterial} from "three";

const geometry = new BoxGeometry( 1, 1, 1 );

export class Cube extends Group {

  material: MeshPhongMaterial;

  constructor(size=1, colorTag) {

    super();

    let material;
    if (colorTag) {
      material = MaterialTable[colorTag];
    } else {
      material = MaterialRandomTable[Math.round(Math.random() * 100000) % MaterialRandomTable.length]
    }

    const mesh = new Mesh(geometry, material);
    mesh.position.x = 0.5*size;
    mesh.position.y = 0.5*size;
    mesh.position.z = 0.5*size;
    mesh.scale.x = size
    mesh.scale.y = size
    mesh.scale.z = size

    this.add(mesh)

  }
}

const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const niceColor = () => {
  const h = randomInt(0, 360);
  const s = randomInt(42, 98);
  const l = randomInt(40, 90);
  return `hsl(${h},${s}%,${l}%)`;
};

const MaterialRandomTable = [];

for (let i = 0; i < 1000; i ++) {
  MaterialRandomTable.push(new MeshPhongMaterial( { color: new Color(niceColor())} ));
}

const MaterialTable = {
  'inside': new MeshPhongMaterial( { color: 'white'} ),
  'edge': new MeshPhongMaterial( { color: 0x999999} )
};

