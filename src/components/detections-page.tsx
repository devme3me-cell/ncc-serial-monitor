"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  ChevronDown,
  ChevronRight,
  LayoutList,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import type { Detection } from "@/lib/types";
import * as store from "@/lib/store";

type FilterType = "all" | "new" | "shopee" | "ruten" | "processed" | "ignored";
type ViewMode = "grouped" | "list";

interface GroupedDetections {
  serialId: string;
  serialNumber: string;
  serialName: string;
  detections: Detection[];
  newCount: number;
  shopeeCount: number;
  rutenCount: number;
}

export function DetectionsPage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const loadDetections = () => {
    const data = store.getDetections();
    // Sort by date, newest first
    data.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    setDetections(data);
  };

  useEffect(() => {
    loadDetections();
    // Expand all groups by default
    const allSerialIds = new Set(store.getDetections().map(d => d.serialId));
    setExpandedGroups(allSerialIds);
  }, []);

  const filteredDetections = detections.filter((d) => {
    switch (filter) {
      case "new":
        return d.status === "new";
      case "shopee":
        return d.isShopee;
      case "ruten":
        return d.isRuten;
      case "processed":
        return d.status === "processed";
      case "ignored":
        return d.status === "ignored";
      default:
        return true;
    }
  });

  // Group detections by serial number
  const groupedDetections = useMemo((): GroupedDetections[] => {
    const groups = new Map<string, GroupedDetections>();

    for (const detection of filteredDetections) {
      const key = detection.serialId;

      if (!groups.has(key)) {
        groups.set(key, {
          serialId: detection.serialId,
          serialNumber: detection.serialNumber,
          serialName: detection.serialName,
          detections: [],
          newCount: 0,
          shopeeCount: 0,
          rutenCount: 0,
        });
      }

      const group = groups.get(key)!;
      group.detections.push(detection);

      if (detection.status === "new") group.newCount++;
      if (detection.isShopee) group.shopeeCount++;
      if (detection.isRuten) group.rutenCount++;
    }

    // Sort groups by newest detection
    return Array.from(groups.values()).sort((a, b) => {
      const aLatest = new Date(a.detections[0]?.detectedAt || 0).getTime();
      const bLatest = new Date(b.detections[0]?.detectedAt || 0).getTime();
      return bLatest - aLatest;
    });
  }, [filteredDetections]);

  const handleUpdateStatus = (id: string, status: Detection["status"]) => {
    store.updateDetectionStatus(id, status);
    loadDetections();
    toast.success(
      status === "processed"
        ? "已標記為處理完成"
        : status === "ignored"
        ? "已標記為忽略"
        : "已標記為新發現"
    );
  };

  const toggleGroup = (serialId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(serialId)) {
        next.delete(serialId);
      } else {
        next.add(serialId);
      }
      return next;
    });
  };

  const expandAllGroups = () => {
    setExpandedGroups(new Set(groupedDetections.map(g => g.serialId)));
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

  const getStatusBadge = (status: Detection["status"]) => {
    switch (status) {
      case "new":
        return <Badge variant="destructive">新發現</Badge>;
      case "processed":
        return <Badge className="bg-green-500">已處理</Badge>;
      case "ignored":
        return <Badge variant="secondary">已忽略</Badge>;
    }
  };

  const filterButtons: { id: FilterType; label: string }[] = [
    { id: "all", label: "全部" },
    { id: "new", label: "新發現" },
    { id: "shopee", label: "蝦皮" },
    { id: "ruten", label: "露天" },
    { id: "processed", label: "已處理" },
    { id: "ignored", label: "已忽略" },
  ];

  const stats = {
    total: detections.length,
    new: detections.filter((d) => d.status === "new").length,
    shopee: detections.filter((d) => d.isShopee).length,
    ruten: detections.filter((d) => d.isRuten).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">偵測記錄</h2>
        <p className="text-muted-foreground">
          查看掃描發現的序號使用記錄
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-orange-200/50 dark:border-orange-900/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">總記錄數</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200/50 dark:border-red-900/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">{stats.new}</p>
              <p className="text-sm text-muted-foreground">待處理</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#EE4D2D]/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#EE4D2D]">{stats.shopee}</p>
              <p className="text-sm text-muted-foreground">蝦皮記錄</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#C7000B]/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#C7000B]">{stats.ruten}</p>
              <p className="text-sm text-muted-foreground">露天記錄</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {filterButtons.map((btn) => (
            <Button
              key={btn.id}
              variant={filter === btn.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(btn.id)}
              className={
                filter === btn.id
                  ? "bg-orange-500 hover:bg-orange-600"
                  : ""
              }
            >
              {btn.label}
              {btn.id === "new" && stats.new > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                  {stats.new}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grouped" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grouped")}
            className={viewMode === "grouped" ? "bg-orange-500 hover:bg-orange-600" : ""}
          >
            <Layers className="w-4 h-4 mr-1" />
            依序號分類
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "bg-orange-500 hover:bg-orange-600" : ""}
          >
            <LayoutList className="w-4 h-4 mr-1" />
            列表
          </Button>
        </div>
      </div>

      {/* Expand/Collapse All (only for grouped view) */}
      {viewMode === "grouped" && groupedDetections.length > 0 && (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={expandAllGroups}>
            全部展開
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAllGroups}>
            全部收合
          </Button>
        </div>
      )}

      {/* Detections Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {viewMode === "grouped" ? "依序號分類" : "偵測列表"}
          </CardTitle>
          <CardDescription>
            {viewMode === "grouped"
              ? `${groupedDetections.length} 個序號，共 ${filteredDetections.length} 筆記錄`
              : `顯示 ${filteredDetections.length} 筆記錄`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDetections.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <p className="font-medium text-lg">
                {filter === "all" ? "目前沒有偵測記錄" : "沒有符合條件的記錄"}
              </p>
              <p className="text-muted-foreground mt-1">
                {filter === "all"
                  ? "執行掃描以開始監控"
                  : "嘗試其他篩選條件"}
              </p>
            </div>
          ) : viewMode === "grouped" ? (
            /* Grouped View */
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {groupedDetections.map((group) => (
                  <Collapsible
                    key={group.serialId}
                    open={expandedGroups.has(group.serialId)}
                    onOpenChange={() => toggleGroup(group.serialId)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      {/* Group Header */}
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            {expandedGroups.has(group.serialId) ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-semibold">{group.serialName}</p>
                              <p className="text-sm font-mono text-muted-foreground">
                                {group.serialNumber}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {group.newCount > 0 && (
                              <Badge variant="destructive">
                                {group.newCount} 新
                              </Badge>
                            )}
                            {group.shopeeCount > 0 && (
                              <Badge className="bg-[#EE4D2D] text-white">
                                {group.shopeeCount} 蝦皮
                              </Badge>
                            )}
                            {group.rutenCount > 0 && (
                              <Badge className="bg-[#C7000B] text-white">
                                {group.rutenCount} 露天
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {group.detections.length} 筆
                            </Badge>
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      {/* Group Content */}
                      <CollapsibleContent>
                        <div className="divide-y">
                          {group.detections.map((detection) => (
                            <DetectionCard
                              key={detection.id}
                              detection={detection}
                              onUpdateStatus={handleUpdateStatus}
                              getStatusBadge={getStatusBadge}
                            />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          ) : (
            /* List View */
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredDetections.map((detection, index) => (
                  <div key={detection.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <DetectionCard
                      detection={detection}
                      onUpdateStatus={handleUpdateStatus}
                      getStatusBadge={getStatusBadge}
                      showSerialInfo
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Extracted Detection Card Component
interface DetectionCardProps {
  detection: Detection;
  onUpdateStatus: (id: string, status: Detection["status"]) => void;
  getStatusBadge: (status: Detection["status"]) => JSX.Element;
  showSerialInfo?: boolean;
}

function DetectionCard({ detection, onUpdateStatus, getStatusBadge, showSerialInfo = false }: DetectionCardProps) {
  return (
    <div className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="font-semibold">
              {detection.pageTitle || "無標題"}
            </p>
            {detection.isShopee && (
              <Badge className="bg-[#EE4D2D] text-white">
                蝦皮
              </Badge>
            )}
            {detection.isRuten && (
              <Badge className="bg-[#C7000B] text-white">
                露天
              </Badge>
            )}
            {getStatusBadge(detection.status)}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {detection.snippet || "無描述"}
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {showSerialInfo && (
              <>
                <span className="font-mono bg-muted px-2 py-0.5 rounded">
                  {detection.serialNumber}
                </span>
                <span>{detection.serialName}</span>
              </>
            )}
            <span>
              {new Date(detection.detectedAt).toLocaleString("zh-TW")}
            </span>
          </div>

          {detection.isShopee && detection.shopeeSellerName && (
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">賣家：</span>
              <a
                href={detection.shopeeSellerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#EE4D2D] hover:underline ml-1"
              >
                {detection.shopeeSellerName}
              </a>
            </div>
          )}

          {detection.isRuten && detection.rutenSellerName && (
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">賣家：</span>
              <a
                href={detection.rutenSellerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C7000B] hover:underline ml-1"
              >
                {detection.rutenSellerName}
              </a>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.open(detection.sourceUrl, "_blank")}
            title="開啟連結"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => window.open(detection.sourceUrl, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                開啟連結
              </DropdownMenuItem>
              {detection.status !== "processed" && (
                <DropdownMenuItem
                  onClick={() => onUpdateStatus(detection.id, "processed")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  標記為已處理
                </DropdownMenuItem>
              )}
              {detection.status !== "ignored" && (
                <DropdownMenuItem
                  onClick={() => onUpdateStatus(detection.id, "ignored")}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  標記為忽略
                </DropdownMenuItem>
              )}
              {detection.status !== "new" && (
                <DropdownMenuItem
                  onClick={() => onUpdateStatus(detection.id, "new")}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  標記為新發現
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
