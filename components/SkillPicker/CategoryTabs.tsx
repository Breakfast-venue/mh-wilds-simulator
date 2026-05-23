"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SkillCategory } from "@/lib/simulator/types";

const TAB_LABELS: Record<SkillCategory, string> = {
  armor: "防具",
  weapon: "武器",
  group: "グループ",
  set: "シリーズ",
};

const TAB_ORDER: SkillCategory[] = ["armor", "weapon", "group", "set"];

type Props = {
  value: SkillCategory;
  onChange: (next: SkillCategory) => void;
  counts: Record<SkillCategory, number>;
};

export function CategoryTabs({ value, onChange, counts }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as SkillCategory)}>
      <TabsList className="grid w-full grid-cols-4">
        {TAB_ORDER.map((cat) => (
          <TabsTrigger key={cat} value={cat}>
            {TAB_LABELS[cat]}
            <span className="ml-1 text-xs text-muted-foreground">
              ({counts[cat]})
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
