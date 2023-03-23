import React from 'react';
import Typography from '@material-ui/core/Typography';

const Loader = () => {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        color: 'black'
      }}
    >
      <Typography sx={{ color: '#000' }}>Loading</Typography>
    </div>
  );
};

export default Loader;
