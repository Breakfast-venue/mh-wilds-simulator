// lib/data/loadMasters.ts
import mhdbArmors      from "@/data/mhdb/armors.json";
import mhdbWeapons     from "@/data/mhdb/weapons.json";
import mhdbSkills      from "@/data/mhdb/skills.json";
import mhdbDecorations from "@/data/mhdb/decorations.json";
import mhdbArmorSets   from "@/data/mhdb/armorSets.json";
import mhdbCharms      from "@/data/mhdb/charms.json";

import kiranicoArmors      from "@/data/kiranico/armors.json";
import kiranicoWeapons     from "@/data/kiranico/weapons.json";
import kiranicoSkills      from "@/data/kiranico/skills.json";
import kiranicoDecorations from "@/data/kiranico/decorations.json";

import type {
  Armor, Weapon, Skill, Decoration, ArmorSet, Charm,
} from "@/lib/types";

const DATA_SOURCE =
  (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mhdb") as "mhdb" | "kiranico";

function buildMhdb() {
  return {
    armors:      mhdbArmors      as unknown as Armor[],
    weapons:     mhdbWeapons     as unknown as Weapon[],
    skills:      mhdbSkills      as unknown as Skill[],
    decorations: mhdbDecorations as unknown as Decoration[],
    armorSets:   mhdbArmorSets   as unknown as ArmorSet[],
    charms:      mhdbCharms      as unknown as Charm[],
  };
}

function buildKiranico() {
  // 旧 JSON を canonical 型に橋渡し（最低限）
  const partMap = { "頭":"head", "胴":"chest", "腕":"arms", "腰":"waist", "脚":"legs" } as const;
  return {
    armors: (kiranicoArmors as any[]).map<Armor>((a, i) => ({
      id: i, gameId: 0, name: a.name,
      part: (partMap as any)[a.part] ?? "head",
      rank: "high", rarity: 0, defense: a.defense,
      resistances: a.resistances, slots: a.slots,
      skills: a.skills.map((s: any) => ({
        skillId: 0, skillName: s.name, level: s.level,
      })),
      seriesId: null, seriesName: a.seriesName ?? "",
    })),
    // 他は空 or 同様にアダプト（ぜんぶ書きたきゃ書くけどもう廃止予定なので最小で OK）
    weapons: [], skills: [], decorations: [], armorSets: [], charms: [],
  };
}

export const masters =
  DATA_SOURCE === "mhdb" ? buildMhdb() : buildKiranico();