package org.poly2tri.geometry.primitives;

public abstract class Point
{
    public abstract double getX();
    public abstract double getY();
    public abstract double getZ();

    public abstract float getXf();
    public abstract float getYf();
    public abstract float getZf();
    
    public abstract void set( double x, double y, double z );

    protected static int calculateHashCode( double x, double y, double z)
    {
        int result = 17;

        final long a = Double.doubleToLongBits(x);
        result += 31 * result + (int) (a ^ (a >>> 32));

        final long b = Double.doubleToLongBits(y);
        result += 31 * result + (int) (b ^ (b >>> 32));

        final long c = Double.doubleToLongBits(z);
        result += 31 * result + (int) (c ^ (c >>> 32));

        return result;
        
    }
}
