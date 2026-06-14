/**
 * 装備セット検索エンジン
 * - 武器候補 × 護石候補 × 5部位防具 の全探索（DFS）
 * - 候補プール絞り込み + 枝刈り + 装飾品貪欲詰め込み
 * - B-2: 護石統合 / 8 秒タイムアウト / pool ソート最適化
 */
import type { Armor, ArmorPart, Charm, Weapon } from "@/lib/types";
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
import {
  loadOwnedCharmsState,
  getActiveCharms,
  type ActiveCharm,
} from "@/lib/data/ownedCharms";

// === デバッグ（本番 false、調査時だけ true）===
const DEBUG = false;
const dlog = (...args: unknown[]) => {
  if (DEBUG) console.log(...args);
};

const PARTS = [
  "head",
  "chest",
  "arms",
  "waist",
  "legs",
] as const satisfies readonly ArmorPart[];
type Part = (typeof PARTS)[number];

const MAX_RESULTS = 10;
const SEARCH_TIMEOUT_MS = 8_000;

type Masters = typeof defaultMasters;
type SkillMap = Map<number, TotalSkill>;
type ArmorPool = Record<Part, Armor[]>;

function isCandidateArmor(
  armor: Armor,
  reqArmorWeaponIds: Set<number>,
  reqSetIds: Set<number>,
  reqGroupSkillIds: Set<number>,
): boolean {
  const hasReqSkill = armor.skills.some((s) =>
    reqArmorWeaponIds.has(s.skillId),
  );
  const slotBudget = armor.slots.reduce((s, lv) => s + lv, 0);
  const hasMeaningfulSlot = slotBudget >= 1; // 1 以上に緩和
  const setId = setGroupIndex.armorToSetId.get(armor.id);
  const matchesSet = setId !== undefined && reqSetIds.has(setId);
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
  const reqSetIds = new Set<number>();
  for (const r of requirements) {
    if (r.kind !== "set") continue;
    const sr = setGroupIndex.setSkillToReq.get(r.skillId);
    if (sr) for (const sid of sr.candidateSetIds) reqSetIds.add(sid);
  }
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

  // 1) 候補を全部 push
  for (const a of armors) {
    if (
      a.part in pool &&
      isCandidateArmor(a, reqArmorWeaponIds, reqSetIds, reqGroupSkillIds)
    ) {
      pool[a.part].push(a);
    }
  }

  // 2) 各部位を「要求マッチ度降順 → スロ降順」でソート
  for (const part of PARTS) {
    pool[part].sort((a, b) => {
      const aSkillScore = a.skills.reduce(
        (s, sk) => s + (reqArmorWeaponIds.has(sk.skillId) ? sk.level : 0),
        0,
      );
      const bSkillScore = b.skills.reduce(
        (s, sk) => s + (reqArmorWeaponIds.has(sk.skillId) ? sk.level : 0),
        0,
      );
      if (aSkillScore !== bSkillScore) return bSkillScore - aSkillScore;
      const aSlot = a.slots.reduce((s, l) => s + l, 0);
      const bSlot = b.slots.reduce((s, l) => s + l, 0);
      return bSlot - aSlot;
    });
  }

  dlog("[buildArmorPool] sizes:", {
    head: pool.head.length,
    chest: pool.chest.length,
    arms: pool.arms.length,
    waist: pool.waist.length,
    legs: pool.legs.length,
  });

  return pool;
}

