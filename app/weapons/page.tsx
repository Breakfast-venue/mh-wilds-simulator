"use client";
import { useState, useMemo } from "react";
import { masters } from "@/lib/data/loadMasters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WEAPON_KIND_JP } from "@/lib/i18n";

const WEAPON_TYPES = [
  "全武器種",
  "大剣",
  "片手剣",
  "双剣",
  "太刀",
  "ハンマー",
  "狩猟笛",
  "ランス",
  "ガンランス",
  "スラッシュアックス",
  "チャージアックス",
  "操虫棍",
  "弓",
  "ライトボウガン",
  "ヘビィボウガン",
] as const;

export default function WeaponsPage() {
  const [type, setType] = useState<string>("全武器種");

  // weapons.json側に同じ(typeCode, id)が2回入っている武器が14件存在する（歴戦王系？）
  // → スクレイパー根本対応までの暫定dedupe
  const dedupedAll = useMemo(() => {
    const seen = new Set<string>();
    return masters.weapons.filter((w) => {
      const k = `${w.kind}-${w.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, []);

  const weapons =
    type === "全武器種"
      ? dedupedAll
      : dedupedAll.filter((w) => w.kind === type);

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">武器一覧</h1>
      <div className="flex items-center gap-4 mb-4">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEAPON_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{weapons.length} 件</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">武器種</TableHead>
            <TableHead className="w-[200px]">名前</TableHead>
            <TableHead className="w-[70px]">攻撃</TableHead>
            <TableHead className="w-[70px]">会心</TableHead>
            <TableHead className="w-[100px]">スロット</TableHead>
            <TableHead>スキル</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weapons.map((w) => (
            <TableRow key={`${w.kind}-${w.id}`}>
              <TableCell>
                <Badge variant="outline">{WEAPON_KIND_JP[w.kind]}</Badge>
              </TableCell>
              <TableCell className="font-medium">{w.name}</TableCell>
              <TableCell>{w.damage}</TableCell>
              <TableCell>
                {w.affinity >= 0 ? `+${w.affinity}%` : `${w.affinity}%`}
              </TableCell>
              <TableCell className="text-xs font-mono">
                [{w.slots.join("][")}]
              </TableCell>
              <TableCell>
                {w.skills.map((s, i) => (
                  <span key={`${w.id}-${s.skillId}-${i}`}>
                    {s.skillName} +{s.level}
                  </span>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}
