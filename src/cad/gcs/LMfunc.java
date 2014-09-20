// LMfunc.java

package cad.gcs;

/**
 * Caller implement this interface to specify the
 * function to be minimized and its gradient.
 * 
 * Optionally return an initial guess and some test data,
 * though the LM.java only uses this in its optional main() test program.
 * Return null if these are not needed.
 */
public interface LMfunc
{

  /**
   * x is a single point, but domain may be mulidimensional
   */
  double[] val(double[] a);

  /**
   * return the kth component of the gradient df(x,a)/da_k
   */
  double[] grad(double[] a);

} //LMfunc
