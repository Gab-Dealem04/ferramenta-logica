import React from "react";

export default function NestedBoxes({ scopes = [], lineId, closedBoxes = [], children }) {
  if (!scopes || scopes.length === 0) {
    return <div className="flex-1 flex items-center h-full px-2 ml-1">{children}</div>;
  }

  const renderLevel = (index) => {
    if (index >= scopes.length) {
      return children;
    }

    const boxStartId = scopes[index];
    const isStart = lineId === boxStartId;

    const isClosedBoxEnd = closedBoxes.some(
      (box) => box.start === boxStartId && box.end === lineId
    );

    const borderClasses = `border-l-2 border-blue-400 bg-blue-50/40 ${
      isStart ? "border-t-2 border-r-2" : "border-r-2"
    } ${isClosedBoxEnd ? "border-b-2" : ""}`;

    return (
      <div className={`flex-1 flex items-center h-full px-1.5 ${borderClasses}`}>
        {renderLevel(index + 1)}
      </div>
    );
  };

  return <div className="flex-1 flex items-center h-full ml-1">{renderLevel(0)}</div>;
}