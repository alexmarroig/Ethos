import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  textClassName?: string;
};

export default function BrandWordmark({
  className,
  textClassName,
}: BrandWordmarkProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <div
        className={cn(
          "text-[1.75rem] font-semibold tracking-[-0.04em] text-foreground",
          textClassName,
        )}
      >
        <span className="text-[hsl(var(--brand-blue))]">E</span>
        <span className="text-foreground dark:text-foreground">THOS</span>
      </div>
    </div>
  );
}
