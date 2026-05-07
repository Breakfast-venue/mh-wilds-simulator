"use client";
import { useState } from "react";
import { masters } from "@/lib/data/loadMasters";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const PARTS = ["全部位", "頭", "胴", "腕", "腰", "脚"] as const;

export default function ArmorsPage() {
  const [part, setPart] = useState<string>("全部位");
  const armors =
    part === "全部位"
      ? masters.armors
      : masters.armors.filter((a) => a.part === part);

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">防具一覧</h1>
      <div className="flex items-center gap-4 mb-4">
        <Select value={part} onValueChange={setPart}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARTS.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{armors.length} 件</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">部位</TableHead>
            <TableHead className="w-[200px]">名前</TableHead>
            <TableHead className="w-[180px]">シリーズ</TableHead>
            <TableHead className="w-[70px]">防御</TableHead>
            <TableHead className="w-[100px]">スロット</TableHead>
            <TableHead>スキル</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {armors.map((a) => (
            <TableRow key={a.id}>
              <TableCell><Badge variant="outline">{a.part}</Badge></TableCell>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell className="text-sm">{a.seriesName}</TableCell>
              <TableCell>{a.defense}</TableCell>
              <TableCell className="text-xs font-mono">[{a.slots.join("][")}]</TableCell>
              <TableCell>
                {a.skills.map((s) => (
                  <Badge key={s.skillId} variant="secondary" className="mr-1 mb-1">
                    {s.name} +{s.level}
                  </Badge>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}