import React, {useState, useRef, useEffect} from 'react';

export default class ComboBoxControl extends React.Component {
  render() {
    const {onChange, value, includeNonExistent, children} = this.props;
    const options = [];
    if (includeNonExistent) {
      let found = false;
      React.Children.forEach(children, opt => {
        if (opt.props.value === value) found = true;
      });
      if (!found) {
        options.push({value, label: value ? value+'' : '<empty>'});
      }
    }
    React.Children.forEach(children, opt => {
      if (opt && opt.props) {
        options.push({value: opt.props.value, label: opt.props.children});
      }
    });
    return <CustomSelect value={value} options={options} onChange={onChange} />;
  }
}

function CustomSelect({value, options, onChange}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find(o => o.value === value);

  return <div ref={ref} style={{position:'relative',display:'inline-block',minWidth:'90px'}}>
    <div onClick={() => setOpen(o => !o)} style={{
      backgroundColor: '#1e1e25',
      color: '#e2e2ee',
      border: '1px solid #2a2a36',
      borderRadius: '5px',
      padding: '3px 24px 3px 8px',
      fontSize: '11px',
      fontFamily: "'DM Sans', sans-serif",
      cursor: 'pointer',
      position: 'relative',
      whiteSpace: 'nowrap',
    }}>
      {selected ? selected.label : value}
      <span style={{position:'absolute',right:'7px',top:'50%',transform:'translateY(-50%)',fontSize:'8px',color:'#7a7a96'}}>▼</span>
    </div>
    {open && <div style={{
      position:'absolute',
      top:'calc(100% + 3px)',
      left:0,
      backgroundColor:'rgba(20,20,28,0.99)',
      border:'1px solid #363644',
      borderRadius:'8px',
      padding:'4px',
      minWidth:'100%',
      boxShadow:'0 14px 44px rgba(0,0,0,0.65)',
      backdropFilter:'blur(16px)',
      zIndex:9999,
    }}>
      {options.map(o => <div key={o.value} onClick={() => {onChange(o.value); setOpen(false);}} style={{
        padding:'5px 9px',
        borderRadius:'4px',
        fontSize:'11px',
        fontFamily:"'DM Sans', sans-serif",
        color: o.value === value ? '#4d9cf8' : '#7a7a96',
        backgroundColor: o.value === value ? 'rgba(77,156,248,0.12)' : 'transparent',
        cursor:'pointer',
        whiteSpace:'nowrap',
        transition:'all 0.1s',
      }}
      onMouseEnter={e => { if(o.value !== value) { e.currentTarget.style.backgroundColor='#26262f'; e.currentTarget.style.color='#e2e2ee'; }}}
      onMouseLeave={e => { if(o.value !== value) { e.currentTarget.style.backgroundColor='transparent'; e.currentTarget.style.color='#7a7a96'; }}}
      >{o.label}</div>)}
    </div>}
  </div>;
}

export function ComboBoxOption({children, value}) {
  return null;
}