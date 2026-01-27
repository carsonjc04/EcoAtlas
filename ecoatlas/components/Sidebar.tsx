"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

type SidebarProps = {
  title: string;
  subtitle: string;
  badgeLabel?: string;
  activeTab: "story" | "data" | "sources";
  onTabChange: (tab: "story" | "data" | "sources") => void;
  onClose?: () => void;
  story: ReactNode;
  data: ReactNode;
  sources: ReactNode;
};

export default function Sidebar({
  title,
  subtitle,
  badgeLabel,
  activeTab,
  onTabChange,
  onClose,
  story,
  data,
  sources,
}: SidebarProps) {
  return (
    <aside
      className={[
        "w-[420px] max-w-full",
        "h-full",
        "rounded-2xl border border-white/10 bg-black/55 backdrop-blur-xl",
        "shadow-2xl",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold leading-tight text-white">
              {title}
            </h2>
            {badgeLabel && <Badge variant="secondary">{badgeLabel}</Badge>}
          </div>
          <p className="mt-1 text-xs tracking-wide text-white/70">
            {subtitle}
          </p>
        </div>

        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white"
            onClick={onClose}
          >
            Close
          </Button>
        )}
      </div>

      <Separator className="bg-white/10" />

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          onTabChange(value as "story" | "data" | "sources")
        }
        className="flex h-[calc(100%-64px)] flex-col"
      >
        <div className="p-4 pb-2">
          <TabsList className="grid w-full grid-cols-3 border border-white/10 bg-white/5">
            <TabsTrigger className="text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white" value="story">
              Story
            </TabsTrigger>
            <TabsTrigger className="text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white" value="data">
              Data
            </TabsTrigger>
            <TabsTrigger className="text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white" value="sources">
              Sources
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5">
            <TabsContent value="story" className="m-0">
              {story}
            </TabsContent>
            <TabsContent value="data" className="m-0">
              {data}
            </TabsContent>
            <TabsContent value="sources" className="m-0">
              {sources}
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}
