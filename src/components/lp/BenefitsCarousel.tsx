import { Zap, Unlock, Smartphone, Headphones, UsersRound, BadgeCheck, type LucideIcon } from "lucide-react";
import { BENEFITS } from "@/lib/lp-content";

const benefitIcons: Record<string, LucideIcon> = {
  zap: Zap,
  unlock: Unlock,
  smartphone: Smartphone,
  headphones: Headphones,
  "users-round": UsersRound,
  "badge-check": BadgeCheck,
};

const BenefitsCarousel = () => {
  const duplicated = [...BENEFITS, ...BENEFITS];

  return (
    <div className="relative -mx-4 overflow-hidden sm:-mx-6 lg:-mx-8">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-teal-50 to-transparent sm:w-12" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-teal-50 to-transparent sm:w-12" />

      <div className="flex w-max animate-scroll-left hover:[animation-play-state:paused]">
        {duplicated.map((benefit, index) => {
          const Icon = benefitIcons[benefit.icon] ?? Zap;
          return (
            <div
              key={`${benefit.title}-${index}`}
              className="mx-3 w-[280px] flex-shrink-0 rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-lift sm:mx-4 sm:w-[320px]"
            >
              <span className="grid size-11 place-items-center rounded-[var(--radius-input)] bg-teal-900 text-amber-500">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold text-teal-900">{benefit.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BenefitsCarousel;
