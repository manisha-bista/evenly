// src/components/common/Input.js
import React from 'react';

const Input = React.forwardRef(
  ({ label, id, error, hint, type = 'text', rows = 3, className = '', ...props }, ref) => {
    const commonInputClasses = `mt-1 block w-full px-3 py-2 bg-white border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`;
    const errorClasses = error ? 'border-red-500 text-red-700 focus:ring-red-500 focus:border-red-500' : 'border-gray-300';

    return (
      <div>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        {type === 'textarea' ? (
          <textarea
            id={id}
            ref={ref}
            rows={rows}
            className={`${commonInputClasses} ${errorClasses} ${className}`}
            {...props}
          />
        ) : (
          <input
            type={type}
            id={id}
            ref={ref}
            className={`${commonInputClasses} ${errorClasses} ${className}`}
            {...props}
          />
        )}
        {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

export default Input;