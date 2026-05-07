import armorsData from "@/data/armors.json";
import weaponsData from "@/data/weapons.json";
import skillsData from "@/data/skills.json";
import decorationsData from "@/data/decorations.json";

import type { Armor, Weapon, Skill, Decoration } from "@/lib/types";

export const masters = {
  armors: armorsData as Armor[],
  weapons: weaponsData as Weapon[],
  skills: skillsData as Skill[],
  decorations: decorationsData as Decoration[],
};