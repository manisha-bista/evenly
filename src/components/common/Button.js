// src/components/common/Button.js
import React from 'react';

const Button = ({
  children,
  type = 'button',
  onClick,
  disabled = false,
  color = 'primary', // 'primary', 'secondary', 'danger', etc.
  outline = false,
  fullWidth = false,
  className = '',
  ...props
}) => {
  let baseClasses = "font-medium py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150";
  if (fullWidth) baseClasses += " w-full flex justify-center";
  if (disabled) baseClasses += " opacity-50 cursor-not-allowed";

  let colorClasses = "";
  switch (color) {
    case 'secondary':
      colorClasses = outline
        ? "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400";
      break;
    case 'danger':
      colorClasses = outline
        ? "border border-red-500 text-red-500 bg-white hover:bg-red-50 focus:ring-red-500"
        : "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500";
      break;
    case 'primary':
    default:
      colorClasses = outline
        ? "border border-indigo-600 text-indigo-600 bg-white hover:bg-indigo-50 focus:ring-indigo-500"
        : "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500";
      break;
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${colorClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;