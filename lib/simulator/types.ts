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

/**
 * 装飾品ポリシー
 * - "unlimited": 装飾品は無制限に使える前提（葉ノード判定はスロット充足のみ）
 * - "none":      装飾品を一切使わない（装備本体スキルのみで要求満たす必要あり）
 *
 * 既定値は "unlimited"。将来 "owned"（手持ちのみ）を Phase 4 で追加予定。
 */
export type DecorationPolicy = "unlimited" | "none";

export type SearchInput = {
  desiredSkills: SkillRequirement[];
  weaponType?: WeaponKind; // "sword-shield" | "great-sword" | ...
  resistanceMin?: ResistanceMin;
  useOwnedCharms?: boolean;
  decorationPolicy?: DecorationPolicy; // 既定 "unlimited"（M-3.5）
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
