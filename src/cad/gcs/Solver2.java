package cad.gcs;

import java.util.List;

public class Solver2 {

  double pertMag            = 1e-6;
  double pertMin            = 1e-10;
  double XconvergenceRough  = 1e-8;
  double XconvergenceFine   = 1e-10;
  double smallF             = 1e-20;
  double validSolutionFine  = 1e-12;
  double validSoltuionRough = 1e-4;
  double rough              = 0;
  double fine               = 1;
  double MaxIterations      = 50 ;

  int succsess = 0;
  int noSolution = 1;
  
//  int solve(double x, int xLength, List<Constraint> cons, int isFine)
//  {
//    std::stringstream cstr;
//    double convergence,pert ;
//    //Save the original parameters for later.
//    double *origSolution = new double[xLength];
//    for(int i=0;i<xLength;i++)
//    {
//      origSolution[i]=*x[i];
//    }
//
//    if(isFine>0) convergence = XconvergenceFine;
//    else convergence = XconvergenceRough;
//    //integer to keep track of how many times calc is called
//    int ftimes=0;
//    //Calculate Function at the starting point:
//    double f0;
//    f0 = calc(cons,consLength);
//    if(f0<smallF) return succsess;
//    ftimes++;
//    //Calculate the gradient at the starting point:
//
//    //Calculate the gradient
//    //gradF=x;
//    double *grad = new double[xLength]; //The gradient vector (1xn)
//    double norm,first,second,temper; //The norm of the gradient vector
//    double f1,f2,f3,alpha1,alpha2,alpha3,alphaStar;
//    norm = 0;
//    pert = f0*pertMag;
//    for(int j=0;j<xLength;j++)
//    {
//      temper= *x[j];
//      *x[j]= temper-pert;
//      first = calc(cons,consLength);
//      *x[j]= temper+pert;
//      second = calc(cons,consLength);
//      grad[j]=.5*(second-first)/pert;
//      ftimes++;
//      #ifdef DEBUG
//      cstr << "gradient: " << grad[j];
//      debugprint(cstr.str());
//      cstr.clear();
//      #endif
//            *x[j]=temper;
//      norm = norm+(grad[j]*grad[j]);
//    }
//    norm = sqrt(norm);
//    //Estimate the norm of N
//
//    //Initialize N and calculate s
//    double *s = new double[xLength]; //The current search direction
//    double **N = new double*[xLength];
//    for(int i=0; i < xLength; i++)
//      N[i] = new double[xLength]; //The estimate of the Hessian inverse
//    for(int i=0;i<xLength;i++)
//    {
//      for(int j=0;j<xLength;j++)
//      {
//        if(i==j)
//        {
//          //N[i][j]=norm; //Calculate a scaled identity matrix as a Hessian inverse estimate
//          //N[i][j]=grad[i]/(norm+.001);
//          N[i][j]=1;
//          s[i]=-grad[i]; //Calculate the initial search vector
//
//        }
//        else N[i][j]=0;
//      }
//    }
//    double fnew;
//    fnew=f0+1;      //make fnew greater than fold
//    double alpha=1; //Initial search vector multiplier
//
//    double *xold = new double[xLength]; //Storage for the previous design variables
//    double fold;
//    for(int i=0;i<xLength;i++)
//    {
//      xold[i]=*x[i];//Copy last values to xold
//    }
//
//    ///////////////////////////////////////////////////////
//    /// Start of line search
//    ///////////////////////////////////////////////////////
//
//    //Make the initial position alpha1
//    alpha1=0;
//    f1 = f0;
//
//    //Take a step of alpha=1 as alpha2
//    alpha2=1;
//    for(int i=0;i<xLength;i++)
//    {
//      *x[i]=xold[i]+alpha2*s[i];//calculate the new x
//    }
//    f2 = calc(cons,consLength);
//    ftimes++;
//
//    //Take a step of alpha 3 that is 2*alpha2
//    alpha3 = alpha*2;
//    for(int i=0;i<xLength;i++)
//    {
//      *x[i]=xold[i]+alpha3*s[i];//calculate the new x
//    }
//    f3=calc(cons,consLength);
//    ftimes++;
//
//    //Now reduce or lengthen alpha2 and alpha3 until the minimum is
//    //Bracketed by the triplet f1>f2<f3
//    while(f2>f1 || f2>f3)
//    {
//      if(f2>f1)
//      {
//        //If f2 is greater than f1 then we shorten alpha2 and alpha3 closer to f1
//        //Effectively both are shortened by a factor of two.
//        alpha3=alpha2;
//        f3=f2;
//        alpha2=alpha2/2;
//        for(int i=0;i<xLength;i++)
//        {
//          *x[i]=xold[i]+alpha2*s[i];//calculate the new x
//        }
//        f2=calc(cons,consLength);
//        ftimes++;
//      }
//
//      else if(f2>f3)
//      {
//        //If f2 is greater than f3 then we length alpah2 and alpha3 closer to f1
//        //Effectively both are lengthened by a factor of two.
//        alpha2=alpha3;
//        f2=f3;
//        alpha3=alpha3*2;
//        for(int i=0;i<xLength;i++)
//        {
//          *x[i]=xold[i]+alpha3*s[i];//calculate the new x
//        }
//        f3=calc(cons,consLength);
//        ftimes++;
//
//      }
//    }
//    // get the alpha for the minimum f of the quadratic approximation
//    alphaStar= alpha2+((alpha2-alpha1)*(f1-f3))/(3*(f1-2*f2+f3));
//
//    //Guarantee that the new alphaStar is within the bracket
//    if(alphaStar>alpha3 || alphaStar<alpha1) alphaStar=alpha2;
//
//    if(alphaStar!=alphaStar)
//    {
//      alphaStar=.001;//Fix nan problem
//    }
//    /// Set the values to alphaStar
//    for(int i=0;i<xLength;i++)
//    {
//      *x[i]=xold[i]+alphaStar*s[i];//calculate the new x
//    }
//    fnew=calc(cons,consLength);
//    ftimes++;
//    fold=fnew;
//        /*
//        cout<<"F at alphaStar: "<<fnew<<endl;
//        cout<<"alphaStar: "<<alphaStar<<endl;
//        cout<<"F0: "<<f0<<endl;
//        cout<<"F1: "<<f1<<endl;
//        cout<<"F2: "<<f2<<endl;
//        cout<<"F3: "<<f3<<endl;
//        cout<<"Alpha1: "<<alpha1<<endl;
//        cout<<"Alpha2: "<<alpha2<<endl;
//        cout<<"Alpha3: "<<alpha3<<endl;
//        */
//
//    /////////////////////////////////////
//    ///end of line search
//    /////////////////////////////////////
//
//
//
//
//
//
//    double *deltaX = new double[xLength];
//    double *gradnew = new double[xLength];
//    double *gamma = new double[xLength];
//    double bottom=0;
//    double deltaXtDotGamma;
//    double *gammatDotN = new double[xLength];
//    double gammatDotNDotGamma=0;
//    double firstTerm=0;
//    double **FirstSecond = new double*[xLength];
//    double **deltaXDotGammatDotN = new double*[xLength];
//    double **gammatDotDeltaXt = new double*[xLength];
//    double **NDotGammaDotDeltaXt = new double*[xLength];
//    for(int i=0; i < xLength; i++)
//    {
//      FirstSecond[i] = new double[xLength];
//      deltaXDotGammatDotN[i] = new double[xLength];
//      gammatDotDeltaXt[i] = new double[xLength];
//      NDotGammaDotDeltaXt[i] = new double[xLength];
//    }
//    double deltaXnorm=1;
//
//    int iterations=1;
//    int steps;
//
//    ///Calculate deltaX
//    for(int i=0;i<xLength;i++)
//    {
//      deltaX[i]=*x[i]-xold[i];//Calculate the difference in x for the Hessian update
//    }
//    double maxIterNumber = MaxIterations * xLength;
//    while(deltaXnorm>convergence && fnew>smallF && iterations<maxIterNumber)
//    {
//      //////////////////////////////////////////////////////////////////////
//      ///Start of main loop!!!!
//      //////////////////////////////////////////////////////////////////////
//      bottom=0;
//      deltaXtDotGamma = 0;
//      pert = fnew*pertMag;
//      if(pert<pertMin) pert = pertMin;
//      for(int i=0;i<xLength;i++)
//      {
//        //Calculate the new gradient vector
//        temper=*x[i];
//        *x[i]=temper-pert;
//        first = calc(cons,consLength);
//        *x[i]=temper+pert;
//        second= calc(cons,consLength);
//        gradnew[i]=.5*(second-first)/pert;
//        ftimes++;
//        *x[i]=temper;
//        //Calculate the change in the gradient
//        gamma[i]=gradnew[i]-grad[i];
//        bottom+=deltaX[i]*gamma[i];
//
//        deltaXtDotGamma += deltaX[i]*gamma[i];
//
//      }
//
//      //make sure that bottom is never 0
//      if (bottom==0) bottom=.0000000001;
//
//      //calculate all (1xn).(nxn)
//
//      for(int i=0;i<xLength;i++)
//      {
//        gammatDotN[i]=0;
//        for(int j=0;j<xLength;j++)
//        {
//          gammatDotN[i]+=gamma[j]*N[i][j];//This is gammatDotN transpose
//        }
//
//      }
//      //calculate all (1xn).(nx1)
//
//      gammatDotNDotGamma=0;
//      for(int i=0;i<xLength;i++)
//      {
//        gammatDotNDotGamma+=gammatDotN[i]*gamma[i];
//      }
//
//      //Calculate the first term
//
//      firstTerm=0;
//      firstTerm=1+gammatDotNDotGamma/bottom;
//
//      //Calculate all (nx1).(1xn) matrices
//      for(int i=0;i<xLength;i++)
//      {
//        for(int j=0;j<xLength;j++)
//        {
//          FirstSecond[i][j]=((deltaX[j]*deltaX[i])/bottom)*firstTerm;
//          deltaXDotGammatDotN[i][j]=deltaX[i]*gammatDotN[j];
//          gammatDotDeltaXt[i][j]=gamma[i]*deltaX[j];
//        }
//      }
//
//      //Calculate all (nxn).(nxn) matrices
//
//      for(int i=0;i<xLength;i++)
//      {
//        for(int j=0;j<xLength;j++)
//        {
//          NDotGammaDotDeltaXt[i][j]=0;
//          for(int k=0;k<xLength;k++)
//          {
//            NDotGammaDotDeltaXt[i][j]+=N[i][k]*gammatDotDeltaXt[k][j];
//          }
//        }
//      }
//      //Now calculate the BFGS update on N
//      //cout<<"N:"<<endl;
//      for(int i=0;i<xLength;i++)
//      {
//
//        for(int j=0;j<xLength;j++)
//        {
//          N[i][j]=N[i][j]+FirstSecond[i][j]-(deltaXDotGammatDotN[i][j]+NDotGammaDotDeltaXt[i][j])/bottom;
//          //cout<<" "<<N[i][j]<<" ";
//        }
//        //cout<<endl;
//      }
//
//      //Calculate s
//      for(int i=0;i<xLength;i++)
//      {
//        s[i]=0;
//        for(int j=0;j<xLength;j++)
//        {
//          s[i]+=-N[i][j]*gradnew[j];
//        }
//      }
//
//      alpha=1; //Initial search vector multiplier
//
//
//      //copy newest values to the xold
//      for(int i=0;i<xLength;i++)
//      {
//        xold[i]=*x[i];//Copy last values to xold
//      }
//      steps=0;
//
//      ///////////////////////////////////////////////////////
//      /// Start of line search
//      ///////////////////////////////////////////////////////
//
//      //Make the initial position alpha1
//      alpha1=0;
//      f1 = fnew;
//
//      //Take a step of alpha=1 as alpha2
//      alpha2=1;
//      for(int i=0;i<xLength;i++)
//      {
//        *x[i]=xold[i]+alpha2*s[i];//calculate the new x
//      }
//      f2 = calc(cons,consLength);
//      ftimes++;
//
//      //Take a step of alpha 3 that is 2*alpha2
//      alpha3 = alpha2*2;
//      for(int i=0;i<xLength;i++)
//      {
//        *x[i]=xold[i]+alpha3*s[i];//calculate the new x
//      }
//      f3=calc(cons,consLength);
//      ftimes++;
//
//      //Now reduce or lengthen alpha2 and alpha3 until the minimum is
//      //Bracketed by the triplet f1>f2<f3
//      steps=0;
//      while(f2>f1 || f2>f3)
//      {
//        if(f2>f1)
//        {
//          //If f2 is greater than f1 then we shorten alpha2 and alpha3 closer to f1
//          //Effectively both are shortened by a factor of two.
//          alpha3=alpha2;
//          f3=f2;
//          alpha2=alpha2/2;
//          for(int i=0;i<xLength;i++)
//          {
//            *x[i]=xold[i]+alpha2*s[i];//calculate the new x
//          }
//          f2=calc(cons,consLength);
//          ftimes++;
//        }
//
//        else if(f2>f3)
//        {
//          //If f2 is greater than f3 then we length alpah2 and alpha3 closer to f1
//          //Effectively both are lengthened by a factor of two.
//          alpha2=alpha3;
//          f2=f3;
//          alpha3=alpha3*2;
//          for(int i=0;i<xLength;i++)
//          {
//            *x[i]=xold[i]+alpha3*s[i];//calculate the new x
//          }
//          f3=calc(cons,consLength);
//          ftimes++;
//        }
//                /* this should be deleted soon!!!!
//                if(steps==-4)
//                        {
//                                alpha2=1;
//                                alpha3=2;
//
//                                for(int i=0;i<xLength;i++)
//                                {
//                                        for(int j=0;j<xLength;j++)
//                                        {
//                                                if(i==j)
//                                                {
//                                                        N[i][j]=1;
//                                                        s[i]=-gradnew[i]; //Calculate the initial search vector
//                                                }
//                                                else N[i][j]=0;
//                                        }
//                                }
//                        }
//                */
//                /*
//                if(steps>100)
//                        {
//                        continue;
//                        }
//                */
//        steps=steps+1;
//      }
//
//      // get the alpha for the minimum f of the quadratic approximation
//      alphaStar= alpha2+((alpha2-alpha1)*(f1-f3))/(3*(f1-2*f2+f3));
//
//
//      //Guarantee that the new alphaStar is within the bracket
//      if(alphaStar>=alpha3 || alphaStar<=alpha1)
//      {
//        alphaStar=alpha2;
//      }
//      if(alphaStar!=alphaStar) alphaStar=0;
//
//      /// Set the values to alphaStar
//      for(int i=0;i<xLength;i++)
//      {
//        *x[i]=xold[i]+alphaStar*s[i];//calculate the new x
//      }
//      fnew=calc(cons,consLength);
//      ftimes++;
//
//        /*
//        cout<<"F at alphaStar: "<<fnew<<endl;
//        cout<<"alphaStar: "<<alphaStar<<endl;
//        cout<<"F1: "<<f1<<endl;
//        cout<<"F2: "<<f2<<endl;
//        cout<<"F3: "<<f3<<endl;
//        cout<<"Alpha1: "<<alpha1<<endl;
//        cout<<"Alpha2: "<<alpha2<<endl;
//        cout<<"Alpha3: "<<alpha3<<endl;
//        */
//
//      /////////////////////////////////////
//      ///end of line search
//      ////////////////////////////////////
//
//      deltaXnorm=0;
//      for(int i=0;i<xLength;i++)
//      {
//        deltaX[i]=*x[i]-xold[i];//Calculate the difference in x for the hessian update
//        deltaXnorm+=deltaX[i]*deltaX[i];
//        grad[i]=gradnew[i];
//      }
//      deltaXnorm=sqrt(deltaXnorm);
//      iterations++;
//      /////////////////////////////////////////////////////////////
//      ///End of Main loop
//      /////////////////////////////////////////////////////////////
//    }
//    ////Debug
//
//
//    #ifdef DEBUG
//
//    for(int i=0;i<xLength;i++)
//    {
//      cstr<<"Parameter("<<i<<"): "<<*(x[i])<<endl;
//      //cout<<xold[i]<<endl;
//    }
//    cstr<<"Fnew: "<<fnew<<endl;
//    cstr<<"Number of Iterations: "<<iterations<<endl;
//    cstr<<"Number of function calls: "<<ftimes<<endl;
//    debugprint(cstr.str());
//    cstr.clear();
//
//    #endif
//
//    delete s;
//    for(int i=0; i < xLength; i++)
//    {
//      delete N[i];
//      delete FirstSecond[i];
//      delete deltaXDotGammatDotN[i];
//      delete gammatDotDeltaXt[i];
//      delete NDotGammaDotDeltaXt[i];
//
//    }
//    delete N;
//    delete FirstSecond;
//    delete deltaXDotGammatDotN;
//    delete gammatDotDeltaXt;
//    delete NDotGammaDotDeltaXt;
//    delete origSolution;
//
//    delete grad;
//    delete xold;
//    delete gammatDotN;
//
//    ///End of function
//    double validSolution;
//    if(isFine==1) validSolution=validSolutionFine;
//    else validSolution=validSoltuionRough;
//    if(fnew<validSolution)
//    {
//      return succsess;
//    }
//    else
//    {
//
//      //Replace the bad numbers with the last result
//      for(int i=0;i<xLength;i++)
//      {
//        *x[i]=origSolution[i];
//      }
//      return noSolution;
//    }
//
//  }
//
//

}
