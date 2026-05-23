"use client";
import { useState } from "react";
import { SkillPicker } from "@/components/SkillPicker";
import type { SkillRequirement } from "@/lib/simulator/types";

export default function Preview() {
  const [selected, setSelected] = useState<SkillRequirement[]>([]);
  return (
    <div className="container mx-auto max-w-2xl p-6">
      <SkillPicker selected={selected} onChange={setSelected} />
      <pre className="mt-4 rounded bg-muted p-3 text-xs">
        {JSON.stringify(selected, null, 2)}
      </pre>
    </div>
  );
}
