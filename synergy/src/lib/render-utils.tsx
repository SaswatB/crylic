import React from "react";

export const renderSeparator = (title?: string, action?: React.ReactNode) => (
  <div className="flex items-center">
    {title && (
      <span className="pb-1 mr-2 text-sm text-gray-500 whitespace-no-wrap">
        {title}
      </span>
    )}
    <div className="w-full my-5 border-gray-600 border-solid border-b" />
    {action || null}
  </div>
);
