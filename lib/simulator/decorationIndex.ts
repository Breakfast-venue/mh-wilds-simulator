// lib/simulator/decorationIndex.ts
import type { Decoration } from "@/lib/types";

/**
 * スキルごとの「単独珠の最小スロットサイズ」情報。
 * - weaponMinSlot: 武器スロット用の単独珠が存在する場合の最小スロットサイズ
 * - armorMinSlot:  防具スロット用の単独珠が存在する場合の最小スロットサイズ
 * 両方 undefined のスキルは「単独珠が存在しない」= 装飾品で埋まらないスキル。
 */
export type DecorationSlotInfo = {
  weaponMinSlot?: 1 | 2 | 3;
  armorMinSlot?: 1 | 2 | 3;
  /** デバッグ用: 代表 skillName をキャッシュ（log 用） */
  skillName?: string;
};

export type SkillSlotMap = Map<number, DecorationSlotInfo>;

/**
 * 装飾品データから「skillId → 最小スロットサイズ」マップを構築する。
 * 単独珠 (skills.length === 1) のみを対象にする。複合珠は無視。
 *
 * 前提:
 *   - decoration.kind === "weapon" → 武器スロット専用珠
 *   - decoration.kind === "armor"  → 防具スロット専用珠
 *   - decoration.slot は 1 | 2 | 3
 */
export function buildSkillSlotMap(decorations: Decoration[]): SkillSlotMap {
  const map: SkillSlotMap = new Map();
  for (const d of decorations) {
    if (d.skills.length !== 1) continue; // 複合珠は無視
    const sk = d.skills[0];
    const slot = d.slot;
    if (slot !== 1 && slot !== 2 && slot !== 3) continue;

    const cur = map.get(sk.skillId) ?? { skillName: sk.skillName };
    if (d.kind === "weapon") {
      if (cur.weaponMinSlot === undefined || slot < cur.weaponMinSlot) {
        cur.weaponMinSlot = slot;
      }
    } else if (d.kind === "armor") {
      if (cur.armorMinSlot === undefined || slot < cur.armorMinSlot) {
        cur.armorMinSlot = slot;
      }
    }
    map.set(sk.skillId, cur);
  }
  return map;
}

// === 開発用デバッグヘルパー（M-3.5 完走後に削除してOK）===
/**
 * 主要スキルの最小スロットを目視確認するための console.log ヘルパー。
 * 期待出力例:
 *   攻撃 (id=72)   weapon=1  armor=なし
 *   弱点特効 (id=57)   weapon=なし  armor=3
 *   納刀術 (id=32)    weapon=なし  armor=1
 */
export function logSkillSlotMapSample(map: SkillSlotMap): void {
  const sampleIds = [72, 57, 32, 119, 117, 22, 3, 60]; // 攻撃,弱点特効,納刀術,匠,業物,超会心,見切り,集中
  console.log("[skillSlotMap] 主要スキルの最小スロット:");
  for (const id of sampleIds) {
    const info = map.get(id);
    if (info) {
      console.log(
        `  ${info.skillName ?? "?"} (id=${id})  weapon=${info.weaponMinSlot ?? "なし"}  armor=${info.armorMinSlot ?? "なし"}`,
      );
    } else {
      console.log(`  (id=${id})  単独珠なし`);
    }
  }
}
