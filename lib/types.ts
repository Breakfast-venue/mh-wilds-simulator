// ===== Shared =====
export type Resistances = {
  fire: number;
  water: number;
  thunder: number;
  ice: number;
  dragon: number;
};

export type SkillRank = {
  skillId: number;
  skillName: string; // 表示用キャッシュ（join 不要にするため）
  level: number;
};

export type SkillRankInfo = {
  level: number;
  description: string;
  setPiecesRequired: number | null; // armor/weapon kind は null、group/set kind は数値
};

// ===== Skill =====
export type SkillKind = "armor" | "weapon" | "group" | "set";

export type Skill = {
  id: number;
  gameId: number;
  name: string;
  kind: SkillKind;
  maxLv: number;
  description: string;
  ranks: SkillRankInfo[];
};

// ===== Armor =====
export type ArmorPart = "head" | "chest" | "arms" | "waist" | "legs";
export type ArmorRank = "low" | "high";

export type Armor = {
  id: number;
  gameId: number;
  name: string;
  part: ArmorPart;
  rank: ArmorRank;
  rarity: number;
  defense: number;
  resistances: Resistances;
  slots: number[];
  skills: SkillRank[];
  seriesId: number | null;
  seriesName: string;
};

// ===== ArmorSet =====
export type SetBonusRank = {
  level: number;
  setPiecesRequired: number;
  description: string;
};
export type SetBonus = {
  id: number;
  name: string;
  ranks: SetBonusRank[];
};
export type ArmorSet = {
  id: number;
  gameId: number;
  name: string;
  rank: ArmorRank;
  pieceIds: number[];
  setBonus: SetBonus | null;
  groupBonus: SetBonus | null;
};

// ===== Weapon =====
export type WeaponKind =
  | "bow" | "charge-blade" | "dual-blades" | "great-sword"
  | "gunlance" | "hammer" | "heavy-bowgun" | "hunting-horn"
  | "insect-glaive" | "lance" | "light-bowgun" | "long-sword"
  | "switch-axe" | "sword-shield";

export type Weapon = {
  id: number;
  gameId: number; // 武器ツリーの根 ID（個別識別には使えない、教訓15）
  name: string;
  kind: WeaponKind;
  rarity: number;
  damage: number; // raw 値
  affinity: number;
  defenseBonus: number;
  slots: number[];
  skills: SkillRank[];
};

// ===== Decoration =====
export type DecorationKind = "armor" | "weapon";

export type Decoration = {
  id: number;
  gameId: number;
  name: string;
  kind: DecorationKind;
  slot: number;
  rarity: number;
  description: string;
  skills: SkillRank[]; // 複合珠は length=2
};

// ===== Charm =====
export type Charm = {
  id: number;       // フラット化後の rank ごとのユニーク ID
  gameId: number;
  charmId: number;  // family の ID（Ⅰ/Ⅱ/Ⅲ で同じ値）
  name: string;     // 例「防風の護石Ⅱ」
  level: number;    // Ⅰ=1 / Ⅱ=2 / Ⅲ=3
  rarity: number;
  description: string;
  skills: SkillRank[];
};