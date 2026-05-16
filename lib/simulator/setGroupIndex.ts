import type { ArmorSet } from "@/lib/types";

/** シリーズスキル（同 setBonus.id を共有する armorSet 群から N 部位）の発動要件 */
export type SetSkillReq = {
	/** == Skill.id（kind="set" のスキル）*/
	skillId: number;
	skillName: string;
	/** index = level - 1, value = 必要部位数。例: [2, 4]（candidate 間で同一前提）*/
	piecesByLevel: number[];
	/** この skill を発動できる armorSet.id 群（同部位カウントで判定する候補）*/
	candidateSetIds: number[];
};

/** グループスキル（同 groupBonus.id を共有する set 群から N 部位）の発動要件 */
export type GroupSkillReq = {
	groupSkillId: number;
	groupSkillName: string;
	piecesByLevel: number[];
};

export type SetGroupIndex = {
	armorToSetId: Map<number, number>;
	armorToGroupSkillId: Map<number, number | null>;
	setSkillToReq: Map<number, SetSkillReq>;
	groupSkillToReq: Map<number, GroupSkillReq>;
	setIdToBonusSkillId: Map<number, number>;
	setGroupSkillIds: Set<number>;
};

export function buildSetGroupIndex(armorSets: ArmorSet[]): SetGroupIndex {
	const armorToSetId = new Map<number, number>();
	const armorToGroupSkillId = new Map<number, number | null>();
	const setSkillToReq = new Map<number, SetSkillReq>();
	const groupSkillToReq = new Map<number, GroupSkillReq>();
	const setIdToBonusSkillId = new Map<number, number>();
	const setGroupSkillIds = new Set<number>();

	for (const set of armorSets) {
		if (set.pieceIds.length === 0) continue;

		for (const pieceId of set.pieceIds) {
			armorToSetId.set(pieceId, set.id);
			armorToGroupSkillId.set(pieceId, set.groupBonus?.id ?? null);
		}

		// setBonus: 2 部位以上ある set のみ意味がある
		if (set.setBonus && set.pieceIds.length >= 2) {
			const existing = setSkillToReq.get(set.setBonus.id);
			if (existing) {
				// 同 skill を発動できる set が既にあれば candidate に追加
				existing.candidateSetIds.push(set.id);
			} else {
				setSkillToReq.set(set.setBonus.id, {
					skillId: set.setBonus.id,
					skillName: set.setBonus.name,
					piecesByLevel: set.setBonus.ranks.map(
						(r) => r.setPiecesRequired ?? 0,
					),
					candidateSetIds: [set.id],
				});
			}
			setIdToBonusSkillId.set(set.id, set.setBonus.id);
			setGroupSkillIds.add(set.setBonus.id);
		}

		// groupBonus: 全 set 横断でカウントするので first-wins で OK
		if (set.groupBonus) {
			if (!groupSkillToReq.has(set.groupBonus.id)) {
				groupSkillToReq.set(set.groupBonus.id, {
					groupSkillId: set.groupBonus.id,
					groupSkillName: set.groupBonus.name,
					piecesByLevel: set.groupBonus.ranks.map(
						(r) => r.setPiecesRequired ?? 0,
					),
				});
			}
			setGroupSkillIds.add(set.groupBonus.id);
		}
	}

	return {
		armorToSetId,
		armorToGroupSkillId,
		setSkillToReq,
		groupSkillToReq,
		setIdToBonusSkillId,
		setGroupSkillIds,
	};
}