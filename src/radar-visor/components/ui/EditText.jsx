import React, { useState } from 'react';
import PropTypes from 'prop-types';

const EditText = ({
  placeholder = '',
  value = '',
  onChange,
  type = 'text',
  disabled = false,
  className = '',
  leftImage = null,
  rightImage = null,
  ...props
}) => {
  const [inputValue, setInputValue] = useState(value);

  const handleChange = (e) => {
    const newValue = e?.target?.value;
    setInputValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const baseClasses = 'w-full rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200';
  const inputClasses = `${baseClasses} ${className}`;

  return (
    <div className="relative flex items-center">
      {leftImage && (
        <div className="absolute left-3 z-10">
          <img 
            src={leftImage?.src} 
            alt="" 
            className={`w-[${leftImage?.width}px] h-[${leftImage?.height}px]`}
          />
        </div>
      )}
      <input
        type={type}
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
        {...props}
      />
      {rightImage && (
        <div className="absolute right-3">
          <img 
            src={rightImage?.src} 
            alt="" 
            className={`w-[${rightImage?.width}px] h-[${rightImage?.height}px]`}
          />
        </div>
      )}
    </div>
  );
};

EditText.propTypes = {
  placeholder: PropTypes?.string,
  value: PropTypes?.string,
  onChange: PropTypes?.func,
  type: PropTypes?.string,
  disabled: PropTypes?.bool,
  className: PropTypes?.string,
  leftImage: PropTypes?.shape({
    src: PropTypes?.string?.isRequired,
    width: PropTypes?.number,
    height: PropTypes?.number
  }),
  rightImage: PropTypes?.shape({
    src: PropTypes?.string?.isRequired,
    width: PropTypes?.number,
    height: PropTypes?.number
  })
};

export default EditText;