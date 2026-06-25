import React from "react";

export default function Panel({
  as: Component = "section",
  className = "",
  children,
  ...props
}) {
  return (
    <Component className={`dashboardPanel ${className}`} {...props}>
      {children}
    </Component>
  );
}
