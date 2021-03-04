import React from 'react';
import PropTypes from 'prop-types';
import InputControl from './InputControl';

export interface LocalFile {

  fileName: string;
  content: string;
}

export default class FileControl extends React.Component<any> {

  render() {
    let {type, inputRef, onChange, value, ...props} = this.props;

    function fileChanged(files, name) {

      if (!files || !files[0]) {
        onChange(null);
      }

      const file = files[0];

      file.text().then(content => {
        onChange({
          fileName: name,
          content
        })
      });
    }

    return <div className={type}>
      <input type="file" onChange={ e => fileChanged(e.target.files, e.target.value) } ref={inputRef} {...props} />
    </div>;
  }
}
