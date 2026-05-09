import type { SkillKind, WeaponKind, ArmorPart } from "@/lib/types";

export const SKILL_KIND_JP: Record<SkillKind, string> = {
  armor: "防具",
  weapon: "武器",
  group: "グループ",
  set: "シリーズ",
};

export const WEAPON_KIND_JP: Record<WeaponKind, string> = {
  bow: "弓",
  "charge-blade": "チャージアックス",
  "dual-blades": "双剣",
  "great-sword": "大剣",
  gunlance: "ガンランス",
  hammer: "ハンマー",
  "heavy-bowgun": "ヘビィボウガン",
  "hunting-horn": "狩猟笛",
  "insect-glaive": "操虫棍",
  lance: "ランス",
  "light-bowgun": "ライトボウガン",
  "long-sword": "太刀",
  "switch-axe": "スラッシュアックス",
  "sword-shield": "片手剣",
};

export const ARMOR_PART_JP: Record<ArmorPart, string> = {
  head: "頭",
  chest: "胴",
  arms: "腕",
  waist: "腰",
  legs: "脚",
};