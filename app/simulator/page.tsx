"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { masters } from "@/lib/data/loadMasters";
import { searchEquipmentSets } from "@/lib/simulator/search";
import type {
  EquipmentSet, ResistanceMin, SkillRequirement,
} from "@/lib/simulator/types";
import { ResultCard } from "./ResultCard";

const WEAPON_TYPES = [
  "指定なし", "大剣", "片手剣", "双剣", "太刀", "ハンマー", "狩猟笛",
  "ランス", "ガンランス", "スラッシュアックス", "チャージアックス",
  "操虫棍", "弓", "ライトボウガン", "ヘビィボウガン",
] as const;

const RES_KEYS: { key: keyof ResistanceMin; label: string }[] = [
  { key: "fire",    label: "火" },
  { key: "water",   label: "水" },
  { key: "thunder", label: "雷" },
  { key: "ice",     label: "氷" },
  { key: "dragon",  label: "龍" },
];

export default function SimulatorPage() {
  // === 検索条件の状態 ===
  const [skillReqs, setSkillReqs] = useState<SkillRequirement[]>([]);
  const [pickedSkillId, setPickedSkillId] = useState<string>("");
  const [pickedLevel, setPickedLevel] = useState<number>(1);
  const [weaponType, setWeaponType] = useState<string>("指定なし");
  const [resMin, setResMin] = useState<ResistanceMin>({});

  // === 結果 ===
  const [results, setResults] = useState<EquipmentSet[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  // === 選択肢: 防具スキルだけ（武器スキル/シリーズスキルはMVP対象外）===
  const armorSkills = useMemo(
    () =>
      masters.skills
        .filter((s) => s.type === "防具")
        .sort((a, b) => a.name.localeCompare(b.name, "ja")),
    [],
  );

  const handleAddSkill = () => {
    if (!pickedSkillId) return;
    if (skillReqs.some((r) => r.skillId === pickedSkillId)) return; // 重複ガード
    const skill = armorSkills.find((s) => s.id === pickedSkillId);
    if (!skill) return;
    setSkillReqs([
      ...skillReqs,
      { skillId: skill.id, name: skill.name, level: pickedLevel },
    ]);
    setPickedSkillId("");
    setPickedLevel(1);
  };

  const handleRemoveSkill = (skillId: string) => {
    setSkillReqs(skillReqs.filter((r) => r.skillId !== skillId));
  };

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
    // setTimeoutで一旦UI更新を挟む（重い検索中も「検索中…」表示が出る）
    setTimeout(() => {
      const t0 = performance.now();
      const hasResMin = Object.values(resMin).some((v) => v !== undefined);
      const out = searchEquipmentSets({
        desiredSkills: skillReqs,
        weaponType: weaponType === "指定なし" ? undefined : weaponType,
        resistanceMin: hasResMin ? resMin : undefined,
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

      {/* === スキル要求 === */}
      <Card>
        <CardHeader>
          <CardTitle>スキル要求</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {skillReqs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                まだスキルが選択されてないよ
              </p>
            ) : (
              skillReqs.map((r) => (
                <Badge
                  key={r.skillId}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveSkill(r.skillId)}
                  title="クリックで削除"
                >
                  {r.name} +{r.level} ✕
                </Badge>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">スキル</Label>
              <Select value={pickedSkillId} onValueChange={setPickedSkillId}>
                <SelectTrigger>
                  <SelectValue placeholder="スキルを選択..." />
                </SelectTrigger>
                <SelectContent>
                  {armorSkills.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[100px]">
              <Label className="text-xs">Lv</Label>
              <Input
                type="number"
                min={1}
                max={7}
                value={pickedLevel}
                onChange={(e) =>
                  setPickedLevel(Math.max(1, Number(e.target.value) || 1))
                }
              />
            </div>
            <Button onClick={handleAddSkill} disabled={!pickedSkillId}>
              追加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* === 武器種 === */}
      <Card>
        <CardHeader>
          <CardTitle>武器種</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={weaponType} onValueChange={setWeaponType}>
            <SelectTrigger className="w-[220px]">
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

      {/* === 検索ボタン === */}
      <div className="flex items-center gap-3">
        <Button
          size="lg"
          onClick={handleSearch}
          disabled={searching || skillReqs.length === 0}
        >
          {searching ? "検索中…" : "🔍 検索"}
        </Button>
        {skillReqs.length === 0 && (
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
          {results.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                条件を満たす装備セットが見つからなかったよ。スキルLvを下げる or 武器種指定を外してみて。
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