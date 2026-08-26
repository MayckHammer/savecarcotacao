import { cn } from "@/lib/utils";

type WhatsAppBadgeProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "text-[9px] px-1.5 py-0.5 -top-2",
  md: "text-[10px] px-2 py-0.5 -top-2.5",
  lg: "text-[11px] px-2.5 py-1 -top-3",
};

export const WhatsAppBadge = ({ className, size = "md" }: WhatsAppBadgeProps) => {
  return (
    <span
      className={cn(
        "absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-red-600 font-extrabold uppercase tracking-wide text-black shadow-lg pointer-events-none animate-pulse",
        "after:absolute after:-bottom-1 after:left-1/2 after:h-2 after:w-2 after:-translate-x-1/2 after:rotate-45 after:bg-red-600",
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
