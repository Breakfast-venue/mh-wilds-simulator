"use client";

import type { CustomCharm } from "@/lib/simulator/types";
import { buildCustomCharmName } from "@/lib/data/ownedCharms";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  charm: CustomCharm;
  onDelete: () => void;
};

export function CustomCharmCard({ charm, onDelete }: Props) {
  const name = buildCustomCharmName(charm);
  const activeSlots = charm.slots.filter((s) => s.size > 0);

  return (
    <div className="border rounded-md p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-medium">{name}</div>
        <div className="flex flex-wrap gap-1">
          {charm.skills.map((s, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {s.skillName} Lv{s.level}
            </Badge>
          ))}
        </div>
        {activeSlots.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {activeSlots.map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {s.kind === "armor" ? "防具" : "武器"}スロ{s.size}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="text-destructive shrink-0"
      >
        削除
      </Button>
    </div>
  );
}
