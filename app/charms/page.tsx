"use client";

import { useEffect, useState } from "react";
import type { CustomCharm, OwnedCharmsState } from "@/lib/simulator/types";
import {
  loadOwnedCharmsState,
  saveOwnedIds,
  saveCustomCharms,
} from "@/lib/data/ownedCharms";
import { masters } from "@/lib/data/loadMasters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OwnedCharmList } from "./OwnedCharmList";
import { CustomCharmBuilder } from "./CustomCharmBuilder";
import { CustomCharmCard } from "./CustomCharmCard";

const ALL_CHARMS = masters.charms;

export default function CharmsPage() {
  // SSR セーフ：初回マウント後に localStorage を読む
  const [state, setState] = useState<OwnedCharmsState>({
    owned: [],
    custom: [],
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadOwnedCharmsState());
    setHydrated(true);
  }, []);

  // owned/custom それぞれの更新ハンドラ（保存も同時）
  const updateOwned = (owned: number[]) => {
    setState((prev) => ({ ...prev, owned }));
    saveOwnedIds(owned);
  };

  const updateCustom = (custom: CustomCharm[]) => {
    setState((prev) => ({ ...prev, custom }));
    saveCustomCharms(custom);
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">護石管理</h1>
        <p className="text-sm text-muted-foreground">
          所持してる護石と、鑑定で作った護石を登録できるよ。検索エンジンに反映するには
          シミュレーター側の「護石を使う」をオンにしてね。
        </p>
      </header>

      <Tabs defaultValue="owned">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="owned">所持チェック</TabsTrigger>
          <TabsTrigger value="custom">
            鑑定護石{" "}
            <Badge variant="secondary" className="ml-2">
              {state.custom.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owned" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">所持してる護石</CardTitle>
            </CardHeader>
            <CardContent>
              {hydrated ? (
                <OwnedCharmList
                  allCharms={ALL_CHARMS}
                  ownedIds={state.owned}
                  onChange={updateOwned}
                />
              ) : (
                <div className="text-sm text-muted-foreground">読み込み中…</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">鑑定護石を登録</CardTitle>
            </CardHeader>
            <CardContent>
              {hydrated && (
                <CustomCharmBuilder
                  onAdd={(c) => updateCustom([...state.custom, c])}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                登録済み（{state.custom.length} 個）
              </CardTitle>
            </CardHeader>
            <CardContent>
              {state.custom.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  まだ登録された鑑定護石はないよ。上のフォームから追加できる。
                </div>
              ) : (
                <div className="space-y-2">
                  {state.custom.map((c) => (
                    <CustomCharmCard
                      key={c.id}
                      charm={c}
                      onDelete={() =>
                        updateCustom(state.custom.filter((x) => x.id !== c.id))
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
