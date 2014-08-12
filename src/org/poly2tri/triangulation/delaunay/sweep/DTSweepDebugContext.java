package org.poly2tri.triangulation.delaunay.sweep;

import org.poly2tri.triangulation.TriangulationContext;
import org.poly2tri.triangulation.TriangulationDebugContext;
import org.poly2tri.triangulation.TriangulationPoint;
import org.poly2tri.triangulation.delaunay.DelaunayTriangle;

public class DTSweepDebugContext extends TriangulationDebugContext
{
    /*
     * Fields used for visual representation of current triangulation
     */
    protected DelaunayTriangle _primaryTriangle;
    protected DelaunayTriangle _secondaryTriangle;
    protected TriangulationPoint _activePoint;
    protected AdvancingFrontNode _activeNode;
    protected DTSweepConstraint _activeConstraint;   
        
    public DTSweepDebugContext( DTSweepContext tcx )
    {
        super( tcx );
    }
    
    public boolean isDebugContext()
    {
        return true;
    }

    //  private Tuple2<TPoint,Double> m_circumCircle = new Tuple2<TPoint,Double>( new TPoint(), new Double(0) );
//  public Tuple2<TPoint,Double> getCircumCircle() { return m_circumCircle; }
    public DelaunayTriangle getPrimaryTriangle()
    {
        return _primaryTriangle;
    }

    public DelaunayTriangle getSecondaryTriangle()
    {
        return _secondaryTriangle;
    }
    
    public AdvancingFrontNode getActiveNode()
    {
        return _activeNode;
    }

    public DTSweepConstraint getActiveConstraint()
    {
        return _activeConstraint;
    }

    public TriangulationPoint getActivePoint()
    {
        return _activePoint;
    }

    public void setPrimaryTriangle( DelaunayTriangle triangle )
    {
        _primaryTriangle = triangle;        
        _tcx.update("setPrimaryTriangle");
    }

    public void setSecondaryTriangle( DelaunayTriangle triangle )
    {
        _secondaryTriangle = triangle;        
        _tcx.update("setSecondaryTriangle");
    }
    
    public void setActivePoint( TriangulationPoint point )
    {
        _activePoint = point;        
    }

    public void setActiveConstraint( DTSweepConstraint e )
    {
        _activeConstraint = e;
        _tcx.update("setWorkingSegment");
    }

    public void setActiveNode( AdvancingFrontNode node )
    {
        _activeNode = node;        
        _tcx.update("setWorkingNode");
    }

    @Override
    public void clear()
    {
        _primaryTriangle = null;
        _secondaryTriangle = null;
        _activePoint = null;
        _activeNode = null;
        _activeConstraint = null;   
    }
        
//  public void setWorkingCircumCircle( TPoint point, TPoint point2, TPoint point3 )
//  {
//          double dx,dy;
//          
//          CircleXY.circumCenter( point, point2, point3, m_circumCircle.a );
//          dx = m_circumCircle.a.getX()-point.getX();
//          dy = m_circumCircle.a.getY()-point.getY();
//          m_circumCircle.b = Double.valueOf( Math.sqrt( dx*dx + dy*dy ) );
//          
//  }
}
