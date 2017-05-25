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
    window.location.href = "./index.html#" + filetoopen.replace("TCAD.projects.", "");
  }
  else
  {
    window.location.href = "./sketcher.html#" + filetoopen.replace("TCAD.projects.", "");
  }

}
