package org.poly2tri.triangulation.util;

import java.util.ArrayList;
import java.util.List;

import org.poly2tri.triangulation.TriangulationPoint;
import org.poly2tri.triangulation.point.TPoint;

public class PointGenerator
{
    public static List<TriangulationPoint> uniformDistribution( int n, double scale )
    {
        ArrayList<TriangulationPoint> points = new ArrayList<TriangulationPoint>();
        for( int i=0; i<n; i++ )
        {
            points.add( new TPoint( scale*(0.5 - Math.random()), scale*(0.5 - Math.random()) ) );
        }
        return points;
    }
    
    public static List<TriangulationPoint> uniformGrid( int n, double scale )
    {
        double x=0;
        double size = scale/n;
        double halfScale = 0.5*scale;
        
        ArrayList<TriangulationPoint> points = new ArrayList<TriangulationPoint>();
        for( int i=0; i<n+1; i++ )
        {
            x =  halfScale - i*size;
            for( int j=0; j<n+1; j++ )
            {
                points.add( new TPoint( x, halfScale - j*size ) );
            }
        }
        return points;        
    }
}
