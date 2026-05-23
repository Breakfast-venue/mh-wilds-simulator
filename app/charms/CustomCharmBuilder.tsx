"use client";

import { useMemo, useState } from "react";
import type { Skill } from "@/lib/types";
import type {
  CharmRarity,
  CustomCharm,
  CustomCharmSlot,
} from "@/lib/simulator/types";
import {
  CHARM_RARITY_BASE_NAME,
  buildCustomCharmName,
  newCustomCharmId,
} from "@/lib/data/ownedCharms";
import { masters } from "@/lib/data/loadMasters";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  onAdd: (charm: CustomCharm) => void;
};

type SkillRow = { skillId: number | null; level: number };
const EMPTY_SKILL: SkillRow = { skillId: null, level: 1 };

const EMPTY_SLOTS: [CustomCharmSlot, CustomCharmSlot, CustomCharmSlot] = [
  { kind: "armor", size: 0 },
  { kind: "armor", size: 0 },
  { kind: "armor", size: 0 },
];

export function CustomCharmBuilder({ onAdd }: Props) {
  const allSkills = masters.skills as Skill[];

  const [rarity, setRarity] = useState<CharmRarity>(8);
  const [skills, setSkills] = useState<SkillRow[]>([
    { ...EMPTY_SKILL },
    { ...EMPTY_SKILL },
    { ...EMPTY_SKILL },
  ]);
  const [slots, setSlots] = useState<
    [CustomCharmSlot, CustomCharmSlot, CustomCharmSlot]
  >([...EMPTY_SLOTS]);

  // スキル ID → Skill のマップ
  const skillMap = useMemo(() => {
    const m = new Map<number, Skill>();
    for (const s of allSkills) m.set(s.id, s);
    return m;
  }, [allSkills]);

  // プレビュー用：現在の入力から CustomCharm を組み立てる
  const previewCharm = useMemo<CustomCharm>(() => {
    const validSkills = skills
      .filter(
        (row): row is { skillId: number; level: number } =>
          row.skillId !== null,
      )
      .map((row) => {
        const skill = skillMap.get(row.skillId);
        return {
          skillId: row.skillId,
          skillName: skill?.name ?? `スキル#${row.skillId}`,
          level: row.level,
        };
      });
    return {
      id: "preview",
      rarity,
      skills: validSkills,
      slots,
    };
  }, [rarity, skills, slots, skillMap]);

  const previewName = buildCustomCharmName(previewCharm);

  const canAdd = previewCharm.skills.length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ ...previewCharm, id: newCustomCharmId() });
    // リセット
    setRarity(8);
    setSkills([{ ...EMPTY_SKILL }, { ...EMPTY_SKILL }, { ...EMPTY_SKILL }]);
    setSlots([
      { kind: "armor", size: 0 },
      { kind: "armor", size: 0 },
      { kind: "armor", size: 0 },
    ]);
  };

  const handleReset = () => {
    setRarity(8);
    setSkills([{ ...EMPTY_SKILL }, { ...EMPTY_SKILL }, { ...EMPTY_SKILL }]);
    setSlots([
      { kind: "armor", size: 0 },
      { kind: "armor", size: 0 },
      { kind: "armor", size: 0 },
    ]);
  };

  const updateSkill = (idx: number, patch: Partial<SkillRow>) => {
    setSkills((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  };

  const updateSlot = (idx: number, patch: Partial<CustomCharmSlot>) => {
    setSlots((prev) => {
      const next = [...prev] as typeof prev;
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {/* プレビュー */}
      <div className="rounded-md border border-dashed p-3 bg-accent/20">
        <div className="text-xs text-muted-foreground mb-1">プレビュー</div>
        <div className="font-medium">{previewName}</div>
        {previewCharm.skills.length === 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            ※ スキルを 1 つ以上選択してね
          </div>
        )}
      </div>

      {/* RARE 選択 */}
      <div className="space-y-2">
        <Label>レアリティ</Label>
        <Select
          value={String(rarity)}
          onValueChange={(v) => setRarity(Number(v) as CharmRarity)}
        >
          <SelectTrigger className="w-full md:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {([8, 7, 6, 5] as CharmRarity[]).map((r) => (
              <SelectItem key={r} value={String(r)}>
                RARE{r} {CHARM_RARITY_BASE_NAME[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* スキル 3 段 */}
      <div className="space-y-2">
        <Label>スキル（最大 3 個）</Label>
        <div className="space-y-2">
          {skills.map((row, idx) => {
            const selectedSkill = row.skillId
              ? skillMap.get(row.skillId)
              : undefined;
            const maxLv = selectedSkill?.ranks?.length ?? 1;
            return (
              <div key={idx} className="flex flex-wrap gap-2 items-center">
                <Select
                  value={row.skillId ? String(row.skillId) : "none"}
                  onValueChange={(v) =>
                    updateSkill(idx, {
                      skillId: v === "none" ? null : Number(v),
                      level: 1,
                    })
                  }
                >
                  <SelectTrigger className="flex-1 min-w-[200px]">
                    <SelectValue placeholder="スキルを選択…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="none">（未選択）</SelectItem>
                    {allSkills.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(row.level)}
                  onValueChange={(v) => updateSkill(idx, { level: Number(v) })}
                  disabled={!row.skillId}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxLv }, (_, i) => i + 1).map(
                      (lv) => (
                        <SelectItem key={lv} value={String(lv)}>
                          Lv{lv}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </div>

      {/* スロット 3 段 */}
      <div className="space-y-2">
        <Label>スロット（3 個まで）</Label>
        <div className="space-y-2">
          {slots.map((slot, idx) => (
            <div key={idx} className="flex flex-wrap gap-2 items-center">
              <Select
                value={slot.kind}
                onValueChange={(v) =>
                  updateSlot(idx, { kind: v as "armor" | "weapon" })
                }
                disabled={slot.size === 0}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="armor">防具スロ</SelectItem>
                  <SelectItem value="weapon">武器スロ</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={String(slot.size)}
                onValueChange={(v) =>
                  updateSlot(idx, {
                    size: Number(v) as 0 | 1 | 2 | 3,
                  })
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">なし</SelectItem>
                  <SelectItem value="1">①</SelectItem>
                  <SelectItem value="2">②</SelectItem>
                  <SelectItem value="3">③</SelectItem>
                </SelectContent>
              </Select>
              {slot.size > 0 && (
                <Badge variant="outline" className="text-xs">
                  {slot.kind === "armor" ? "防具" : "武器"} ③
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* アクション */}
      <div className="flex gap-2 pt-2">
        <Button onClick={handleAdd} disabled={!canAdd}>
          この構成で護石登録
        </Button>
        <Button variant="outline" onClick={handleReset}>
          リセット
        </Button>
      </div>
    </div>
  );
}
