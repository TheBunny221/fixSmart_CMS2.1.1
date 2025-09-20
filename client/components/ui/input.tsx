import * as React from "react";

import { cn } from "@/lib/utils";
import { useUIConfig } from "@/contexts/ThemeProvider";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const ui = useUIConfig();
    return (
      <input
        type={type}
        className={cn(
          "flex rounded-md ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
          ui.input.base,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
