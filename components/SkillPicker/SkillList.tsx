"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Skill } from "@/lib/types";
import type { SkillRequirement } from "@/lib/simulator/types";

type Props = {
  skills: Skill[];
  selected: SkillRequirement[];
  onChange: (next: SkillRequirement[]) => void;
  /** 件数が多い armor / weapon タブで true。group / set は件数少ないので不要 */
  showSearch?: boolean;
};

export function SkillList({
  skills,
  selected,
  onChange,
  showSearch = false,
}: Props) {
  const [query, setQuery] = useState("");

  const selectedIds = useMemo(
    () => new Set(selected.map((r) => r.skillId)),
    [selected],
  );

  const visible = useMemo(() => {
    if (!showSearch || !query.trim()) return skills;
    const q = query.trim().toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [skills, query, showSearch]);

  const toggle = (skill: Skill) => {
    if (selectedIds.has(skill.id)) {
      onChange(selected.filter((r) => r.skillId !== skill.id));
    } else {
      onChange([
        ...selected,
        {
          skillId: skill.id,
          skillName: skill.name,
          level: 1,
          kind: skill.kind,
        },
      ]);
    }
  };

  return (
    <div className="space-y-2">
      {showSearch && (
        <Input
          placeholder="スキル名 / 効果で検索…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div className="max-h-96 overflow-y-auto rounded border">
        {visible.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            該当なし
          </div>
        ) : (
          <ul className="divide-y">
            {visible.map((skill) => {
              const checked = selectedIds.has(skill.id);
              return (
                <li key={skill.id}>
                  <label className="flex cursor-pointer items-start gap-3 p-2 hover:bg-muted/50">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(skill)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium">{skill.name}</span>
                        <span className="text-xs text-muted-foreground">
                          最大Lv{skill.maxLv}
                        </span>
                      </div>
                      {skill.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {skill.description}
                        </p>
                      )}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {showSearch && query && (
        <div className="text-xs text-muted-foreground">
          {visible.length} / {skills.length} 件表示
        </div>
      )}
    </div>
  );
}
