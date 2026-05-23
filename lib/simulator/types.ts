import type {
  Armor,
  Weapon,
  Decoration,
  Charm,
  WeaponKind,
  SkillKind,
} from "@/lib/types";

// === 検索入力 ===
export type SkillCategory = "armor" | "weapon" | "group" | "set";
export type SkillRequirement = {
  skillId: number;
  skillName: string;
  level: number;
  kind: SkillKind; // "armor" | "weapon" | "group" | "set"
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
/**
 * 鑑定護石のレアリティ（RARE5〜8）
 */
export type CharmRarity = 5 | 6 | 7 | 8;

/**
 * 鑑定護石のスロット 1 個分
 * - kind: "armor" = 防具スロ / "weapon" = 武器スロ
 * - size: 0 = 未使用 / 1-3 = スロットサイズ
 */
export type CustomCharmSlot = {
  kind: "armor" | "weapon";
  size: 0 | 1 | 2 | 3;
};

/**
 * 鑑定護石（ユーザーが自由にスキル + スロットを組んだカスタム護石）
 * - skills: 最大 3 個
 * - slots: 必ず 3 個（未使用は size: 0）
 * - 名前は rarity + skills から自動生成（保存しない、参照時に都度生成）
 */
export type CustomCharm = {
  id: string; // "custom-<uuid>"
  rarity: CharmRarity;
  skills: {
    skillId: number;
    skillName: string;
    level: number;
  }[];
  slots: [CustomCharmSlot, CustomCharmSlot, CustomCharmSlot];
};

/**
 * localStorage に永続化する護石の状態
 */
export type OwnedCharmsState = {
  owned: number[];
  custom: CustomCharm[];
};

export type SearchInput = {
  desiredSkills: SkillRequirement[];
  weaponType?: WeaponKind;
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

export type ActivatedSetBonus = {
  skillId: number;
  skillName: string;
  level: number;
  pieces: number;
  setId: number;
  setName: string;
};

export type ActivatedGroupBonus = {
  groupSkillId: number;
  groupSkillName: string;
  level: number;
  pieces: number;
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
  activatedSetBonus: ActivatedSetBonus[];
  activatedGroupBonus: ActivatedGroupBonus[];
};
