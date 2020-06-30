import {COS_FN, Polynomial, POW_1_FN, POW_2_FN, SIN_FN} from "../../sketcher/constr/polynomial";
import {NoIcon} from "../../sketcher/icons/NoIcon";
import {ConstraintSchema} from "../../sketcher/constr/ANConstraints";
import {MObject} from "../model/mobject";
import {AssemblyNode} from "./assembly";
import {IconType} from "react-icons";
import Vector from "math/vector";


export const Constraints3D = {

  PlaneOppositeNormals: {
    id: 'PlaneOppositeNormals',
    name: 'Plane Opposite Normals',
    icon: NoIcon,

    defineParamsScope: ([plane1, plane2], cb) => {
      cb(plane1.theta);
      cb(plane1.phi);
      cb(plane2.theta);
      cb(plane2.phi);
    },

    collectPolynomials: (polynomials, params) => {

      const [
        theta1, phi1, theta2, phi2
      ] = params;

      // nx1, ny1, nz1, nx2, ny2, nz2

      // sin(theta) * cos(phi),
      // sin(theta) * sin(phi),
      // cos(theta),


      // const p = new Polynomial(1)
      //   .monomial()
      //     .term(theta1, SIN_FN)
      //     .term(phi1, COS_FN)
      //     .term(theta2, SIN_FN)
      //     .term(phi2, COS_FN)
      //   .monomial()
      //     .term(theta1, SIN_FN)
      //     .term(phi1, SIN_FN)
      //
      //     .term(theta2, SIN_FN)
      //     .term(phi2, SIN_FN)
      //   .monomial()
      //     .term(theta1, COS_FN)
      //     .term(theta2, COS_FN);

      // 180 - theta1
      polynomials.push(
        new Polynomial(Math.PI)
          .monomial(-1)
            .term(theta1, POW_1_FN)
          .monomial(-1)
            .term(theta2, POW_1_FN)
      );
      polynomials.push(
        new Polynomial(Math.PI)
          .monomial(1)
            .term(phi1, POW_1_FN)
          .monomial(-1)
            .term(phi2, POW_1_FN)
      );
    }
  },

  PlaneEqualDepth: {
    id: 'PlaneEqualDepth',
    name: 'Plane Equal Depth',
    icon: NoIcon,

    defineParamsScope: ([plane1, plane2], cb) => {
      cb(plane1.w);
      cb(plane2.w);
    },

    collectPolynomials: (polynomials, params) => {

      const [
        w1, w2
      ] = params;

      polynomials.push(
        new Polynomial(0)
          .monomial(1)
            .term(w1, POW_1_FN)
          .monomial()
            .term(w2, POW_1_FN)

      );
    }
  },

  UnitVectorConsistency: {
    id: 'UnitVectorConsistency',
    name: 'UnitVectorConsistency',
    icon: NoIcon,

    defineParamsScope: ([vec], cb) => {
      //don't change to generic way it can a plane
      cb(vec.x);
      cb(vec.y);
      cb(vec.z);
    },

    collectPolynomials: (polynomials, params) => {

      const [x, y, z] = params;

      polynomials.push(
        new Polynomial(-1)
          .monomial()
            .term(x, POW_2_FN)
          .monomial()
            .term(y, POW_2_FN)
          .monomial()
            .term(z, POW_2_FN)
      );
    }
  },

  CSysConsistency: {
    id: 'CSysConsistency',
    name: 'CSysConsistency',
    icon: NoIcon,

    defineParamsScope: ([csys], cb) => {
      cb(csys.ix);
      cb(csys.iy);
      cb(csys.iz);
      cb(csys.jx);
      cb(csys.jy);
      cb(csys.jz);
      cb(csys.kx);
      cb(csys.ky);
      cb(csys.kz);
    },

    collectPolynomials: (polynomials, params) => {

      const [
        ix,
        iy,
        iz,
        jx,
        jy,
        jz,
        kx,
        ky,
        kz] = params;

      //let's keep matrix orthogonal and unit basis
      polynomials.push(new Polynomial(0)
        .monomial()
        .term(ix, POW_1_FN)
        .term(jx, POW_1_FN)
        .monomial()
        .term(iy, POW_1_FN)
        .term(jy, POW_1_FN)
        .monomial()
        .term(iz, POW_1_FN)
        .term(jz, POW_1_FN));

      polynomials.push(new Polynomial(0)
        .monomial()
        .term(ix, POW_1_FN)
        .term(kx, POW_1_FN)
        .monomial()
        .term(iy, POW_1_FN)
        .term(ky, POW_1_FN)
        .monomial()
        .term(iz, POW_1_FN)
        .term(kz, POW_1_FN));

      polynomials.push(new Polynomial(0)
        .monomial()
        .term(jx, POW_1_FN)
        .term(kx, POW_1_FN)
        .monomial()
        .term(jy, POW_1_FN)
        .term(ky, POW_1_FN)
        .monomial()
        .term(jz, POW_1_FN)
        .term(kz, POW_1_FN));

      polynomials.push(new Polynomial(-1)
        .monomial()
        .term(ix, POW_2_FN)
        .monomial()
        .term(iy, POW_2_FN)
        .monomial()
        .term(iz, POW_2_FN));

      polynomials.push(new Polynomial(-1)
        .monomial()
        .term(jx, POW_2_FN)
        .monomial()
        .term(jy, POW_2_FN)
        .monomial()
        .term(jz, POW_2_FN));

      polynomials.push(new Polynomial(-1)
        .monomial()
        .term(kx, POW_2_FN)
        .monomial()
        .term(ky, POW_2_FN)
        .monomial()
        .term(kz, POW_2_FN));
    },
  },

  PlaneNormalLink: {
    id: 'PlaneNormalLink',
    name: 'Plane Normal Link',
    icon: NoIcon,

    defineParamsScope: ([location, plane], cb) => {
      cb(location.alpha);
      cb(location.beta);
      cb(location.gamma);

      cb(plane.theta);
      cb(plane.phi);


    },

    collectPolynomials: (polynomials, params, _, objects) => {
      const [csys, plane] = objects;

      const {x: nStarX, y: nStarY, z: nStarZ} = plane.getNormal();

      const [alpha, beta, gamma, theta, phi] = params;

      // return new Vector(
      //   Math.sin(theta) * Math.cos(phi),
      //   Math.sin(theta) * Math.sin(phi),
      //   Math.cos(theta),
      // )

      // out.x = this.mxx * x + this.mxy * y + this.mxz * z + this.tx;
      // out.y = this.myx * x + this.myy * y + this.myz * z + this.ty;
      // out.z = this.mzx * x + this.mzy * y + this.mzz * z + this.tz;

      // cos(alpha)*cos(beta), cos(alpha)*sin(beta)*sin(gamma) - sin(alpha)*cos(gamma), cos(alpha)*sin(beta)*cos(gamma) + sin(alpha)*sin(gamma),
      // sin(alpha)*cos(beta), sin(alpha)*sin(beta)*sin(gamma) + cos(alpha)*cos(gamma), sin(alpha)*sin(beta)*cos(gamma) - cos(alpha)*sin(gamma),
      // -sin(beta), cos(beta)*sin(gamma), cos(beta)*cos(gamma)

      polynomials.push(
        new Polynomial(0)
          .monomial(-1)
            .term(theta, SIN_FN)
            .term(phi, COS_FN)
          .monomial(nStarX)
            .term(alpha, COS_FN)
            .term(beta, COS_FN)

          .monomial(nStarY)
            .term(alpha, COS_FN)
            .term(beta,  SIN_FN)
            .term(gamma, SIN_FN)

          .monomial(-nStarY)
            .term(alpha, SIN_FN)
            .term(gamma, COS_FN)

          .monomial(nStarZ)
            .term(alpha, COS_FN)
            .term(beta,  SIN_FN)
            .term(gamma, COS_FN)

          .monomial(nStarZ)
            .term(alpha,  SIN_FN)
            .term(gamma,  SIN_FN)

      );

      // sin(alpha)*cos(beta), sin(alpha)*sin(beta)*sin(gamma) + cos(alpha)*cos(gamma), sin(alpha)*sin(beta)*cos(gamma) - cos(alpha)*sin(gamma),
      //   Math.sin(theta) * Math.sin(phi),

      polynomials.push(
        new Polynomial(0)
          .monomial(-1)
            .term(theta, SIN_FN)
            .term(phi, SIN_FN)

          .monomial(nStarX)
            .term(alpha, SIN_FN)
            .term(beta, COS_FN)

          .monomial(nStarY)
            .term(alpha, SIN_FN)
            .term(beta,  SIN_FN)
            .term(gamma, SIN_FN)

          .monomial(nStarY)
            .term(alpha, COS_FN)
            .term(gamma, COS_FN)

          .monomial(nStarZ)
            .term(alpha, SIN_FN)
            .term(beta,  SIN_FN)
            .term(gamma, COS_FN)

          .monomial(-nStarZ)
            .term(alpha,  COS_FN)
            .term(gamma,  SIN_FN)

      );

      // -sin(beta), cos(beta)*sin(gamma), cos(beta)*cos(gamma)

      polynomials.push(
        new Polynomial(0)
          .monomial(-1)
            .term(theta, COS_FN)

          .monomial(-nStarX)
            .term(beta, SIN_FN)

          .monomial(nStarY)
            .term(beta,  COS_FN)
            .term(gamma, SIN_FN)

          .monomial(nStarZ)
            .term(beta,  COS_FN)
            .term(gamma, COS_FN)
      );

    }

  },

  PlaneDepthLink: {
    id: 'PlaneDepthLink',
    name: 'PlaneDepthLink',
    icon: NoIcon,

    defineParamsScope: ([location, plane], cb) => {
      cb(location.dx);
      cb(location.dy);
      cb(location.dz);
      cb(plane.w);
    },

    collectPolynomials: (polynomials, params, _, objects) => {
      const [location, plane] = objects;
      const [ox, oy, oz, w] = params;
      const {x: xP, y: yP, z: zP} = plane.toNormalVector();

      // __DEBUG__.AddNormal()

      const {x: nStarX, y: nStarY, z: nStarZ} = plane.getNormal();
      const nStarW = plane.getDepth();

      const pStar = plane.getNormal().multiply(nStarW);
      const p0 = location.rotationMatrix().apply(pStar);
      const w0 = p0.length();

      // out.x = this.mxx * x + this.mxy * y + this.mxz * z + this.tx;
      // out.y = this.myx * x + this.myy * y + this.myz * z + this.ty;
      // out.z = this.mzx * x + this.mzy * y + this.mzz * z + this.tz;

      polynomials.push(
        new Polynomial(-xP * w0)
            .monomial(xP)
          .term(w, POW_1_FN)
            .monomial(-1)
          .term(ox, POW_1_FN)
      );

      polynomials.push(
        new Polynomial(-yP * w0)
          .monomial(yP)
            .term(w, POW_1_FN)
          .monomial(-1)
            .term(oy, POW_1_FN)

      );

      polynomials.push(
        new Polynomial(-zP * w0)
          .monomial(zP)
            .term(w, POW_1_FN)
          .monomial(-1)
            .term(oz, POW_1_FN)
      );

    }
  },

  RigidBodyLink3x3: {
    id: 'RigidBodyLink3x3',
    name: 'RigidBodyLink3x3',
    icon: NoIcon,

    defineParamsScope: ([csys, vec], cb) => {
      cb(csys.ix);
      cb(csys.iy);
      cb(csys.iz);
      cb(csys.jx);
      cb(csys.jy);
      cb(csys.jz);
      cb(csys.kx);
      cb(csys.ky);
      cb(csys.kz);
      cb(vec.x);
      cb(vec.y);
      cb(vec.z);
    },

    collectPolynomials: (polynomials, params, _, objects) => {
      const [csys, vec] = objects;

      const {x: nStarX, y: nStarY, z: nStarZ} = vec.getVector();

      const [ix, iy, iz, jx, jy, jz, kx, ky, kz, x, y, z] = params;

      // out.x = this.mxx * x + this.mxy * y + this.mxz * z + this.tx;
      // out.y = this.myx * x + this.myy * y + this.myz * z + this.ty;
      // out.z = this.mzx * x + this.mzy * y + this.mzz * z + this.tz;

      polynomials.push(
        new Polynomial(0)
          .monomial(-1)
            .term(x, POW_1_FN)
          .monomial(nStarX)
            .term(ix, POW_1_FN)
          .monomial(nStarY)
            .term(jx, POW_1_FN)
          .monomial(nStarZ)
            .term(kx, POW_1_FN)
      );

      polynomials.push(
        new Polynomial(0)
          .monomial(-1)
            .term(y, POW_1_FN)
          .monomial(nStarX)
            .term(iy, POW_1_FN)
          .monomial(nStarY)
            .term(jy, POW_1_FN)
          .monomial(nStarZ)
            .term(ky, POW_1_FN),

      );

      polynomials.push(
        new Polynomial(0)
          .monomial(-1)
            .term(z, POW_1_FN)
          .monomial(nStarX)
            .term(iz, POW_1_FN)
          .monomial(nStarY)
            .term(jz, POW_1_FN)
          .monomial(nStarZ)
            .term(kz, POW_1_FN)
      );

    }
  },

  RigidBodyLink4x4: {
    id: 'RigidBodyLink4x4',
    name: 'RigidBodyLink4x4',
    icon: NoIcon,

    defineParamsScope: ([csys, vec], cb) => {
      cb(csys.ox);
      cb(csys.oy);
      cb(csys.oz);
      cb(csys.ix);
      cb(csys.iy);
      cb(csys.iz);
      cb(csys.jx);
      cb(csys.jy);
      cb(csys.jz);
      cb(csys.kx);
      cb(csys.ky);
      cb(csys.kz);
      vec.visitParams(cb);
    },

    collectPolynomials: (polynomials, params, _, objects) => {
      const [csys, vec] = objects;

      const {x: xStar, y: yStar, z: zStar} = vec.getVector();

      const [ox, oy, oz, ix, iy, iz, jx, jy, jz, kx, ky, kz, x, y, z] = params;

      // out.x = this.mxx * x + this.mxy * y + this.mxz * z + this.tx;
      // out.y = this.myx * x + this.myy * y + this.myz * z + this.ty;
      // out.z = this.mzx * x + this.mzy * y + this.mzz * z + this.tz;

      polynomials.push(
        new Polynomial(0)
          .monomial(-1)
            .term(x, POW_1_FN)
          .monomial(xStar)
            .term(ix, POW_1_FN)
          .monomial(yStar)
            .term(jx, POW_1_FN)
          .monomial(zStar)
            .term(kx, POW_1_FN)
          .monomial()
            .term(ox, POW_1_FN)

      );

      polynomials.push(
        new Polynomial(0)
          .monomial(-1)
            .term(y, POW_1_FN)
          .monomial(xStar)
            .term(iy, POW_1_FN)
          .monomial(yStar)
            .term(jy, POW_1_FN)
          .monomial(zStar)
            .term(ky, POW_1_FN)
          .monomial()
            .term(oy, POW_1_FN)


      );

      polynomials.push(
        new Polynomial(0)
          .monomial(-1)
            .term(z, POW_1_FN)
          .monomial(xStar)
            .term(iz, POW_1_FN)
          .monomial(yStar)
            .term(jz, POW_1_FN)
          .monomial(zStar)
            .term(kz, POW_1_FN)
          .monomial()
            .term(oz, POW_1_FN)

      );

    }
  },
};


export const AssemblyConstraints: {
  [key: string]: AssemblyConstraintSchema
} = {

  FaceToFace: {
    id: 'FaceToFace',
    name: 'Face To Face',
    icon: NoIcon,

    selectionMatcher: {
      selector: 'matchAll',
      types: ['face'],
      minQuantity: 2
    },

    defineAssemblyScope: ([face1, face2]) => {

      return [
        face1.assemblyNodes.plane,
        face2.assemblyNodes.plane,
      ];
    },

    orientation: ([plane1, plane2]) => {

      return new OrientationConstraint(plane1.);

    },

    translation: Constraints3D.PlaneEqualDepth,

  }

};

export class OrientationConstraint {

  vecA: Vector;
  vecB: Vector;

  constructor(vecA: Vector, vecB: Vector) {
    this.vecA = vecA;
    this.vecB = vecB;
  }

}

export interface AssemblyConstraintSchema {

  id: string,
  name: string,
  icon?: IconType,

  selectionMatcher?: {
    selector: string,
    types: any[],
    minQuantity: number
  };

  defineAssemblyScope: (objects: MObject[]) => AssemblyNode[];

  orientation: (objects: AssemblyNode[]) => OrientationConstraint,
  translation: ConstraintSchema,

}

