package org.poly2tri.transform.coordinate;

import java.util.List;

import org.poly2tri.geometry.primitives.Point;

public class NoTransform implements CoordinateTransform
{
    public void transform( Point p, Point store )
    {
        store.set( p.getX(), p.getY(), p.getZ() );
    }

    public void transform( Point p )
    {
    }

    public void transform( List<? extends Point> list )
    {
    }
}
