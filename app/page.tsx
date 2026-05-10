import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PAGES = [
  {
    href: "/simulator",
    title: "🔍 装備検索",
    desc: "スキル指定で装備セット提案",
  },
  { href: "/skills", title: "スキル", desc: "全スキル一覧" },
  { href: "/decorations", title: "装飾品", desc: "全装飾品一覧" },
  { href: "/armors", title: "防具", desc: "シリーズ・部位別" },
  { href: "/weapons", title: "武器", desc: "武器種別一覧" },
];

export default function Home() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">⚔️ MH Wilds Skill Simulator</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PAGES.map((p) => (
          <Link key={p.href} href={p.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>{p.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
