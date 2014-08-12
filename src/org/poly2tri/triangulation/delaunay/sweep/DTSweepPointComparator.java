package org.poly2tri.triangulation.delaunay.sweep;

import java.util.Comparator;

import org.poly2tri.triangulation.TriangulationPoint;

public class DTSweepPointComparator implements Comparator<TriangulationPoint>
{
    public int compare( TriangulationPoint p1, TriangulationPoint p2 )
    {
      if(p1.getY() < p2.getY() )
      {
          return -1;
      }
      else if( p1.getY() > p2.getY())
      {
          return 1;
      }
      else 
      {
          if(p1.getX() < p2.getX())
          {
              return -1;
          }
          else if( p1.getX() > p2.getX() )
          {
              return 1;
          }
          else
          {
              return 0;
          }
      }            
    }
}
