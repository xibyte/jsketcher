package org.poly2tri.geometry.primitives;

public abstract class Edge<A extends Point>
{
    protected A p;
    protected A q;

    public A getP()
    {
        return p;
    }

    public A getQ()
    {
        return q;
    }
}
