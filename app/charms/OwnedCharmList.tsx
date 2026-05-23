"use client";

import { useMemo, useState } from "react";
import type { Charm } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  allCharms: Charm[];
  ownedIds: number[];
  onChange: (next: number[]) => void;
};

type CharmFamily = {
  familyKey: string; // ファミリー名（語幹）をキーに
  familyName: string; // "防風の護石"
  ranks: Charm[]; // level 昇順
};

/**
 * 末尾のローマ数字（全角 Ⅰ-Ⅹ / 半角 I-X）を取り除く
 * 例: "防風の護石III" → "防風の護石"
 *     "攻撃の護石Ⅲ" → "攻撃の護石"
 */
function stripRomanSuffix(name: string): string {
  return name
    .replace(/\s*(?:[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+|IX|IV|VI{0,3}|V|I{1,3}|X)$/u, "")
    .trim();
}

function buildFamilies(allCharms: Charm[]): CharmFamily[] {
  const map = new Map<string, Charm[]>();
  for (const c of allCharms) {
    const key = stripRomanSuffix(c.name);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  const families: CharmFamily[] = [];
  for (const [key, ranks] of map.entries()) {
    const sorted = [...ranks].sort((a, b) => a.level - b.level);
    families.push({
      familyKey: key,
      familyName: key,
      ranks: sorted,
    });
  }
  // 日本語ロケールで名前順
  families.sort((a, b) => a.familyName.localeCompare(b.familyName, "ja"));
  return families;
}

export function OwnedCharmList({ allCharms, ownedIds, onChange }: Props) {
  const [query, setQuery] = useState("");
  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);
  const families = useMemo(() => buildFamilies(allCharms), [allCharms]);

  // ファミリーごとの現在の所持 Lv (0 = 未所持)
  const getOwnedLevel = (fam: CharmFamily): number => {
    for (let i = fam.ranks.length - 1; i >= 0; i--) {
      if (ownedSet.has(fam.ranks[i].id)) return fam.ranks[i].level;
    }
    return 0;
  };

  // 所持 Lv を変更（同じファミリーの他 Lv は外す）
  const setOwnedLevel = (fam: CharmFamily, level: number) => {
    const next = new Set(ownedSet);
    for (const r of fam.ranks) next.delete(r.id);
    if (level > 0) {
      const target = fam.ranks.find((r) => r.level === level);
      if (target) next.add(target.id);
    }
    onChange([...next].sort((a, b) => a - b));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return families;
    return families.filter((f) => {
      if (f.familyName.toLowerCase().includes(q)) return true;
      return f.ranks.some((r) =>
        r.skills.some((s) => s.skillName.toLowerCase().includes(q)),
      );
    });
  }, [families, query]);

  const ownedCount = families.filter((f) => getOwnedLevel(f) > 0).length;

  const clearAllFiltered = () => {
    const next = new Set(ownedSet);
    for (const f of filtered) {
      for (const r of f.ranks) next.delete(r.id);
    }
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="護石名・スキル名で検索…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Button variant="outline" size="sm" onClick={clearAllFiltered}>
          絞り込み結果を未所持に
        </Button>
      </div>

      {/* カウンタ */}
      <div className="flex gap-2 items-center text-sm text-muted-foreground">
        <Badge variant="secondary">
          所持: {ownedCount} / {families.length} ファミリー
        </Badge>
        {query && <Badge variant="outline">表示: {filtered.length} 件</Badge>}
      </div>

      {/* リスト */}
      <ul className="divide-y border rounded-md">
        {filtered.map((fam) => {
          const ownedLevel = getOwnedLevel(fam);
          const maxLv = fam.ranks[fam.ranks.length - 1].level;
          // プレビュー：所持中の Lv の skill、未所持なら最高 Lv の skill
          const previewCharm = ownedLevel
            ? fam.ranks.find((r) => r.level === ownedLevel)!
            : fam.ranks[fam.ranks.length - 1];

          return (
            <li
              key={fam.familyKey}
              className="flex items-start gap-3 p-3 hover:bg-accent/30"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{fam.familyName}</span>
                  <Badge variant="outline" className="text-xs">
                    Lv 1-{maxLv}
                  </Badge>
                  {ownedLevel > 0 && (
                    <Badge variant="default" className="text-xs">
                      所持 Lv{ownedLevel}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {previewCharm.skills
                    .map((s) => `${s.skillName} Lv${s.level}`)
                    .join(" / ")}
                </div>
              </div>
              <div className="shrink-0 w-28">
                <Select
                  value={String(ownedLevel)}
                  onValueChange={(v) => setOwnedLevel(fam, Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">未所持</SelectItem>
                    {fam.ranks.map((r) => (
                      <SelectItem key={r.id} value={String(r.level)}>
                        Lv{r.level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="p-6 text-center text-sm text-muted-foreground">
            該当する護石がありません
          </li>
        )}
      </ul>
    </div>
  );
}
