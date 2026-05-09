import type { Armor, Weapon, Decoration, Charm, WeaponKind } from "@/lib/types";

// === 検索入力 ===
export type SkillRequirement = {
  skillId: number;
  skillName: string;
  level: number;
};

export type ResistanceMin = {
  fire?: number;
  water?: number;
  thunder?: number;
  ice?: number;
  dragon?: number;
};

export type SearchInput = {
  desiredSkills: SkillRequirement[];
  weaponType?: WeaponKind;      // "sword-shield" | "great-sword" | ...
  resistanceMin?: ResistanceMin;
  useOwnedCharms?: boolean;
};

// === 出力（検索結果の1セット）===
export type TotalSkill = {
  skillId: number;
  skillName: string;
  level: number;
};

export type TotalResistances = {
  fire: number;
  water: number;
  thunder: number;
  ice: number;
  dragon: number;
};

export type EquipmentSet = {
  weapon?: Weapon;
  head: Armor;
  body: Armor;
  arms: Armor;
  waist: Armor;
  legs: Armor;
  charm?: Charm;
  decorations: Decoration[];
  totalSkills: TotalSkill[];
  totalResistances: TotalResistances;
  totalDefense: number;
};