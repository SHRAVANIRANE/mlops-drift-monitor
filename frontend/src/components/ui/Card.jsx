import React from "react";

export default function Card({
  as: Component = "div",
  variant = "control", // control, feature, upload
  className = "",
  children,
  ...props
}) {
  let cardClass = "";
  if (variant === "control") cardClass = "controlCard";
  else if (variant === "feature") cardClass = "featureCard";
  else if (variant === "upload") cardClass = "uploadControl";

  return (
    <Component className={`${cardClass} ${className}`} {...props}>
      {children}
    </Component>
  );
}
