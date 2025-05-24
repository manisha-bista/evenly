// src/components/common/Modal.js
import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({ isOpen, onClose, title, children, primaryActionText, onPrimaryAction, secondaryActionText, onSecondaryAction, primaryActionColor = 'indigo' }) => {
  if (!isOpen) return null;

  let primaryButtonClasses = `w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm`;
  if (primaryActionColor === 'indigo') {
    primaryButtonClasses += ' bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500';
  } else if (primaryActionColor === 'red') {
    primaryButtonClasses += ' bg-red-600 hover:bg-red-700 focus:ring-red-500';
  } else { // default to indigo
    primaryButtonClasses += ' bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500';
  }


  return (
    <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">​</span>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              {/* Optional: Icon can be passed as child or prop */}
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        {title}
                    </h3>
                    <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={onClose}
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="mt-4">
                  {children}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {onPrimaryAction && (
              <button
                type="button"
                className={primaryButtonClasses}
                onClick={onPrimaryAction}
              >
                {primaryActionText || 'Confirm'}
              </button>
            )}
            {onSecondaryAction && (
                <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={onSecondaryAction || onClose}
                >
                    {secondaryActionText || 'Cancel'}
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;