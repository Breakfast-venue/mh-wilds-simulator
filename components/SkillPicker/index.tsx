"use client";

import { useMemo, useState } from "react";
import { masters } from "@/lib/data/loadMasters";
import type { SkillCategory, SkillRequirement } from "@/lib/simulator/types";
import { CategoryTabs } from "./CategoryTabs";
import { SelectedChips } from "./SelectedChips";
import { SkillList } from "./SkillList";

type Props = {
  selected: SkillRequirement[];
  onChange: (next: SkillRequirement[]) => void;
};

export function SkillPicker({ selected, onChange }: Props) {
  const [category, setCategory] = useState<SkillCategory>("armor");

  const byKind = useMemo(() => {
    return {
      armor: masters.skills.filter((s) => s.kind === "armor"),
      weapon: masters.skills.filter((s) => s.kind === "weapon"),
      group: masters.skills.filter((s) => s.kind === "group"),
      set: masters.skills.filter((s) => s.kind === "set"),
    } satisfies Record<SkillCategory, typeof masters.skills>;
  }, []);

  const visibleSkills = byKind[category];

  const counts: Record<SkillCategory, number> = {
    armor: byKind.armor.length,
    weapon: byKind.weapon.length,
    group: byKind.group.length,
    set: byKind.set.length,
  };

  // 件数が多い armor / weapon は検索ボックス表示
  const showSearch = category === "armor" || category === "weapon";

  return (
    <div className="space-y-4">
      {/* ① 上段: 選択中スキル */}
      <section>
        <div className="mb-2 text-sm font-medium">
          選択中（{selected.length}）
        </div>
        <SelectedChips selected={selected} onChange={onChange} />
      </section>

      {/* ② 下段: カテゴリタブ + スキル一覧 */}
      <section className="space-y-2">
        <CategoryTabs value={category} onChange={setCategory} counts={counts} />
        <SkillList
          skills={visibleSkills}
          selected={selected}
          onChange={onChange}
          showSearch={showSearch}
        />
      </section>
    </div>
  );
}
