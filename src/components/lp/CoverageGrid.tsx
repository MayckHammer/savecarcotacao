import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  CarFront,
  CarTaxiFront,
  Flame,
  CloudLightning,
  Map,
  KeyRound,
  Users,
  Layers,
  type LucideIcon,
} from "lucide-react";
import GlassIcons from "./GlassIcons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COVERAGES, type Coverage } from "@/lib/lp-content";
import { trackQuoteClick } from "@/lib/analytics";

const iconMap: Record<string, LucideIcon> = {
  shield: Shield,
  "car-front": CarFront,
  "car-taxi-front": CarTaxiFront,
  flame: Flame,
  "cloud-lightning": CloudLightning,
  map: Map,
  "key-round": KeyRound,
  users: Users,
  layers: Layers,
};

const colors = ["teal", "amber", "teal", "amber", "teal", "amber", "teal", "amber", "teal"];

const CoverageGrid = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Coverage | null>(null);

  const items = COVERAGES.map((coverage, index) => {
    const Icon = iconMap[coverage.icon] ?? Shield;
    return {
      icon: <Icon className="size-6" />,
      color: colors[index] ?? "teal",
      label: coverage.title,
      onClick: () => setSelected(coverage),
    };
  });

  const SelectedIcon = selected ? iconMap[selected.icon] ?? Shield : Shield;

  return (
    <>
      <GlassIcons items={items} />

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader className="space-y-4">
                <span className="grid size-12 place-items-center rounded-[var(--radius-input)] bg-teal-50 text-teal-700">
                  <SelectedIcon className="size-6" />
                </span>
                <DialogTitle className="font-display text-xl text-teal-900">{selected.title}</DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                  {selected.description}
                </DialogDescription>
              </DialogHeader>
              <Button
                variant="cta"
                className="w-full"
                onClick={() => {
                  trackQuoteClick("modal_cobertura", { cobertura: selected.title });
                  navigate("/cotacao");
                }}
              >
                Fazer cotação
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CoverageGrid;
