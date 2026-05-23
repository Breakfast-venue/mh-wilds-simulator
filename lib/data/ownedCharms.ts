import type { Charm } from "@/lib/types";
import type {
  CharmRarity,
  CustomCharm,
  CustomCharmSlot,
  OwnedCharmsState,
} from "@/lib/simulator/types";

// ============================================================
// localStorage キー（mhdb:v1: プレフィックス必須）
// ============================================================
const KEY_OWNED = "mhdb:v1:ownedCharms";
const KEY_CUSTOM = "mhdb:v1:customCharms";

const isBrowser = () => typeof window !== "undefined";

// ============================================================
// RARE ベース名マッピング
// ============================================================
export const CHARM_RARITY_BASE_NAME: Record<CharmRarity, string> = {
  5: "未解の護石",
  6: "史伝の護石",
  7: "秘歴の護石",
  8: "栄世の護石",
};

const ROMAN = ["", "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ"];
const toRoman = (n: number) => ROMAN[n] ?? String(n);

/**
 * 鑑定護石の自動命名
 * 例: "RARE8 栄世の護石+攻撃Ⅲ+見切りⅡ"
 */
export function buildCustomCharmName(c: CustomCharm): string {
  const base = CHARM_RARITY_BASE_NAME[c.rarity];
  const skillsPart = c.skills
    .map((s) => `${s.skillName}${toRoman(s.level)}`)
    .join("+");
  return skillsPart
    ? `RARE${c.rarity} ${base}+${skillsPart}`
    : `RARE${c.rarity} ${base}`;
}

// ============================================================
// Read
// ============================================================
export function loadOwnedCharmsState(): OwnedCharmsState {
  if (!isBrowser()) return { owned: [], custom: [] };

  const owned = readJSON<number[]>(KEY_OWNED, []);
  const custom = readJSON<CustomCharm[]>(KEY_CUSTOM, []);

  const ownedSafe = Array.isArray(owned)
    ? owned.filter((n): n is number => typeof n === "number")
    : [];

  const customSafe = Array.isArray(custom)
    ? custom.filter(isValidCustomCharm)
    : [];

  return { owned: ownedSafe, custom: customSafe };
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[ownedCharms] failed to parse ${key}, fallback used`, e);
    return fallback;
  }
}

function isValidSlot(x: unknown): x is CustomCharmSlot {
  if (!x || typeof x !== "object") return false;
  const s = x as Partial<CustomCharmSlot>;
  return (
    (s.kind === "armor" || s.kind === "weapon") &&
    typeof s.size === "number" &&
    s.size >= 0 &&
    s.size <= 3
  );
}

function isValidCustomCharm(x: unknown): x is CustomCharm {
  if (!x || typeof x !== "object") return false;
  const c = x as Partial<CustomCharm>;
  const rarityOk =
    c.rarity === 5 || c.rarity === 6 || c.rarity === 7 || c.rarity === 8;
  const skillsOk =
    Array.isArray(c.skills) &&
    c.skills.every(
      (s) =>
        typeof s.skillId === "number" &&
        typeof s.skillName === "string" &&
        typeof s.level === "number",
    );
  const slotsOk =
    Array.isArray(c.slots) &&
    c.slots.length === 3 &&
    c.slots.every(isValidSlot);
  return typeof c.id === "string" && rarityOk && skillsOk && slotsOk;
}

// ============================================================
// Write
// ============================================================
export function saveOwnedIds(owned: number[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY_OWNED, JSON.stringify(owned));
  } catch (e) {
    console.warn("[ownedCharms] failed to save owned", e);
  }
}

export function saveCustomCharms(custom: CustomCharm[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY_CUSTOM, JSON.stringify(custom));
  } catch (e) {
    console.warn("[ownedCharms] failed to save custom", e);
  }
}

export function clearOwnedCharms(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(KEY_OWNED);
  window.localStorage.removeItem(KEY_CUSTOM);
}

// ============================================================
// CustomCharm → Charm 変換（検索エンジンに渡す表示用 Charm）
// id は負値連番（既存護石の正値 ID と衝突回避）
// slots は Charm 型に乗らないので呼び出し側で別途引き渡す
// ============================================================
export function customCharmToCharm(c: CustomCharm, index: number): Charm {
  const negId = -(index + 1);
  const displayName = buildCustomCharmName(c);
  return {
    id: negId,
    gameId: 0,
    charmId: negId,
    name: displayName,
    level: 1,
    rarity: c.rarity,
    description: `鑑定護石: ${c.skills
      .map((s) => `${s.skillName} Lv${s.level}`)
      .join(" / ")}`,
    skills: c.skills.map((s) => ({
      skillId: s.skillId,
      skillName: s.skillName,
      level: s.level,
    })),
  };
}

// ============================================================
// 検索エンジン用：charm + 付随スロットのペア
// ============================================================
export type ActiveCharm = {
  charm: Charm;
  /** 防具スロット候補（size 0 はスキップ済み、降順ソート） */
  armorSlots: number[];
  /** 武器スロット候補（size 0 はスキップ済み、降順ソート） */
  weaponSlots: number[];
};

/**
 * 検索エンジンに渡す charm セットを作る
 * - 所持リスト由来は armor/weapon ともに空配列（既存 mhdb 護石はスロットなし）
 * - 鑑定護石由来は slots を kind 別に分解
 */
export function getActiveCharms(
  state: OwnedCharmsState,
  allCharms: Charm[],
): ActiveCharm[] {
  const ownedSet = new Set(state.owned);
  const ownedActive: ActiveCharm[] = allCharms
    .filter((c) => ownedSet.has(c.id))
    .map((charm) => ({ charm, armorSlots: [], weaponSlots: [] }));

  const customActive: ActiveCharm[] = state.custom.map((c, i) => {
    const charm = customCharmToCharm(c, i);
    const armorSlots = c.slots
      .filter((s) => s.kind === "armor" && s.size > 0)
      .map((s) => s.size)
      .sort((a, b) => b - a);
    const weaponSlots = c.slots
      .filter((s) => s.kind === "weapon" && s.size > 0)
      .map((s) => s.size)
      .sort((a, b) => b - a);
    return { charm, armorSlots, weaponSlots };
  });

  return [...ownedActive, ...customActive];
}

// ============================================================
// UUID 生成
// ============================================================
export function newCustomCharmId(): string {
  if (isBrowser() && "randomUUID" in crypto) {
    return `custom-${crypto.randomUUID()}`;
  }
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================
// CustomCharm のファクトリー（UI からの新規作成用）
// ============================================================
export function createEmptyCustomCharm(rarity: CharmRarity = 5): CustomCharm {
  return {
    id: newCustomCharmId(),
    rarity,
    skills: [],
    slots: [
      { kind: "armor", size: 0 },
      { kind: "armor", size: 0 },
      { kind: "armor", size: 0 },
    ],
  };
}
