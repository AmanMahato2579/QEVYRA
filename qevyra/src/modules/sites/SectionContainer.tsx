import React from "react";

export interface SectionContainerProps
  extends React.HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "header" | "footer";
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function SectionContainer({
  as: Component = "section",
  children,
  className = "",
  id,
  ...rest
}: SectionContainerProps) {
  return (
    <Component
      id={id}
      className={`w-full max-w-xl md:max-w-6xl mx-auto px-4 md:px-6 lg:px-8 ${className}`.trim()}
      {...rest}
    >
      {children}
    </Component>
  );
}
