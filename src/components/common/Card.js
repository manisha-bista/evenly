import React from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`bg-white shadow-card rounded-lg p-4 sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;