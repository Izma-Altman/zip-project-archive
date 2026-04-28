import React from 'react';
import zipLogo from '../assets/zip-logo.png'; 

const Logo = ({ className }) => {
  return (
    <img 
      src={zipLogo} 
      alt=".Zip Portal Logo" 
      className={`object-contain ${className}`} 
    />
  );
};

export default Logo;