import { masters } from "@/lib/data/loadMasters";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function DecorationsPage() {
  const decorations = masters.decorations;
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">装飾品一覧</h1>
      <p className="text-sm text-muted-foreground mb-4">全 {decorations.length} 件</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">名前</TableHead>
            <TableHead className="w-[160px]">スキル</TableHead>
            <TableHead className="w-[80px]">スキルLv</TableHead>
            <TableHead className="w-[90px]">スロットLv</TableHead>
            <TableHead>説明</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {decorations.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell>{d.skills.map(s => s.skillName).join(" / ")}</TableCell>
              <TableCell><Badge variant="secondary">Lv{d.skills[0]?.level ?? 0}</Badge></TableCell>
              <TableCell><Badge variant="outline">[{d.slot}]</Badge></TableCell>
              <TableCell className="text-sm">{d.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}