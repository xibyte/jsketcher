
export function uploadFile(cb: ((fileName: string, text: string) => void)) {
  const uploader = document.createElement('input');
  uploader.setAttribute('type', 'file');
  uploader.style.display = 'none';

  document.body.appendChild(uploader);
  uploader.click();
  function read() {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        cb(uploader.value, reader.result as string);
      } finally {
        document.body.removeChild(uploader);
      }
    };
    reader.readAsText(uploader.files[0]);
  }
  uploader.addEventListener('change', read, false);
}