package org.poly2tri.transform.coordinate;

import java.util.List;

import org.poly2tri.geometry.primitives.Point;

public abstract class Matrix3Transform implements CoordinateTransform
{
    protected double m00,m01,m02,m10,m11,m12,m20,m21,m22;

    public void transform( Point p, Point store )
    {
        final double px = p.getX();
        final double py = p.getY();
        final double pz = p.getZ();
        store.set(m00 * px + m01 * py + m02 * pz,
                  m10 * px + m11 * py + m12 * pz,
                  m20 * px + m21 * py + m22 * pz );
    }

    public void transform( Point p )
    {
        final double px = p.getX();
        final double py = p.getY();
        final double pz = p.getZ();
        p.set(m00 * px + m01 * py + m02 * pz,
              m10 * px + m11 * py + m12 * pz,
              m20 * px + m21 * py + m22 * pz );
    }

    public void transform( List<? extends Point> list )
    {
        for( Point p : list )
        {
            transform( p );
        }
    }
}
