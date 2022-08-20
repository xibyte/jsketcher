import React from 'react';

export interface LocalFile {

  fileName: string;
  dataUrl: string;

}

export class LocalFileAdapter implements LocalFile {

  localFile: LocalFile;

  constructor(localFile: LocalFile) {
    this.localFile = localFile;
  }

  get fileName() {
    return this.localFile.fileName;
  }

  get dataUrl() {
    return this.localFile.dataUrl;
  }

  base64Content() {
    return getBase64FromDataUrl(this.dataUrl);
  }

  rawContent() {
    return atob(getBase64FromDataUrl(this.dataUrl));
  }
}

export function getBase64FromDataUrl(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  return dataUrl.substring(commaIndex + 1, dataUrl.length);
}

export default class FileControl extends React.Component<any> {

  render() {
    const {type, inputRef, onChange, value, ...props} = this.props;

    function fileChanged(files, name) {

      if (!files || !files[0]) {
        onChange(null);
      }

      const file = files[0];

      const reader = new FileReader();
      reader.onload = evt => {
        const dataUrl = evt.target.result as string;
        onChange({
          fileName: name,
          dataUrl,
        })
      };
      reader.readAsDataURL(file);
    }

    return <div className={type}>
      <input type="file" onChange={ e => fileChanged(e.target.files, e.target.value) } ref={inputRef} {...props} />
    </div>;
  }
}
