/**
 * 装備セット検索エンジン
 *
 * - 武器候補 × 5部位防具 の全探索（DFS）
 * - 候補プール絞り込み + 枝刈り + 装飾品貪欲詰め込み（combine.ts）
 * - M-4: set/group skill 対応（armorSet.id カウント / groupBonus.id カウントで判定）
 * - 結果は防御力降順で最大10件
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
  computeActivatedBonuses,
  emptyResistances,
  emptySlotPool,
  fitDecorations,
  meetsResistanceMin,
  type SlotPool,
} from "./combine";
import {
  masters as defaultMasters,
  setGroupIndex,
} from "@/lib/data/loadMasters";

const PARTS = [
  "head",
  "chest",
  "arms",
  "waist",
  "legs",
] as const satisfies readonly ArmorPart[];
type Part = (typeof PARTS)[number];

const MAX_RESULTS = 10;

type Masters = typeof defaultMasters;
type SkillMap = Map<number, TotalSkill>;
type ArmorPool = Record<Part, Armor[]>;

// === 候補プール絞り込み ===
function isCandidateArmor(
  armor: Armor,
  reqArmorWeaponIds: Set<number>,
  reqSetIds: Set<number>,
  reqGroupSkillIds: Set<number>,
): boolean {
  // armor/weapon kind の要求スキルを持つ
  const hasReqSkill = armor.skills.some((s) =>
    reqArmorWeaponIds.has(s.skillId),
  );
  const slotBudget = armor.slots.reduce((s, lv) => s + lv, 0);
  const hasMeaningfulSlot = slotBudget >= 2;
  // 要求 set の candidate 部位
  const setId = setGroupIndex.armorToSetId.get(armor.id);
  const matchesSet = setId !== undefined && reqSetIds.has(setId);
  // 要求 group の部位
  const groupId = setGroupIndex.armorToGroupSkillId.get(armor.id);
  const matchesGroup = groupId != null && reqGroupSkillIds.has(groupId);
  return hasReqSkill || hasMeaningfulSlot || matchesSet || matchesGroup;
}

function buildArmorPool(
  armors: Armor[],
  requirements: SkillRequirement[],
): ArmorPool {
  const reqArmorWeaponIds = new Set(
    requirements
      .filter((r) => r.kind === "armor" || r.kind === "weapon")
      .map((r) => r.skillId),
  );
  // この要求 set skill を発動できる candidateSetIds の和集合
  const reqSetIds = new Set<number>();
  for (const r of requirements) {
    if (r.kind !== "set") continue;
    const sr = setGroupIndex.setSkillToReq.get(r.skillId);
    if (sr) for (const sid of sr.candidateSetIds) reqSetIds.add(sid);
  }
  // 要求 group skill の id
  const reqGroupSkillIds = new Set(
    requirements.filter((r) => r.kind === "group").map((r) => r.skillId),
  );

  const pool: ArmorPool = {
    head: [],
    chest: [],
    arms: [],
    waist: [],
    legs: [],
  };
  for (const a of armors) {
    if (
      a.part in pool &&
      isCandidateArmor(a, reqArmorWeaponIds, reqSetIds, reqGroupSkillIds)
    ) {
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
        // setBonus/groupBonus 由来は Lv 合算判定から除外
        if (setGroupIndex.setGroupSkillIds.has(s.skillId)) continue;
        m.set(s.skillId, Math.max(m.get(s.skillId) ?? 0, s.level));
      }
    }
    out[part] = m;
  }
  return out;
}

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
  console.log(
    `[search] weapons=${masters.weapons.length} armors=${masters.armors.length}`,
  );

  const { desiredSkills, weaponType, resistanceMin } = input;
  if (desiredSkills.length === 0) return [];

  // === 要求スキルを kind 別に分割 ===
  const armorWeaponReqs = desiredSkills.filter(
    (r) => r.kind === "armor" || r.kind === "weapon",
  );
  const setReqs = desiredSkills.filter((r) => r.kind === "set");
  const groupReqs = desiredSkills.filter((r) => r.kind === "group");
  console.log(
    `[search] reqs: armor/weapon=${armorWeaponReqs.length} set=${setReqs.length} group=${groupReqs.length}`,
  );

  // 高ランクのみ
  const highArmors = masters.armors.filter((a) => a.rank === "high");
  console.log(`[search] high-rank armors: ${highArmors.length}`);

  const weaponCandidates: (Weapon | undefined)[] = weaponType
    ? masters.weapons.filter((w) => w.kind === weaponType)
    : [undefined];
  console.log(`[search] weapon candidates: ${weaponCandidates.length}`);

  const pool = buildArmorPool(highArmors, desiredSkills);
  console.log("[search] armor pool sizes:", {
    head: pool.head.length,
    chest: pool.chest.length,
    arms: pool.arms.length,
    waist: pool.waist.length,
    legs: pool.legs.length,
  });

  const maxSkill = precomputeMaxSkillPerPart(pool);
  const maxSlot = precomputeMaxSlotCountPerPart(pool);

  const results: EquipmentSet[] = [];
  const chosen: Partial<Record<Part, Armor>> = {};

  for (const weapon of weaponCandidates) {
    if (results.length >= MAX_RESULTS) break;

    const baseSkills: SkillMap = new Map();
    if (weapon) addSkillsToMap(baseSkills, weapon.skills); // weapon.skills は set/group を含まない前提

    const baseSlots = emptySlotPool();
    if (weapon) addSlots(baseSlots, weapon.slots);

    const dfs = (
      idx: number,
      accSkills: SkillMap,
      accSlots: SlotPool,
      accRes: ReturnType<typeof emptyResistances>,
      setCount: Map<number, number>,
      groupCount: Map<number, number>,
    ): void => {
      if (results.length >= MAX_RESULTS) return;

      const remainingParts = PARTS.slice(idx) as Part[];
      const remainingSlotBudget = remainingParts.reduce(
        (sum, p) => sum + maxSlot[p],
        0,
      );
      const remainingPartCount = remainingParts.length;

      // --- 枝刈り 1: armor/weapon kind の Lv 達成見込み ---
      for (const req of armorWeaponReqs) {
        const cur = accSkills.get(req.skillId)?.level ?? 0;
        const fromArmors = remainingParts.reduce(
          (sum, p) => sum + (maxSkill[p].get(req.skillId) ?? 0),
          0,
        );
        if (cur + fromArmors + remainingSlotBudget < req.level) return;
      }

      // --- 枝刈り 2: set kind の部位数達成見込み ---
      for (const req of setReqs) {
        const sr = setGroupIndex.setSkillToReq.get(req.skillId);
        if (!sr) return;
        const needed = sr.piecesByLevel[req.level - 1] ?? Infinity;
        // candidate の中で最も部位数稼げてる set + 残り部位を全部この set に振れる楽観仮定
        const maxPossible = Math.max(
          ...sr.candidateSetIds.map(
            (sid) => (setCount.get(sid) ?? 0) + remainingPartCount,
          ),
        );
        if (maxPossible < needed) return;
      }

      // --- 枝刈り 3: group kind の部位数達成見込み ---
      for (const req of groupReqs) {
        const gr = setGroupIndex.groupSkillToReq.get(req.skillId);
        if (!gr) return;
        const needed = gr.piecesByLevel[req.level - 1] ?? Infinity;
        if ((groupCount.get(req.skillId) ?? 0) + remainingPartCount < needed)
          return;
      }

      // --- 葉ノード ---
      if (idx === PARTS.length) {
        if (!meetsResistanceMin(accRes, resistanceMin)) return;

        // set kind 充足チェック
        for (const req of setReqs) {
          const sr = setGroupIndex.setSkillToReq.get(req.skillId);
          if (!sr) return;
          const needed = sr.piecesByLevel[req.level - 1] ?? Infinity;
          const ok = sr.candidateSetIds.some(
            (sid) => (setCount.get(sid) ?? 0) >= needed,
          );
          if (!ok) return;
        }
        // group kind 充足チェック
        for (const req of groupReqs) {
          const gr = setGroupIndex.groupSkillToReq.get(req.skillId);
          if (!gr) return;
          const needed = gr.piecesByLevel[req.level - 1] ?? Infinity;
          if ((groupCount.get(req.skillId) ?? 0) < needed) return;
        }

        // armor/weapon kind は装飾品で補完
        const baseArr = Array.from(accSkills.values()).map((s) => ({ ...s }));
        const fit = fitDecorations({
          requirements: armorWeaponReqs,
          baseSkills: baseArr,
          slots: { ...accSlots },
          decorations: masters.decorations,
        });
        if (!fit) return;

        const final = new Map(fit.finalSkills.map((s) => [s.skillId, s.level]));
        for (const req of armorWeaponReqs) {
          if ((final.get(req.skillId) ?? 0) < req.level) return;
        }

        // ★ 発動 bonus を計算（要求されてない set/group も全部表示する）
        const { activatedSetBonus, activatedGroupBonus } =
          computeActivatedBonuses({
            setCount,
            groupCount,
            setGroupIndex,
            armorSets: masters.armorSets,
          });

        results.push(
          buildEquipmentSet({
            weapon,
            head: chosen.head!,
            body: chosen.chest!,
            arms: chosen.arms!,
            waist: chosen.waist!,
            legs: chosen.legs!,
            decorations: fit.fitted,
            requirements: armorWeaponReqs,
            activatedSetBonus,
            activatedGroupBonus,
            excludeSetGroupSkillIds: setGroupIndex.setGroupSkillIds,
          }),
        );
        return;
      }

      // --- 再帰: 次の部位 ---
      const part = PARTS[idx];
      for (const armor of pool[part]) {
        if (results.length >= MAX_RESULTS) break;

        const nextSkills: SkillMap = new Map();
        for (const [k, v] of accSkills) nextSkills.set(k, { ...v });
        // armor.skills のうち setBonus/groupBonus 由来は Lv 合算から除外
        addSkillsToMap(
          nextSkills,
          armor.skills,
          setGroupIndex.setGroupSkillIds,
        );

        const nextSlots: SlotPool = { ...accSlots };
        addSlots(nextSlots, armor.slots);

        const nextRes = { ...accRes };
        addResistances(nextRes, armor.resistances);

        // setCount / groupCount を increment（コピー渡し）
        const nextSetCount = new Map(setCount);
        const setId = setGroupIndex.armorToSetId.get(armor.id);
        if (setId !== undefined) {
          nextSetCount.set(setId, (nextSetCount.get(setId) ?? 0) + 1);
        }
        const nextGroupCount = new Map(groupCount);
        const groupId = setGroupIndex.armorToGroupSkillId.get(armor.id);
        if (groupId != null) {
          nextGroupCount.set(groupId, (nextGroupCount.get(groupId) ?? 0) + 1);
        }

        chosen[part] = armor;
        dfs(
          idx + 1,
          nextSkills,
          nextSlots,
          nextRes,
          nextSetCount,
          nextGroupCount,
        );
      }
      delete chosen[part];
    };

    dfs(0, baseSkills, baseSlots, emptyResistances(), new Map(), new Map());
  }

  results.sort((a, b) => b.totalDefense - a.totalDefense);
  console.timeEnd("[search] total");
  console.log(`[search] results: ${results.length}`);
  return results.slice(0, MAX_RESULTS);
}
