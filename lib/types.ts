export type Skill = {
    id: string;
    name: string;
    maxLv: number;
    description: string;
    type: string;
    detailUrl: string;
  };
  
  export type Decoration = {
    id: string;
    name: string;
    slotLv: number;
    skill: string;
    skillLv: number;
    description: string;
    detailUrl: string;
  };
  
  export type ArmorSkill = {
    name: string;
    level: number;
    skillId: string;
  };
  
  export type Resistances = {
    fire: number;
    water: number;
    thunder: number;
    ice: number;
    dragon: number;
  };
  
  export type Armor = {
    id: string;
    name: string;
    part: "頭" | "胴" | "腕" | "腰" | "脚";
    seriesId: string;
    seriesName: string;
    defense: number;
    resistances: Resistances;
    slots: number[];
    skills: ArmorSkill[];
  };
  
  export type Weapon = {
    id: string;
    type: string;
    typeCode: string;
    name: string;
    atk: number;
    affinity: number;
    slots: number[];
    skills: ArmorSkill[];
    detailUrl: string;
    defenseBonus?: number;
    ammo?: string[];
  };