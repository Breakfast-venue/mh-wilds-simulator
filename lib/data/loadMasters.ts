import armorsData from "@/data/mhdb/armors.json";
import armorSetsData from "@/data/mhdb/armorSets.json";
import charmsData from "@/data/mhdb/charms.json";
import decorationsData from "@/data/mhdb/decorations.json";
import skillsData from "@/data/mhdb/skills.json";
import weaponsData from "@/data/mhdb/weapons.json";
import versionData from "@/data/mhdb/version.json";

import { buildSetGroupIndex } from "@/lib/simulator/setGroupIndex";
import type {
  Armor,
  ArmorSet,
  Charm,
  Decoration,
  Skill,
  SkillRank,
  Weapon,
} from "@/lib/types";

// === Normalizers ===
// data-fetcher が出力する canonical JSON は SkillRank を
// { id, name, level } 形で持っているので、simulator が期待する
// { skillId, skillName, level } へここでマッピングする。
// 同様に、Armor の defense フィールド・Charm の gameId なども簡易補完する。
type RawSkillRank = { id: number; name: string; level: number };

function normalizeSkillRanks(raw: RawSkillRank[]): SkillRank[] {
  return raw.map((s) => ({
    skillId: s.id,
    skillName: s.name,
    level: s.level,
  }));
}

// === Load + normalize ===
const skills = skillsData as unknown as Skill[];

const armors = (
  armorsData as unknown as Array<{
    id: number;
    gameId?: number;
    defense?: number;
    defenseBase?: number;
    defenseMax?: number;
    skills: RawSkillRank[];
    [key: string]: unknown;
  }>
).map((a) => ({
  ...a,
  gameId: a.gameId ?? a.id,
  defense: a.defense ?? a.defenseMax ?? a.defenseBase ?? 0,
  skills: normalizeSkillRanks(a.skills ?? []),
})) as unknown as Armor[];

const armorSets = armorSetsData as unknown as ArmorSet[];

const weapons = (
  weaponsData as unknown as Array<{
    skills: RawSkillRank[];
    [key: string]: unknown;
  }>
).map((w) => ({
  ...w,
  skills: normalizeSkillRanks(w.skills ?? []),
})) as unknown as Weapon[];

const decorations = (
  decorationsData as unknown as Array<{
    skills: RawSkillRank[];
    [key: string]: unknown;
  }>
).map((d) => ({
  ...d,
  skills: normalizeSkillRanks(d.skills ?? []),
})) as unknown as Decoration[];

const charms = (
  charmsData as unknown as Array<{
    id: number;
    gameId?: number;
    charmId?: number;
    skills: RawSkillRank[];
    [key: string]: unknown;
  }>
).map((c) => ({
  ...c,
  gameId: c.gameId ?? c.charmId ?? c.id,
  skills: normalizeSkillRanks(c.skills ?? []),
})) as unknown as Charm[];

export const masters = {
  skills,
  armors,
  armorSets,
  weapons,
  decorations,
  charms,
  version: versionData as { version: string },
};

export const setGroupIndex = buildSetGroupIndex(armorSets);
