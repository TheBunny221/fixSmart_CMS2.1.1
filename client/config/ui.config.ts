export type UIConfig = {
  colors: {
    primary: string;
    secondary: string;
    destructive: string;
    background: string;
    card: string;
    input: string;
    popover: string;
  };
  borderRadius: string;
  shadow: string;
  spacing: string;
  font: {
    base: string;
    heading: string;
  };
  transitions: string;
  button: {
    base: string;
    default: string;
    small: string;
    large: string;
  };
  card: {
    base: string;
    header: string;
    content: string;
    footer: string;
  };
  input: {
    base: string;
  };
  select: {
    trigger: string;
    content: string;
    item: string;
  };
  tooltip: {
    content: string;
  };
  dialog: {
    overlay: string;
    content: string;
  };
};

export const UI_CONFIG = (isDark: boolean): UIConfig => ({
  colors: {
    // Use tokens so Tailwind + CSS variables handle light/dark accurately
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    background: "bg-background text-foreground",
    card: "bg-card text-card-foreground",
    input: "border-input bg-background text-foreground",
    popover: "bg-popover text-popover-foreground",
  },
  // Global primitives
  borderRadius: "rounded-md",
  shadow: isDark ? "shadow-lg" : "shadow-sm",
  spacing: "p-2",
  font: {
    base: "text-sm",
    heading: "text-xl font-semibold",
  },
  transitions: "transition duration-200 ease-in-out",

  // Component defaults
  button: {
    base: "inline-flex items-center justify-center gap-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    default: "h-10 px-4",
    small: "h-9 px-3",
    large: "h-11 px-5 text-base",
  },
  card: {
    base: "border",
    header: "p-6",
    content: "p-6 pt-0",
    footer: "p-6 pt-0",
  },
  input: {
    base: "h-10 w-full border bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  },
  select: {
    trigger:
      "h-10 w-full border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    content:
      "border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out",
    item: "rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
  },
  tooltip: {
    content:
      "overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md animate-in fade-in-0 zoom-in-95",
  },
  dialog: {
    overlay:
      "fixed inset-0 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    content:
      "fixed left-1/2 top-1/2 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out sm:rounded-lg",
  },
});

export type { UIConfig as TUIConfig };
