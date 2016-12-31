var showThesketches = 0
function showsketches(cb) {
  showThesketches = cb.checked;
  updatelistbox();
}


function updatelistbox()
{
  document.getElementById("filelist").options.length = 0;
  for(var i in localStorage)
  {
      console.log(localStorage[i]);
  }

  //test for firefox 3.6 see if it works
  //with this way of iterating it
  for(var i=0, len=localStorage.length; i<len; i++) {
      var key = localStorage.key(i);
      var value = localStorage[key];
      console.log(key + " => " + value);



      if (localStorage.key(i).search("sketch") <0 | showThesketches)
      {
        var x = document.getElementById("filelist");
        var option = document.createElement("option");
        option.text = localStorage.key(i);
        x.add(option);
      }
  }
}




function deleteItem()
{
var filetodelete = document.getElementById("filelist").options[document.getElementById("filelist").selectedIndex].text;
  var arr = []; // Array to hold the keys
  // Iterate over localStorage and insert the keys that meet the condition into arr
  for (var i = 0; i < localStorage.length; i++){
      if (localStorage.key(i).startsWith(filetodelete)) {
          arr.push(localStorage.key(i));
      }
  }

  // Iterate over arr and remove the items by key
  for (var i = 0; i < arr.length; i++) {
      localStorage.removeItem(arr[i]);
  }
  updatelistbox();
}


function openSelectedItem()
{
  var filetoopen = document.getElementById("filelist").options[document.getElementById("filelist").selectedIndex].text;
  filetoopen.replace("TCAD.projects.", "");
  if (filetoopen.search("sketch") < 0)
  {
    window.location.href = "/index.html?" + filetoopen.replace("TCAD.projects.", "");
  }
  else
  {
    window.location.href = "/sketcher.html#" + filetoopen.replace("TCAD.projects.", "");
  }

}



function ExportToLocalFile()
{
  var bla;
  var lengthOfLocalStorage = localStorage.length;
  bla = lengthOfLocalStorage.toString();
  for(var i=0, len=localStorage.length; i<len; i++)
  {
    var key = localStorage.key(i);
    var value = localStorage[key];
    bla += "\n" + key +"\n" + value;
  }


  exportTextData(bla,"export.web-cad");
}


function readSingleFile(e) {
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e)
  {
    var data = e.target.result;
    var arrayOfLines = data.split("\n");
    alert(arrayOfLines[0]);

    for (var i = 0; i < arrayOfLines[0]; i++)
    {
      localStorage.setItem(arrayOfLines[i*2+1],arrayOfLines[i*2+2]);
    }
  };
  reader.readAsText(file);
}

window.onload = function () {document.getElementById('file-input').addEventListener('change', readSingleFile, false);}




function exportTextData(data, fileName)
{
  var link = document.getElementById("downloader");
  link.href = "data:application/octet-stream;charset=utf-8;base64," + btoa(data);
  link.download = fileName;
  link.click();
  //console.log(app.viewer.io.svgExport());
}
