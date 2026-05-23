"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillPicker } from "@/components/SkillPicker";
import { setGroupIndex } from "@/lib/data/loadMasters";
import { WEAPON_KIND_JP } from "@/lib/i18n";
import { searchEquipmentSets } from "@/lib/simulator/search";
import type {
  EquipmentSet,
  ResistanceMin,
  SkillRequirement,
} from "@/lib/simulator/types";
import type { WeaponKind } from "@/lib/types";
import { ResultCard } from "./ResultCard";

// === 開発用デバッグログ（production 化のとき消す）===
console.log("[setGroupIndex]", {
  setSkillCount: setGroupIndex.setSkillToReq.size,
  groupSkillCount: setGroupIndex.groupSkillToReq.size,
  setGroupSkillIdsSize: setGroupIndex.setGroupSkillIds.size,
  armorMappedCount: setGroupIndex.armorToSetId.size,
  sampleSet_106_黒蝕竜の力: setGroupIndex.setSkillToReq.get(106),
  sampleSet_71_火竜の力: setGroupIndex.setSkillToReq.get(71),
  sampleGroup_132_鱗張りの技法: setGroupIndex.groupSkillToReq.get(132),
});

// "any" = 指定なしのセンチネル。それ以外は API の WeaponKind enum 値
const WEAPON_KIND_OPTIONS: Array<"any" | WeaponKind> = [
  "any",
  "great-sword",
  "long-sword",
  "sword-shield",
  "dual-blades",
  "hammer",
  "hunting-horn",
  "lance",
  "gunlance",
  "switch-axe",
  "charge-blade",
  "insect-glaive",
  "bow",
  "light-bowgun",
  "heavy-bowgun",
];

const RES_KEYS: { key: keyof ResistanceMin; label: string }[] = [
  { key: "fire", label: "火" },
  { key: "water", label: "水" },
  { key: "thunder", label: "雷" },
  { key: "ice", label: "氷" },
  { key: "dragon", label: "龍" },
];

export default function SimulatorPage() {
  // === 検索条件の状態 ===
  const [selected, setSelected] = useState<SkillRequirement[]>([]);
  const [weaponType, setWeaponType] = useState<"any" | WeaponKind>("any");
  const [resMin, setResMin] = useState<ResistanceMin>({});
  const [useOwnedCharms, setUseOwnedCharms] = useState(false);

  // === 結果 ===
  const [results, setResults] = useState<EquipmentSet[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  const handleResMinChange = (key: keyof ResistanceMin, value: string) => {
    if (value === "") {
      setResMin((prev) => ({ ...prev, [key]: undefined }));
      return;
    }
    const n = Number(value);
    setResMin((prev) => ({
      ...prev,
      [key]: Number.isNaN(n) ? undefined : n,
    }));
  };

  const handleSearch = () => {
    setSearching(true);
    // setTimeout で一旦 UI 更新を挟む（重い検索中も「検索中…」表示が出る）
    setTimeout(() => {
      const t0 = performance.now();
      const hasResMin = Object.values(resMin).some((v) => v !== undefined);
      const out = searchEquipmentSets({
        desiredSkills: selected,
        weaponType: weaponType === "any" ? undefined : weaponType,
        resistanceMin: hasResMin ? resMin : undefined,
        useOwnedCharms,
      });
      setResults(out);
      setSearched(true);
      setElapsedMs(performance.now() - t0);
      setSearching(false);
    }, 0);
  };

  return (
    <main className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🔍 装備セット検索</h1>
        <p className="text-sm text-muted-foreground mt-1">
          スキル要求を指定すると、達成可能な装備セットを最大50件まで提案するよ。
        </p>
      </div>

      {/* === スキル要求（M-6: SkillPicker に統合） === */}
      <Card>
        <CardHeader>
          <CardTitle>スキル要求</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillPicker selected={selected} onChange={setSelected} />
        </CardContent>
      </Card>

      {/* === 武器種 === */}
      <Card>
        <CardHeader>
          <CardTitle>武器種</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={weaponType}
            onValueChange={(v) => setWeaponType(v as "any" | WeaponKind)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEAPON_KIND_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k === "any" ? "指定なし" : WEAPON_KIND_JP[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* === 耐性下限 === */}
      <Card>
        <CardHeader>
          <CardTitle>耐性下限（任意）</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {RES_KEYS.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input
                type="number"
                placeholder="—"
                value={resMin[key] ?? ""}
                onChange={(e) => handleResMinChange(key, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* === 護石 === */}
      <Card>
        <CardHeader>
          <CardTitle>護石</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <Label htmlFor="use-charms" className="text-base">
                所持・鑑定護石を使う
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                護石管理ページで登録した護石を検索に組み込む。
              </p>
            </div>
            {useOwnedCharms && (
              <div className="rounded-md border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-xs space-y-1">
                <div className="font-medium">
                  ⚠️ 重い検索になることがあります
                </div>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>護石数 × 武器候補数だけ計算量が増える</li>
                  <li>8 秒で自動打ち切り（見つかった分だけ返す）</li>
                  <li>武器種を絞る / 鑑定護石を減らすと速くなる</li>
                </ul>
              </div>
            )}
            <Switch
              id="use-charms"
              checked={useOwnedCharms}
              onCheckedChange={setUseOwnedCharms}
            />
          </div>
          <div className="text-xs">
            <Link
              href="/charms"
              className="text-blue-600 underline hover:no-underline"
            >
              🔮 護石を編集する →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* === 検索ボタン === */}
      <div className="flex items-center gap-3">
        <Button
          size="lg"
          onClick={handleSearch}
          disabled={searching || selected.length === 0}
        >
          {searching ? "検索中…" : "🔍 検索"}
        </Button>
        {selected.length === 0 && (
          <span className="text-sm text-muted-foreground">
            スキルを1つ以上追加してね
          </span>
        )}
      </div>

      {/* === 結果 === */}
      {searched && (
        <div>
          <h2 className="text-xl font-bold mb-3">
            検索結果 {results.length} 件
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({elapsedMs.toFixed(0)}ms)
            </span>
          </h2>
          {searched && elapsedMs > 7500 && (
            <div className="text-xs text-yellow-700 dark:text-yellow-400">
              ⏱ 重い検索のため打ち切られた可能性あり。結果は不完全かもしれない。
            </div>
          )}
          {results.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                条件を満たす装備セットが見つからなかったよ。スキルLvを下げる or
                武器種指定を外してみて。
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map((set, i) => (
                <ResultCard key={i} set={set} index={i + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
