import { cn } from "@/lib/utils";

type WhatsAppBadgeProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "text-[9px] px-1.5 py-0.5 -top-2 -right-1",
  md: "text-[10px] px-2 py-0.5 -top-2.5 -right-2",
  lg: "text-[11px] px-2.5 py-1 -top-3 -right-3",
};

export const WhatsAppBadge = ({ className, size = "md" }: WhatsAppBadgeProps) => {
  return (
    <span
      className={cn(
        "absolute z-10 whitespace-nowrap rounded-md bg-red-600 font-extrabold uppercase tracking-wide text-black shadow-lg pointer-events-none",
        "after:absolute after:-bottom-1 after:left-2 after:h-2 after:w-2 after:rotate-45 after:bg-red-600",
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
    >
      Descontos Especial!
    </span>
  );
};

export default WhatsAppBadge;
