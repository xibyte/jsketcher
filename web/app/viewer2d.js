TCAD.Viewer2D = function(canvas) {

  function updateSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
//  window.addEventListener( 'resize', updateSize, false );
  updateSize();

  this.ctx = canvas.getContext("2d");

  this.ctx.fillStyle = "#FF0000"
  this.ctx.fillRect(400, 500, 100, 100)

}