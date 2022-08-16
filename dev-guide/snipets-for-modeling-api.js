//Make a pipe------------------------------------------------------------------------------------------------------
{
  const ctx = __CAD_APP;
  const {commandInterface: oci, io} = ctx.occService;
  oci.beziercurve("spine", "4",
    "0", "0", "0",
    "10", "0", "0",
    "10", "10", "0",
    "40", "10", "0",
    "80", "60", "60"
  );
  oci.mkedge("spine", "spine");
  oci.wire("spine", "spine");
  oci.circle("profile", "0", "0", "0", "1", "0", "0", "2");
  oci.mkedge("profile", "profile");
  oci.wire("profile", "profile");
  oci.mkplane("profile", "profile");
  oci.pipe("p", "spine", "profile");

  ctx.services.exposure.addOnScene(io.getShell("p"));
}


//Doing a sweep ---------------------------------------------------------------------------------------------------
{
  const ctx = __CAD_APP;
  const {commandInterface: oci, io} = ctx.occService;

  oci.beziercurve("p", "4",
    "0", "0", "0",
    "10", "0", "0",
    "20", "10", "0",
    "20", "10", "0");
  oci.mkedge("p", "p");
  oci.wire("p", "p");

//oci.circle("c","0","0","0","1","0","0","0.2")
  oci.polyline("c",
    "0", "0", "0",
    "0", "0", "1",
    "0", "2", "2",
    "0", "1", "0",
    "0", "0", "0");

  oci.wire("w", "c");


//does not seem to work if I convert the profile in to a plane.
//Need to figure this out to get a body and not just surfaces. 
//oci.mkplane("w", "w")

  oci.mksweep("p");

  oci.addsweep("w");

  oci.buildsweep("r", "-S");
  ctx.services.exposure.addOnScene(io.getShell("r"));
}

//Revolve ------------------------------------------------------------------------------------------------------
{
  const ctx = __CAD_APP;
  const {commandInterface: oci, io} = ctx.occService;


  oci.polyline("p", "0", "0", "0", "1", "0", "0", "1", "2", "0", "0", "1", "0", "0", "0", "0");
  oci.mkplane("p", "p"); //make the input in to a face first so that we get capped ends
  oci.revol("r", "p", "3", "0", "0", "0", "1", "0", "280");


  ctx.services.exposure.addOnScene(io.getShell("r"));
}

//fillet -------------------------------------------------------------------------------------------------------
{
  const ctx = __CAD_APP;
  const {commandInterface: oci, io} = ctx.occService;

  oci.box("b", "20", "20", "20");
  oci.explode("b", "e");
  oci.blend("b", "b", "5", "b_2");


  ctx.services.exposure.addOnScene(io.getShell("b"));
}

//champher ----------------------------------------------------------------------------------------------------
{
  const ctx = __CAD_APP;
  const {commandInterface: oci, io} = ctx.occService;

  oci.box("b", "1", "2", "3");
  oci.explode("b", "e");
  const bla = ["ch", "b", "b_1", "0.2", "b_2", "0.2"];
  oci.chamf.call(bla);

  ctx.services.exposure.addOnScene(io.getShell("ch"));
}

//shell -------------------------------------------------------------------------------------------------------
{
  const ctx = __CAD_APP;
  const {commandInterface: oci, io} = ctx.occService;

  oci.box("b", "10", "20", "30");

  oci.explode("b", "f")
  oci.offsetshape("body", "b", "-1", "1.e-3", "b_2", "b_3")

  ctx.services.exposure.addOnScene(io.getShell("body"));
}

//loft --------------------------------------------------------------------------------------------------------
{
  const ctx = __CAD_APP;
  const {commandInterface: oci, io} = ctx.occService;

  oci.polyline("w1",
    "0", "0", "0",
    "5", "0", "0",
    "5", "5", "0",
    "2", "3", "0",
    "0", "0", "0",
  );
  oci.polyline("w2",
    "0", "1", "3",
    "4", "1", "3",
    "4", "4", "3",
    "1", "3", "3",
    "0", "1", "3",
  );
  oci.polyline("w3",
    "0", "0", "5",
    "5", "0", "5",
    "5", "5", "5",
    "2", "3", "5",
    "0", "0", "5",
  );
//# create the shape 


  oci.thrusections("th", "issolid", "isruled", "w1", "w2", "w3");


  ctx.services.exposure.addOnScene(io.getShell("th"));
}

//Boolean operations ---------------------------------------------------------------------
{
  const ctx = __CAD_APP;
  const {commandInterface: oci, io} = ctx.occService;

  oci.box("b1", "10", "10", "10");
  oci.psphere("sp", "5");


  oci.bop("b1", "sp");
  oci.bopcommon("result");
//oci.bopfuse("result");
//oci.bopcut("result");

  ctx.services.exposure.addOnScene(io.getShell("result"));
}