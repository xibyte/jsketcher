import React, {useContext} from 'react';
import {AppContext} from "./AppContext";
import {useStream} from "ui/effects";
import {ApplicationContext} from "context";
import {AlgNumSubSystem} from "../../../sketcher/constr/AlgNumSystem";
import {ParallelConstraintIcon} from "../../../sketcher/icons/constraints/ConstraintIcons";
import {DEG_RAD, makeAngle0_360} from "../../../math/math";
import {AlgNumConstraint} from "../../../sketcher/constr/ANConstraints";
import {Param} from "../../../sketcher/shapes/param";
import {COS_FN, Polynomial, POW_1_FN, POW_2_FN, SIN_FN} from "../../../sketcher/constr/polynomial";
import {Matrix3} from "math/l3space";
import CSys from "math/csys";
import Vector from "math/vector";
import {Dialog} from "ui/components/Dialog";
import {MObject} from "../../model/mobject";
import {MBrepFace} from "../../model/mface";
import {solveAssembly} from "../../assembly/assemblySolver";
import {Constraints3D, createAssemblyConstraint} from "../../assembly/constraints3d";

export function ModellerContextualActions({}) {

  const ctx = useContext(AppContext);

  const faceSelection: string[] = useStream(ctx => ctx.streams.selection.face);

  if (faceSelection.length === 0) {
    return null;
  }

  const actions = [];

  if (faceSelection.length === 2) {

    actions.push(<button key='faceParallel' onClick={() => faceParallel(ctx, faceSelection)}>Face Parallel</button>);

  }

  return <Dialog initRight={50} title='AVAILABLE ACTIONS' onClose={() => {}}>
    {actions}
  </Dialog>;
}

const XConstraints3D = {
  FaceParallel: {
    id: 'FaceParallel',
    name: 'FaceParallel',
    icon: ParallelConstraintIcon,

    defineAssemblyScope: ([face1, face2], cb) => {
      cb(face1.assemblyNodes.normal);
      cb(face2.assemblyNodes.normal);
    },

    defineParamsScope: (objects, cb) => {

      const [face1W, face2W, csys1W, csys2W] = objects;

      const n1 = face1W.normal;
      const n2 = face2W.normal;


      const [nx1, ny1, nz1] = n1;
      const [nx2, ny2, nz2] = n2;

      const csysParams1 = csys1W.params;
      const [
        ox1, oy1, oz1, ix1, iy1, iz1, jx1, jy1, jz1, kx1, ky1, kz1
      ] = csysParams1;

      const csysParams2 = csys2W.params;
      const [
        ox2, oy2, oz2, ix2, iy2, iz2, jx2, jy2, jz2, kx2, ky2, kz2
      ] = csysParams2;

      [
        nx1, ny1, nz1, nx2, ny2, nz2,
        ox1, oy1, oz1, ix1, iy1, iz1, jx1, jy1, jz1, kx1, ky1, kz1,
        ox2, oy2, oz2, ix2, iy2, iz2, jx2, jy2, jz2, kx2, ky2, kz2
      ].forEach(cb);

    },

    collectPolynomials: (polynomials, params, constants, [face1, face2, csys1, csys2]) => {

      const [
        nx1, ny1, nz1, nx2, ny2, nz2,
        ox1, oy1, oz1, ix1, iy1, iz1, jx1, jy1, jz1, kx1, ky1, kz1,
        ox2, oy2, oz2, ix2, iy2, iz2, jx2, jy2, jz2, kx2, ky2, kz2
      ] = params;

      polynomials.push(
        new Polynomial(1)
          .monomial()
            .term(nx1, POW_1_FN)
            .term(nx2, POW_1_FN)
          .monomial()
            .term(ny1, POW_1_FN)
            .term(ny2, POW_1_FN)
          .monomial()
            .term(nz1, POW_1_FN)
            .term(nz2, POW_1_FN)
      );

      rigidBodyLink3x3(
        [ix1, iy1, iz1, jx1, jy1, jz1, kx1, ky1, kz1],
        csys1.csys,
        face1.normal
      ).forEach(p => polynomials.push(p));

      rigidBodyLink3x3(
        [ix2, iy2, iz2, jx2, jy2, jz2, kx2, ky2, kz2],
        csys2.csys,
        face2.normal
      ).forEach(p => polynomials.push(p));

      polynomials.push(
        new Polynomial(-1)
          .monomial()
           .term(nx1, POW_2_FN)
          .monomial()
            .term(ny1, POW_2_FN)
          .monomial()
           .term(nz1, POW_2_FN)
      );

      polynomials.push(
        new Polynomial(-1)
          .monomial()
            .term(nx2, POW_2_FN)
          .monomial()
            .term(ny2, POW_2_FN)
          .monomial()
            .term(nz2, POW_2_FN)
      );

    }

  },

};

