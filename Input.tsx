import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({ label, containerClassName = "", className = "", ...props }) => {
  return (
    <div className={`flex flex-col ${containerClassName}`}>
      {label && <label className="mb-1 text-xs font-medium text-gray-700">{label}</label>}
      <input
        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 ${className}`}
        {...props}
      />
    </div>
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, containerClassName?: string }> = ({ label, containerClassName = "", className = "", children, ...props }) => {
  return (
    <div className={`flex flex-col ${containerClassName}`}>
      {label && <label className="mb-1 text-xs font-medium text-gray-700">{label}</label>}
      <select
        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};