/**
 * 装備セット検索エンジン
 *
 * - 武器候補 × 5部位防具 の全探索（DFS）
 * - 候補プール絞り込み + 枝刈り + 装飾品貪欲詰め込み（combine.ts）
 * - 結果は防御力降順で最大50件
 */
import type { Armor, ArmorPart, Weapon } from "@/lib/types";
import type {
  EquipmentSet,
  SearchInput,
  SkillRequirement,
  TotalSkill,
} from "./types";
import {
  addResistances,
  addSkillsToMap,
  addSlots,
  buildEquipmentSet,
  emptyResistances,
  emptySlotPool,
  fitDecorations,
  meetsResistanceMin,
  type SlotPool,
} from "./combine";
import { masters as defaultMasters } from "@/lib/data/loadMasters";

const PARTS = ["head", "chest", "arms", "waist", "legs"] as const satisfies readonly ArmorPart[];
type Part = (typeof PARTS)[number];

const MAX_RESULTS = 10;

type Masters = typeof defaultMasters;
type SkillMap = Map<number, TotalSkill>;
type ArmorPool = Record<Part, Armor[]>;

// === 候補プール絞り込み ===
function isCandidateArmor(armor: Armor, reqIds: Set<number>): boolean {
  const hasReqSkill = armor.skills.some((s) => reqIds.has(s.skillId));
  const slotBudget = armor.slots.reduce((s, lv) => s + lv, 0);  // 合計スロットLv
  const hasMeaningfulSlot = slotBudget >= 2;
  return hasReqSkill || hasMeaningfulSlot;
}

function buildArmorPool(
  armors: Armor[],
  requirements: SkillRequirement[],
): ArmorPool {
  const reqIds = new Set(requirements.map((r) => r.skillId));
  const pool: ArmorPool = {
    head: [], chest: [], arms: [], waist: [], legs: [],
  };
  for (const a of armors) {
    if (a.part in pool && isCandidateArmor(a, reqIds)) {
      pool[a.part].push(a);
    }
  }
  return pool;
}

// === 部位ごとの最大スキルLv（枝刈り用 O(1) 参照テーブル）===
function precomputeMaxSkillPerPart(
  pool: ArmorPool,
): Record<Part, Map<number, number>> {
  const out = {} as Record<Part, Map<number, number>>;
  for (const part of PARTS) {
    const m = new Map<number, number>();
    for (const a of pool[part]) {
      for (const s of a.skills) {
        m.set(s.skillId, Math.max(m.get(s.skillId) ?? 0, s.level));
      }
    }
    out[part] = m;
  }
  return out;
}

// === 部位ごとの最大スロット数（装飾品由来の上限見積もり）===
function precomputeMaxSlotCountPerPart(pool: ArmorPool): Record<Part, number> {
  const out = {} as Record<Part, number>;
  for (const part of PARTS) {
    let max = 0;
    for (const a of pool[part]) {
      const cnt = a.slots.filter((s) => s > 0).length;
      if (cnt > max) max = cnt;
    }
    out[part] = max;
  }
  return out;
}