function vectorParams(vec) {
  const {x, y, z} = vec;
  return [new Param(x, 'X'), new Param(y, 'Y'), new Param(z, 'Z')];
}

function csysParams(csys) {
  const {x, y, z} = csys.origin;
  return [
    new Param(x, 'X'),
    new Param(y, 'Y'),
    new Param(z, 'Z'),
    new Param(csys.x.x, 'X'),
    new Param(csys.x.y, 'Y'),
    new Param(csys.x.z, 'Z'),
    new Param(csys.y.x, 'X'),
    new Param(csys.y.y, 'Y'),
    new Param(csys.y.z, 'Z'),
    new Param(csys.z.x, 'X'),
    new Param(csys.z.y, 'Y'),
    new Param(csys.z.z, 'Z')
  ];
}

function faceWrapper(face: MBrepFace) {

  return {
    constraints: new Set(),
    normal: vectorParams(face.normal()),
    face,
    visitParams(cb) {
      this.normal.forEach(cb);
    }

  }

}


function csysWrapper(csys: CSys) {

  return {
    constraints: new Set(),
    params: csysParams(csys),
    csys,
    visitParams(cb) {
      this.params.forEach(cb);
    }
  }

}
function faceParallel(ctx: ApplicationContext, faceSelection: string[]) {

  const [face1, face2] = faceSelection.map(id => ctx.cadRegistry.find(id));

  const constraints = [
    createAssemblyConstraint(Constraints3D.FaceParallel, [face1, face2])
  ];

  solveAssembly(constraints);
}

function faceParallelLegacy(ctx: ApplicationContext, faceSelection: string[]) {

  const [face1, face2] = faceSelection.map(id => ctx.cadRegistry.find(id));

  const stage = {};
  const objects = [
    faceWrapper(face1),
    faceWrapper(face2),
    csysWrapper(face1.shell.csys),
    csysWrapper(face2.shell.csys),
  ];
  objects.forEach(o => o.stage = stage);
  stage.objects = objects;
  const algNumConstraint = new AlgNumConstraint(XConstraints3D.FaceParallel, objects);

  const system = new AlgNumSubSystem(() => 0.001, val => val, stage);
  // __DEBUG__.AddNormal(face1.csys.origin, new Vector().set3(objects[0].normal.map(p => p.get())))
  // __DEBUG__.AddNormal(face2.csys.origin, new Vector().set3(objects[1].normal.map(p => p.get())))

  system.startTransaction();
  system.addConstraint(algNumConstraint);
  system.prepare();
  system.solveFine();
  system.finishTransaction();

  __DEBUG__.AddNormal(face1.csys.origin, new Vector().set3(objects[0].normal.map(p => p.get())))
  __DEBUG__.AddNormal(face2.csys.origin, new Vector().set3(objects[1].normal.map(p => p.get())))



  function applyResults(shell, targetCsysParams, normal) {
    const [
      ox, oy, oz, ix, iy, iz, jx, jy, jz, kx, ky, kz
    ] = targetCsysParams.map(p => p.get());

    const targetCsys = new CSys(
      new Vector(ox, oy, oz),
      new Vector(ix, iy, iz),
      new Vector(jx, jy, jz),
      new Vector(kx, ky, kz),
    );

    const basis = [
      new Vector(ix, iy, iz),
      new Vector(jx, jy, jz),
      new Vector(kx, ky, kz),
    ];

    // __DEBUG__.AddCSys(shell.csys);
    __DEBUG__.AddCSys(targetCsys);

    const tr = shell.csys.inTransformation3x3;
    basis.forEach(r => tr._apply(r));

    shell.location$.update(csys => {
      return targetCsys;
    });
    // shell.location$.mutate(csys => {
    //   csys.x = basis[0];
    //   csys.y = basis[1];
    //   csys.z = basis[2];
    //   csys.origin = new Vector(ox, oy, oz)._minus(shell.csys.origin);
    // });

  }

  applyResults(face1.shell, objects[2].params, new Vector().set3(objects[0].normal.map(p => p.get())));
  applyResults(face2.shell, objects[3].params, new Vector().set3(objects[1].normal.map(p => p.get())));


}


