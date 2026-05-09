import type { Armor, Weapon, Decoration } from "@/lib/types";

// === 検索入力 ===
export type SkillRequirement = {
  skillId: string;  // 内部ID（Kiranico slug、例: "gong-ji"）
  name: string;     // 表示名（例: "攻撃"）
  level: number;    // 要求Lv
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
  weaponType?: string;          // "大剣" | "片手剣" | ... | undefined（指定なし）
  resistanceMin?: ResistanceMin;
  useOwnedCharms?: boolean;     // MVP: false固定、Phase 3.5で有効化
};

// === 護石（Phase 3.5でlocalStorage実装、型だけ用意）===
export type Charm = {
  id: string;
  name: string;
  skills: { skillId: string; name: string; level: number }[];
  slots: number[];
};

// === 出力（検索結果の1セット）===
export type TotalSkill = {
  skillId: string;
  name: string;
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