// === メイン: 検索 ===
export function searchEquipmentSets(
  input: SearchInput,
  masters: Masters = defaultMasters,
): EquipmentSet[] {
  console.time("[search] total");
  console.log(`[search] weapons=${masters.weapons.length} armors=${masters.armors.length}`);

  const { desiredSkills, weaponType, resistanceMin } = input;
  if (desiredSkills.length === 0) return [];

  // ⭐ 高ランクのみに絞る（low rank は MVP 範囲外）
  const highArmors = masters.armors.filter((a) => a.rank === "high");
  console.log(`[search] high-rank armors: ${highArmors.length}`);

  const weaponCandidates: (Weapon | undefined)[] = weaponType
    ? masters.weapons.filter((w) => w.kind === weaponType)
    : [undefined];
  console.log(`[search] weapon candidates: ${weaponCandidates.length}`);

  const pool = buildArmorPool(highArmors, desiredSkills);  // ← highArmors を渡す
  console.log("[search] armor pool sizes:", {
    head: pool.head.length, chest: pool.chest.length,
    arms: pool.arms.length, waist: pool.waist.length, legs: pool.legs.length,
  });


  const maxSkill = precomputeMaxSkillPerPart(pool);
  const maxSlot = precomputeMaxSlotCountPerPart(pool);

  const results: EquipmentSet[] = [];
  const chosen: Partial<Record<Part, Armor>> = {};

  for (const weapon of weaponCandidates) {
    if (results.length >= MAX_RESULTS) break;

    const baseSkills: SkillMap = new Map();
    if (weapon) addSkillsToMap(baseSkills, weapon.skills);

    const baseSlots = emptySlotPool();
    if (weapon) addSlots(baseSlots, weapon.slots);

    const dfs = (
      idx: number,
      accSkills: SkillMap,
      accSlots: SlotPool,
      accRes: ReturnType<typeof emptyResistances>,
    ): void => {
      if (results.length >= MAX_RESULTS) return;

      // --- 枝刈り: 残り部位 + 残り部位スロット で要求スキル達成可能か ---
      const remainingParts = PARTS.slice(idx) as Part[];
      const remainingSlotBudget = remainingParts.reduce(
        (sum, p) => sum + maxSlot[p],
        0,
      );
      for (const req of desiredSkills) {
        const cur = accSkills.get(req.skillId)?.level ?? 0;
        const fromArmors = remainingParts.reduce(
          (sum, p) => sum + (maxSkill[p].get(req.skillId) ?? 0),
          0,
        );
        // 装飾品で補える楽観上限 = 残りスロット数（全部Lv1装飾品が入る想定）
        if (cur + fromArmors + remainingSlotBudget < req.level) return;
      }

      // --- 葉ノード: 装飾品詰め込み + 採用判定 ---
      if (idx === PARTS.length) {
        if (!meetsResistanceMin(accRes, resistanceMin)) return;
        const baseArr = Array.from(accSkills.values()).map((s) => ({ ...s }));
        const fit = fitDecorations({
          requirements: desiredSkills,
          baseSkills: baseArr,
          slots: { ...accSlots },
          decorations: masters.decorations,
        });
        if (!fit) return;

        // 念のため全要求達成チェック
        const final = new Map(fit.finalSkills.map((s) => [s.skillId, s.level]));
        for (const req of desiredSkills) {
          if ((final.get(req.skillId) ?? 0) < req.level) return;
        }

        // chosen は head/chest/arms/waist/legs の英語キーで保持されている前提
        results.push(
          buildEquipmentSet({
            weapon,
            head: chosen.head!,
            body: chosen.chest!,
            arms: chosen.arms!,
            waist: chosen.waist!,
            legs: chosen.legs!,
            decorations: fit.fitted,
            requirements: desiredSkills,
          }),
        );
        return;
      }

      // --- 再帰: 次の部位を選ぶ ---
      const part = PARTS[idx];
      for (const armor of pool[part]) {
        if (results.length >= MAX_RESULTS) break;

        // 累積をコピー（参照共有しないよう注意）
        const nextSkills: SkillMap = new Map();
        for (const [k, v] of accSkills) nextSkills.set(k, { ...v });
        addSkillsToMap(nextSkills, armor.skills);

        const nextSlots: SlotPool = { ...accSlots };
        addSlots(nextSlots, armor.slots);

        const nextRes = { ...accRes };
        addResistances(nextRes, armor.resistances);

        chosen[part] = armor;
        dfs(idx + 1, nextSkills, nextSlots, nextRes);
      }
      delete chosen[part];
    };

    dfs(0, baseSkills, baseSlots, emptyResistances());
  }

  // 防御順ソート + 上位 MAX_RESULTS 件
  results.sort((a, b) => b.totalDefense - a.totalDefense);
  console.timeEnd("[search] total");
  console.log(`[search] results: ${results.length}`);
  return results.slice(0, MAX_RESULTS);
}