function rigidBodyLink3x3(csysParams, csys, vector) {
  const [ix, iy, iz, jx, jy, jz, kx, ky, kz] = csysParams;
  const [x, y, z] = vector;

  // const [nStarX, nStarY, nStarZ] = csys.inTransformation3x3.apply3(vector.map(p => p.get()));
  const [nStarX, nStarY, nStarZ] = vector.map(p => p.get());
  // out.x = this.mxx * x + this.mxy * y + this.mxz * z + this.tx;
  // out.y = this.myx * x + this.myy * y + this.myz * z + this.ty;
  // out.z = this.mzx * x + this.mzy * y + this.mzz * z + this.tz;

  return [
    new Polynomial(0)
      .monomial(-1)
      .term(x, POW_1_FN)
      .monomial(nStarX)
      .term(ix, POW_1_FN)
      .monomial(nStarY)
      .term(jx, POW_1_FN)
      .monomial(nStarZ)
      .term(kx, POW_1_FN),

    new Polynomial(0)
      .monomial(-1)
      .term(y, POW_1_FN)
      .monomial(nStarX)
      .term(iy, POW_1_FN)
      .monomial(nStarY)
      .term(jy, POW_1_FN)
      .monomial(nStarZ)
      .term(ky, POW_1_FN),

    new Polynomial(0)
      .monomial(-1)
      .term(z, POW_1_FN)
      .monomial(nStarX)
      .term(iz, POW_1_FN)
      .monomial(nStarY)
      .term(jz, POW_1_FN)
      .monomial(nStarZ)
      .term(kz, POW_1_FN),


    new Polynomial(0)
      .monomial()
        .term(ix, POW_1_FN)
        .term(jx, POW_1_FN)
      .monomial()
        .term(iy, POW_1_FN)
        .term(jy, POW_1_FN)
      .monomial()
        .term(iz, POW_1_FN)
        .term(jz, POW_1_FN),

    new Polynomial(0)
      .monomial()
      .term(ix, POW_1_FN)
      .term(kx, POW_1_FN)
      .monomial()
      .term(iy, POW_1_FN)
      .term(ky, POW_1_FN)
      .monomial()
      .term(iz, POW_1_FN)
      .term(kz, POW_1_FN),

    new Polynomial(0)
      .monomial()
      .term(jx, POW_1_FN)
      .term(kx, POW_1_FN)
      .monomial()
      .term(jy, POW_1_FN)
      .term(ky, POW_1_FN)
      .monomial()
      .term(jz, POW_1_FN)
      .term(kz, POW_1_FN),

    new Polynomial(-1)
      .monomial()
      .term(ix, POW_2_FN)
      .monomial()
      .term(iy, POW_2_FN)
      .monomial()
      .term(iz, POW_2_FN),

    new Polynomial(-1)
      .monomial()
      .term(jx, POW_2_FN)
      .monomial()
      .term(jy, POW_2_FN)
      .monomial()
      .term(jz, POW_2_FN),

    new Polynomial(-1)
      .monomial()
      .term(kx, POW_2_FN)
      .monomial()
      .term(ky, POW_2_FN)
      .monomial()
      .term(kz, POW_2_FN),


  ]
}
