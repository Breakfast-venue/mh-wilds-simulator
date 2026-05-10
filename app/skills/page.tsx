import { masters } from "@/lib/data/loadMasters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SKILL_KIND_JP } from "@/lib/i18n";

export default function SkillsPage() {
  const skills = masters.skills;
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">スキル一覧</h1>
      <p className="text-sm text-muted-foreground mb-4">
        全 {skills.length} 件
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">名前</TableHead>
            <TableHead className="w-[100px]">タイプ</TableHead>
            <TableHead>説明</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skills.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>
                <Badge variant="outline">{SKILL_KIND_JP[s.kind]}</Badge>
              </TableCell>
              <TableCell className="text-sm">{s.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}