function precomputeMaxSkillPerPart(
  pool: ArmorPool,
): Record<Part, Map<number, number>> {
  const out = {} as Record<Part, Map<number, number>>;
  for (const part of PARTS) {
    const m = new Map<number, number>();
    for (const a of pool[part]) {
      for (const s of a.skills) {
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

export function searchEquipmentSets(
  input: SearchInput,
  masters: Masters = defaultMasters,
): EquipmentSet[] {
  if (DEBUG) console.time("[search] total");

  const { desiredSkills, weaponType, resistanceMin } = input;
  if (desiredSkills.length === 0) return [];

  dlog("[search] desiredSkills:", desiredSkills);

  const startTime = performance.now();
  const isTimedOut = () => performance.now() - startTime > SEARCH_TIMEOUT_MS;

  const charmCandidates: (ActiveCharm | undefined)[] = (() => {
    if (!input.useOwnedCharms) return [undefined];
    const state = loadOwnedCharmsState();
    const actives = getActiveCharms(state, masters.charms);
    dlog(`[search] active charms: ${actives.length}`);

    const reqIds = new Set(
      desiredSkills
        .filter((r) => r.kind === "armor" || r.kind === "weapon")
        .map((r) => r.skillId),
    );
    actives.sort((a, b) => {
      const aScore = a.charm.skills.reduce(
        (s, sk) => s + (reqIds.has(sk.skillId) ? sk.level : 0),
        0,
      );
      const bScore = b.charm.skills.reduce(
        (s, sk) => s + (reqIds.has(sk.skillId) ? sk.level : 0),
        0,
      );
      return bScore - aScore;
    });
    return [...actives, undefined];
  })();
  dlog(`[search] charm candidates: ${charmCandidates.length}`);

  const armorWeaponReqs = desiredSkills.filter(
    (r) => r.kind === "armor" || r.kind === "weapon",
  );
  const setReqs = desiredSkills.filter((r) => r.kind === "set");
  const groupReqs = desiredSkills.filter((r) => r.kind === "group");
  dlog(
    `[search] reqs: armor/weapon=${armorWeaponReqs.length} set=${setReqs.length} group=${groupReqs.length}`,
  );

  const highArmors = masters.armors.filter((a) => a.rank === "high");
  dlog(`[search] high-rank armors: ${highArmors.length}`);

  const weaponCandidates: (Weapon | undefined)[] = (() => {
    if (!weaponType) return [undefined];
    const reqIds = new Set(armorWeaponReqs.map((r) => r.skillId));
    const filtered = masters.weapons.filter((w) => w.kind === weaponType);
    filtered.sort((a, b) => {
      const aSkill = (a.skills ?? []).reduce(
        (s, sk) => s + (reqIds.has(sk.skillId) ? sk.level : 0),
        0,
      );
      const bSkill = (b.skills ?? []).reduce(
        (s, sk) => s + (reqIds.has(sk.skillId) ? sk.level : 0),
        0,
      );
      if (aSkill !== bSkill) return bSkill - aSkill;
      const aSlot = (a.slots ?? []).reduce((s, l) => s + l, 0);
      const bSlot = (b.slots ?? []).reduce((s, l) => s + l, 0);
      return bSlot - aSlot;
    });
    return filtered;
  })();
  dlog(`[search] weapon candidates: ${weaponCandidates.length}`);

  const pool = buildArmorPool(highArmors, desiredSkills);

  // DFS 部位順 = pool が小さい順（早期枝刈りのため）
  const partOrder = [...PARTS].sort(
    (a, b) => pool[a].length - pool[b].length,
  ) as Part[];
  dlog("[search] DFS part order:", partOrder);

  const maxSkill = precomputeMaxSkillPerPart(pool);
  const maxSlot = precomputeMaxSlotCountPerPart(pool);

  const results: EquipmentSet[] = [];
  const chosen: Partial<Record<Part, Armor>> = {};
  let currentCharm: Charm | undefined;

  for (const weapon of weaponCandidates) {
    if (results.length >= MAX_RESULTS || isTimedOut()) break;

    for (const active of charmCandidates) {
      if (results.length >= MAX_RESULTS || isTimedOut()) break;

      const baseSkills: SkillMap = new Map();
      if (weapon) addSkillsToMap(baseSkills, weapon.skills);
      if (active) addSkillsToMap(baseSkills, active.charm.skills);

      const baseSlots = emptySlotPool();
      if (weapon) addSlots(baseSlots, weapon.slots);
      if (active) {
        addSlots(baseSlots, active.armorSlots);
        addSlots(baseSlots, active.weaponSlots);
      }

      currentCharm = active?.charm;

      const dfs = (
        idx: number,
        accSkills: SkillMap,
        accSlots: SlotPool,
        accRes: ReturnType<typeof emptyResistances>,
        setCount: Map<number, number>,
        groupCount: Map<number, number>,
      ): void => {
        if (results.length >= MAX_RESULTS || isTimedOut()) return;

        const remainingParts = partOrder.slice(idx) as Part[];
        const remainingSlotBudget = remainingParts.reduce(
          (sum, p) => sum + maxSlot[p],
          0,
        );
        const remainingPartCount = remainingParts.length;

        for (const req of armorWeaponReqs) {
          const cur = accSkills.get(req.skillId)?.level ?? 0;
          const fromArmors = remainingParts.reduce(
            (sum, p) => sum + (maxSkill[p].get(req.skillId) ?? 0),
            0,
          );
          if (cur + fromArmors + remainingSlotBudget < req.level) return;
        }

        for (const req of setReqs) {
          const sr = setGroupIndex.setSkillToReq.get(req.skillId);
          if (!sr) return;
          const needed = sr.piecesByLevel[req.level - 1] ?? Infinity;
          const maxPossible = Math.max(
            ...sr.candidateSetIds.map(
              (sid) => (setCount.get(sid) ?? 0) + remainingPartCount,
            ),
          );
          if (maxPossible < needed) return;
        }

        for (const req of groupReqs) {
          const gr = setGroupIndex.groupSkillToReq.get(req.skillId);
          if (!gr) return;
          const needed = gr.piecesByLevel[req.level - 1] ?? Infinity;
          if ((groupCount.get(req.skillId) ?? 0) + remainingPartCount < needed)
            return;
        }

        if (idx === partOrder.length) {
          if (!meetsResistanceMin(accRes, resistanceMin)) return;

          for (const req of setReqs) {
            const sr = setGroupIndex.setSkillToReq.get(req.skillId);
            if (!sr) return;
            const needed = sr.piecesByLevel[req.level - 1] ?? Infinity;
            const ok = sr.candidateSetIds.some(
              (sid) => (setCount.get(sid) ?? 0) >= needed,
            );
            if (!ok) return;
          }
          for (const req of groupReqs) {
            const gr = setGroupIndex.groupSkillToReq.get(req.skillId);
            if (!gr) return;
            const needed = gr.piecesByLevel[req.level - 1] ?? Infinity;
            if ((groupCount.get(req.skillId) ?? 0) < needed) return;
          }

          const baseArr = Array.from(accSkills.values()).map((s) => ({
            ...s,
          }));
          const fit = fitDecorations({
            requirements: armorWeaponReqs,
            baseSkills: baseArr,
            slots: { ...accSlots },
            decorations: masters.decorations,
          });
          if (!fit) return;

          const final = new Map(
            fit.finalSkills.map((s) => [s.skillId, s.level]),
          );
          for (const req of armorWeaponReqs) {
            if ((final.get(req.skillId) ?? 0) < req.level) return;
          }

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
              charm: currentCharm,
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

        const part = partOrder[idx];
        for (const armor of pool[part]) {
          if (results.length >= MAX_RESULTS || isTimedOut()) break;

          const nextSkills: SkillMap = new Map();
          for (const [k, v] of accSkills) nextSkills.set(k, { ...v });
          addSkillsToMap(
            nextSkills,
            armor.skills,
            setGroupIndex.setGroupSkillIds,
          );

          const nextSlots: SlotPool = { ...accSlots };
          addSlots(nextSlots, armor.slots);

          const nextRes = { ...accRes };
          addResistances(nextRes, armor.resistances);

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
  }

  results.sort((a, b) => b.totalDefense - a.totalDefense);
  if (DEBUG) console.timeEnd("[search] total");
  if (isTimedOut()) {
    console.warn(`[search] ⏱ TIMED OUT after ${SEARCH_TIMEOUT_MS}ms`);
  }
  dlog(`[search] results: ${results.length}`);
  return results.slice(0, MAX_RESULTS);
}
