import React from "react";

export default function VectorCube() {
  return (
    <div className="vectorCube" aria-hidden="true">
      <div className="cubeCore" />
      {Array.from({ length: 12 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
