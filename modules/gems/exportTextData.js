
export default function(data, fileName) {
  const link = document.getElementById("downloader");
  link.href = "data:application/octet-stream;charset=utf-8;base64," + btoa(data);
  link.download = fileName;
  link.click();
};
