import type { Armor, Weapon, Decoration } from "@/lib/types";
import type {
  Charm,
  EquipmentSet,
  ResistanceMin,
  SkillRequirement,
  TotalResistances,
  TotalSkill,
} from "./types";

// === スキル合算 ===
type SkillMap = Map<string, TotalSkill>;

export function addSkillsToMap(
  map: SkillMap,
  skills: { skillId: string; name: string; level: number }[],
): void {
  for (const s of skills) {
    const cur = map.get(s.skillId);
    if (cur) {
      cur.level += s.level;
    } else {
      map.set(s.skillId, { skillId: s.skillId, name: s.name, level: s.level });
    }
  }
}

export function mapToSkills(map: SkillMap): TotalSkill[] {
  return Array.from(map.values()).sort((a, b) => b.level - a.level);
}

// === 耐性合算 ===
export function emptyResistances(): TotalResistances {
  return { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 };
}

export function addResistances(
  acc: TotalResistances,
  r: TotalResistances,
): void {
  acc.fire += r.fire;
  acc.water += r.water;
  acc.thunder += r.thunder;
  acc.ice += r.ice;
  acc.dragon += r.dragon;
}

export function meetsResistanceMin(
  total: TotalResistances,
  min?: ResistanceMin,
): boolean {
  if (!min) return true;
  return (
    (min.fire ?? -Infinity) <= total.fire &&
    (min.water ?? -Infinity) <= total.water &&
    (min.thunder ?? -Infinity) <= total.thunder &&
    (min.ice ?? -Infinity) <= total.ice &&
    (min.dragon ?? -Infinity) <= total.dragon
  );
}

// === スロット集約 ===
export type SlotPool = { 1: number; 2: number; 3: number };

export function emptySlotPool(): SlotPool {
  return { 1: 0, 2: 0, 3: 0 };
}

export function addSlots(pool: SlotPool, slots: number[]): void {
  for (const lv of slots) {
    if (lv === 1 || lv === 2 || lv === 3) pool[lv]++;
  }
}

// minLv以上で空きがある最小のスロットLvを返す（無ければnull）
function findSmallestAvailableSlot(
  pool: SlotPool,
  minLv: number,
): 1 | 2 | 3 | null {
  for (const lv of [1, 2, 3] as const) {
    if (lv >= minLv && pool[lv] > 0) return lv;
  }
  return null;
}

// === 装飾品の貪欲詰め込み ===
// 不足スキルが大きい順に処理 + 装飾品はslotLv昇順で詰める。
// 詰めきれない or スロット不足なら null（このセットは不採用）。
export function fitDecorations(args: {
  requirements: SkillRequirement[];
  baseSkills: TotalSkill[];
  slots: SlotPool;
  decorations: Decoration[];
}): { fitted: Decoration[]; finalSkills: TotalSkill[] } | null {
  const slots: SlotPool = { ...args.slots };

  const skillMap: SkillMap = new Map();
  for (const s of args.baseSkills) {
    skillMap.set(s.skillId, { ...s });
  }

  // 装飾品.skill は "攻撃" 等の表示名なので requirements 経由で skillId に紐付ける
  const nameToReq = new Map(args.requirements.map((r) => [r.name, r]));
  const decoByReq = new Map<string, Decoration[]>();
  for (const d of args.decorations) {
    const req = nameToReq.get(d.skill);
    if (!req) continue; // 検索条件にない珠は無視
    if (d.slotLv < 1 || d.slotLv > 3) continue;
    const arr = decoByReq.get(req.skillId) ?? [];
    arr.push(d);
    decoByReq.set(req.skillId, arr);
  }
  for (const arr of decoByReq.values()) {
    arr.sort((a, b) => a.slotLv - b.slotLv);
  }

  const fitted: Decoration[] = [];

  // 不足が大きいスキルから処理（早期失敗で枝刈り効率UP）
  const sorted = [...args.requirements].sort((a, b) => {
    const aLack = a.level - (skillMap.get(a.skillId)?.level ?? 0);
    const bLack = b.level - (skillMap.get(b.skillId)?.level ?? 0);
    return bLack - aLack;
  });

  for (const req of sorted) {
    let lack = req.level - (skillMap.get(req.skillId)?.level ?? 0);
    if (lack <= 0) continue;

    const cands = decoByReq.get(req.skillId) ?? [];
    if (cands.length === 0) return null;

    while (lack > 0) {
      let placed = false;
      for (const deco of cands) {
        const targetLv = findSmallestAvailableSlot(slots, deco.slotLv);
        if (targetLv === null) continue;
        slots[targetLv]--;
        fitted.push(deco);
        addSkillsToMap(skillMap, [
          { skillId: req.skillId, name: req.name, level: deco.skillLv },
        ]);
        lack -= deco.skillLv;
        placed = true;
        break;
      }
      if (!placed) return null; // スロット枠が足りない
    }
  }

  return { fitted, finalSkills: mapToSkills(skillMap) };
}

// === EquipmentSet 組み立て ===
export function buildEquipmentSet(args: {
  weapon?: Weapon;
  head: Armor;
  body: Armor;
  arms: Armor;
  waist: Armor;
  legs: Armor;
  charm?: Charm;
  decorations: Decoration[];
  requirements: SkillRequirement[];
}): EquipmentSet {
  const armors = [args.head, args.body, args.arms, args.waist, args.legs];
  const nameToReq = new Map(args.requirements.map((r) => [r.name, r]));

  // スキル合算（武器 + 5部位 + 護石 + 装飾品）
  const skillMap: SkillMap = new Map();
  if (args.weapon) addSkillsToMap(skillMap, args.weapon.skills);
  for (const a of armors) addSkillsToMap(skillMap, a.skills);
  if (args.charm) addSkillsToMap(skillMap, args.charm.skills);
  for (const d of args.decorations) {
    const req = nameToReq.get(d.skill);
    if (req) {
      addSkillsToMap(skillMap, [
        { skillId: req.skillId, name: req.name, level: d.skillLv },
      ]);
    }
  }

  // 耐性合算（防具のみ）
  const totalRes = emptyResistances();
  for (const a of armors) addResistances(totalRes, a.resistances);

  // 防御合算（防具 + 武器のdefenseBonus）
  let totalDef = armors.reduce((sum, a) => sum + a.defense, 0);
  if (args.weapon?.defenseBonus) totalDef += args.weapon.defenseBonus;

  return {
    weapon: args.weapon,
    head: args.head,
    body: args.body,
    arms: args.arms,
    waist: args.waist,
    legs: args.legs,
    charm: args.charm,
    decorations: args.decorations,
    totalSkills: mapToSkills(skillMap),
    totalResistances: totalRes,
    totalDefense: totalDef,
  };
}