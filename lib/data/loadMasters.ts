// lib/data/loadMasters.ts
import mhdbArmors from "@/data/mhdb/armors.json";
import mhdbWeapons from "@/data/mhdb/weapons.json";
import mhdbSkills from "@/data/mhdb/skills.json";
import mhdbDecorations from "@/data/mhdb/decorations.json";
import mhdbArmorSets from "@/data/mhdb/armorSets.json";
import mhdbCharms from "@/data/mhdb/charms.json";
import kiranicoArmors from "@/data/kiranico/armors.json";
import kiranicoWeapons from "@/data/kiranico/weapons.json";
import kiranicoSkills from "@/data/kiranico/skills.json";
import kiranicoDecorations from "@/data/kiranico/decorations.json";
import type {
  Armor,
  Weapon,
  Skill,
  Decoration,
  ArmorSet,
  Charm,
  SkillRank,
} from "@/lib/types";
import {
  buildSetGroupIndex,
  type SetGroupIndex,
} from "@/lib/simulator/setGroupIndex";

const DATA_SOURCE = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mhdb") as
  | "mhdb"
  | "kiranico";

// === 生 JSON の skills 形式 ({ id, name, level }) → canonical SkillRank への変換 ===
type RawSkillEntry = { id: number; name: string; level: number };

function normalizeSkills(raw: unknown): SkillRank[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawSkillEntry[]).map((s) => ({
    skillId: s.id,
    skillName: s.name,
    level: s.level,
  }));
}

function normalizeArmors(raw: unknown[]): Armor[] {
  return (
    raw as Array<
      Record<string, unknown> & {
        skills: unknown;
        defenseMax?: number;
        defenseBase?: number;
      }
    >
  ).map((a) => ({
    ...a,
    skills: normalizeSkills(a.skills),
    defense: (a.defenseMax ?? a.defenseBase ?? 0) as number,
  })) as unknown as Armor[];
}

function normalizeWeapons(raw: unknown[]): Weapon[] {
  return (raw as Array<Record<string, unknown> & { skills: unknown }>).map(
    (w) => ({ ...w, skills: normalizeSkills(w.skills) }),
  ) as unknown as Weapon[];
}

function normalizeDecorations(raw: unknown[]): Decoration[] {
  return (raw as Array<Record<string, unknown> & { skills: unknown }>).map(
    (d) => ({ ...d, skills: normalizeSkills(d.skills) }),
  ) as unknown as Decoration[];
}

function normalizeCharms(raw: unknown[]): Charm[] {
  return (raw as Array<Record<string, unknown> & { skills: unknown }>).map(
    (c) => ({ ...c, skills: normalizeSkills(c.skills) }),
  ) as unknown as Charm[];
}

function buildMhdb() {
  return {
    armors: normalizeArmors(mhdbArmors as unknown[]),
    weapons: normalizeWeapons(mhdbWeapons as unknown[]),
    skills: mhdbSkills as unknown as Skill[],
    decorations: normalizeDecorations(mhdbDecorations as unknown[]),
    armorSets: mhdbArmorSets as unknown as ArmorSet[],
    charms: normalizeCharms(mhdbCharms as unknown[]),
  };
}

function buildKiranico() {
  const partMap = {
    頭: "head",
    胴: "chest",
    腕: "arms",
    腰: "waist",
    脚: "legs",
  } as const;
  return {
    armors: (kiranicoArmors as any[]).map<Armor>((a, i) => ({
      id: i,
      gameId: 0,
      name: a.name,
      part: (partMap as any)[a.part] ?? "head",
      rank: "high",
      rarity: 0,
      defense: a.defense,
      resistances: a.resistances,
      slots: a.slots,
      skills: a.skills.map((s: any) => ({
        skillId: 0,
        skillName: s.name,
        level: s.level,
      })),
      seriesId: null,
      seriesName: a.seriesName ?? "",
    })),
    weapons: [],
    skills: [],
    decorations: [],
    armorSets: [] as ArmorSet[],
    charms: [],
  };
}

export const masters = DATA_SOURCE === "mhdb" ? buildMhdb() : buildKiranico();

// M-4: グループ/シリーズスキル対応のための前処理インデックス
// kiranico モードでは armorSets が空なので、空インデックスが返るだけで安全
export const setGroupIndex: SetGroupIndex = buildSetGroupIndex(
  masters.armorSets,
);
