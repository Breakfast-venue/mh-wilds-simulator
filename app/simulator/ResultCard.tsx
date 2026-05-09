"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Decoration } from "@/lib/types";
import type { EquipmentSet } from "@/lib/simulator/types";
import { WEAPON_KIND_JP } from "@/lib/i18n";


const PARTS: { key: "head" | "body" | "arms" | "waist" | "legs"; label: string }[] = [
  { key: "head",  label: "頭" },
  { key: "body",  label: "胴" },
  { key: "arms",  label: "腕" },
  { key: "waist", label: "腰" },
  { key: "legs",  label: "脚" },
];

const RES_KEYS: { key: keyof EquipmentSet["totalResistances"]; label: string }[] = [
  { key: "fire",    label: "火" },
  { key: "water",   label: "水" },
  { key: "thunder", label: "雷" },
  { key: "ice",     label: "氷" },
  { key: "dragon",  label: "龍" },
];

function groupDecorations(
  decos: Decoration[],
): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const d of decos) m.set(d.name, (m.get(d.name) ?? 0) + 1);
  return Array.from(m.entries()).map(([name, count]) => ({ name, count }));
}

function resColor(v: number): string {
  if (v >= 20) return "text-green-600";
  if (v <= -10) return "text-red-600";
  return "text-foreground";
}

export function ResultCard({
  set,
  index,
}: {
  set: EquipmentSet;
  index: number;
}) {
  const decoGroups = groupDecorations(set.decorations);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">セット #{index}</CardTitle>
        <div className="text-sm text-muted-foreground">
          防御{" "}
          <span className="font-bold text-foreground text-base">
            {set.totalDefense}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 武器 */}
        {set.weapon && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              武器
            </div>
            <div className="text-sm flex items-center gap-2">
              <Badge variant="outline">{WEAPON_KIND_JP[set.weapon.kind]}</Badge>
              <span className="font-medium">{set.weapon.name}</span>
              <span className="text-muted-foreground">攻撃 {set.weapon.damage}</span>
              <span className="text-xs font-mono text-muted-foreground">
                [{set.weapon.slots.join("][")}]
              </span>
            </div>
          </div>
        )}

        {/* 防具5部位 */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            防具
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {PARTS.map(({ key, label }) => {
              const a = set[key];
              return (
                <div key={key} className="border rounded p-2">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">
                    [{a.slots.join("][")}] / 防御 {a.defense}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 護石（MVPでは出ないが将来対応のため描画） */}
        {set.charm && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              護石
            </div>
            <div className="text-sm">
              {set.charm.name}{" "}
              {set.charm.skills.map((s) => (
                <Badge key={s.skillId} variant="secondary" className="ml-1">
                {s.skillName} +{s.level}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 装飾品 */}
        {decoGroups.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              装飾品（{set.decorations.length}個）
            </div>
            <div className="flex flex-wrap gap-1">
              {decoGroups.map((g) => (
                <Badge key={g.name} variant="outline">
                  {g.name}
                  {g.count > 1 && <span className="ml-1">×{g.count}</span>}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 合計スキル */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            合計スキル
          </div>
          <div className="flex flex-wrap gap-1">
            {set.totalSkills.map((s) => (
              <Badge key={s.skillId} variant="secondary">
              {s.skillName} +{s.level}
              </Badge>
            ))}
          </div>
        </div>

        {/* 合計耐性 */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            合計耐性
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {RES_KEYS.map(({ key, label }) => {
              const v = set.totalResistances[key];
              return (
                <span key={key} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className={`font-mono ${resColor(v)}`}>
                    {v >= 0 ? `+${v}` : v}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}