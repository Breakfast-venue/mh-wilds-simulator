"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { masters } from "@/lib/data/loadMasters";
import type { SkillRequirement } from "@/lib/simulator/types";

type Props = {
  selected: SkillRequirement[];
  onChange: (next: SkillRequirement[]) => void;
};

export function SelectedChips({ selected, onChange }: Props) {
  const skillById = useMemo(
    () => new Map(masters.skills.map((s) => [s.id, s])),
    [],
  );

  if (selected.length === 0) {
    return (
      <div className="rounded border border-dashed p-3 text-center text-sm text-muted-foreground">
        スキル未選択
      </div>
    );
  }

  const setLevel = (skillId: number, nextLevel: number) => {
    onChange(
      selected.map((r) =>
        r.skillId === skillId ? { ...r, level: nextLevel } : r,
      ),
    );
  };

  const remove = (skillId: number) => {
    onChange(selected.filter((r) => r.skillId !== skillId));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {selected.map((req) => {
        const skill = skillById.get(req.skillId);
        const maxLv = skill?.maxLv ?? 1;
        const canDec = req.level > 1;
        const canInc = req.level < maxLv;
        return (
          <div
            key={req.skillId}
            className="inline-flex items-center gap-1 rounded-full border bg-background py-1 pl-3 pr-1 text-sm"
          >
            <span className="font-medium">{req.skillName}</span>
            <div className="inline-flex items-center">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                disabled={!canDec}
                onClick={() => setLevel(req.skillId, req.level - 1)}
                aria-label="Lv 下げる"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="w-10 text-center text-xs tabular-nums">
                Lv{req.level}
                {maxLv > 1 && (
                  <span className="text-muted-foreground">/{maxLv}</span>
                )}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                disabled={!canInc}
                onClick={() => setLevel(req.skillId, req.level + 1)}
                aria-label="Lv 上げる"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => remove(req.skillId)}
              aria-label="削除"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
