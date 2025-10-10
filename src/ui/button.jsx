import React from "react";
import clsx from "clsx";

export const Button = ({
  variant = "default",
  size = "md",
  className,
  children,
  ...props
}) => {
  const base =
    "rounded px-4 py-2 font-medium transition-colors focus:outline-none";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
    outline: "border border-blue-600 text-blue-600 hover:bg-blue-50",
  };
  const sizes = {
    sm: "text-xs py-1 px-2",
    md: "text-sm py-2 px-4",
    lg: "text-base py-3 px-6",
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};