import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col h-full w-full rounded-sm border border-border bg-background text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "h-8 border-b border-border bg-muted/40 px-2 text-xs flex items-center",
        className
      )}
      {...props}
    />
  );
}
