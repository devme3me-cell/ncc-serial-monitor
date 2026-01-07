"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  History,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Search,
  Timer,
  TrendingUp,
} from "lucide-react";
import type { ScanHistory } from "@/lib/types";
import * as store from "@/lib/store";

interface ScanHistoryPanelProps {
  onRefresh?: () => void;
}

export function ScanHistoryPanel({ onRefresh }: ScanHistoryPanelProps) {
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadHistory = () => {
    setHistory(store.getScanHistory());
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const handleClearHistory = () => {
    if (confirm("確定要清除所有掃描歷史記錄嗎？")) {
      store.clearScanHistory();
      loadHistory();
    }
  };

  const getTypeLabel = (type: ScanHistory["type"]) => {
    switch (type) {
      case "manual":
        return { label: "手動掃描", color: "bg-blue-500" };
      case "auto":
        return { label: "自動掃描", color: "bg-green-500" };
      case "on-add":
        return { label: "新增掃描", color: "bg-orange-500" };
    }
  };

  const getStatusIcon = (status: ScanHistory["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "partial":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-TW", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "剛剛";
    if (minutes < 60) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    if (days < 7) return `${days} 天前`;
    return formatTime(timestamp);
  };

  const stats = store.getScanHistoryStats();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <History className="w-4 h-4" />
          掃描歷史
          {stats.todayScans > 0 && (
            <Badge variant="secondary" className="ml-1">
              今日 {stats.todayScans}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            掃描歷史記錄
          </DialogTitle>
          <DialogDescription>
            查看過去的掃描記錄和結果統計
          </DialogDescription>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{stats.totalScans}</p>
            <p className="text-xs text-muted-foreground">總掃描次數</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{stats.todayScans}</p>
            <p className="text-xs text-muted-foreground">今日掃描</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-orange-500">{stats.totalDetectionsFound}</p>
            <p className="text-xs text-muted-foreground">發現總數</p>
          </div>
        </div>

        <Separator />

        {/* History List */}
        {history.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">暫無掃描記錄</p>
            <p className="text-sm text-muted-foreground mt-1">
              執行掃描後會在此顯示歷史記錄
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {history.map((item, index) => {
                const typeInfo = getTypeLabel(item.type);
                return (
                  <div key={item.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(item.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${typeInfo.color} text-white text-xs`}>
                            {typeInfo.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeTime(item.timestamp)}
                          </span>
                          {item.status === "failed" && (
                            <Badge variant="destructive" className="text-xs">
                              失敗
                            </Badge>
                          )}
                        </div>

                        <div className="mt-2 text-sm">
                          <p className="text-muted-foreground">
                            掃描 {item.serialsScanned} 個序號：
                            <span className="font-medium text-foreground ml-1">
                              {item.serialNames.slice(0, 3).join("、")}
                              {item.serialNames.length > 3 && ` 等 ${item.serialNames.length} 個`}
                            </span>
                          </p>
                        </div>

                        {item.status !== "failed" && (
                          <div className="flex flex-wrap gap-3 mt-2 text-xs">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-orange-500" />
                              發現 <strong className="text-orange-600">{item.newDetections}</strong> 筆新結果
                            </span>
                            <span className="text-muted-foreground">
                              共 {item.totalResults} 筆
                            </span>
                            {item.shopeeResults > 0 && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                蝦皮 {item.shopeeResults}
                              </Badge>
                            )}
                            {item.rutenResults > 0 && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                露天 {item.rutenResults}
                              </Badge>
                            )}
                          </div>
                        )}

                        {item.status === "failed" && item.errorMessage && (
                          <p className="text-xs text-red-500 mt-2">
                            錯誤：{item.errorMessage.substring(0, 100)}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(item.timestamp)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            耗時 {formatDuration(item.duration)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Actions */}
        {history.length > 0 && (
          <>
            <Separator />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                顯示最近 {history.length} 筆記錄（最多保留 100 筆）
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                清除歷史
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Compact version for dashboard
export function ScanHistoryCard() {
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof store.getScanHistoryStats> | null>(null);

  useEffect(() => {
    setHistory(store.getScanHistory().slice(0, 5));
    setStats(store.getScanHistoryStats());
  }, []);

  const getTypeLabel = (type: ScanHistory["type"]) => {
    switch (type) {
      case "manual":
        return { label: "手動", color: "bg-blue-500" };
      case "auto":
        return { label: "自動", color: "bg-green-500" };
      case "on-add":
        return { label: "新增", color: "bg-orange-500" };
    }
  };

  const getStatusIcon = (status: ScanHistory["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case "partial":
        return <AlertTriangle className="w-3 h-3 text-amber-500" />;
      case "failed":
        return <XCircle className="w-3 h-3 text-red-500" />;
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "剛剛";
    if (minutes < 60) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    return date.toLocaleDateString("zh-TW");
  };

  if (!stats) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="w-5 h-5" />
              掃描歷史
            </CardTitle>
            <CardDescription>
              今日 {stats.todayScans} 次掃描
            </CardDescription>
          </div>
          <ScanHistoryPanel />
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            尚無掃描記錄
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => {
              const typeInfo = getTypeLabel(item.type);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <Badge className={`${typeInfo.color} text-white text-xs`}>
                      {typeInfo.label}
                    </Badge>
                    <span className="text-sm">
                      {item.newDetections > 0 ? (
                        <span className="text-orange-600 font-medium">
                          +{item.newDetections} 新
                        </span>
                      ) : (
                        <span className="text-muted-foreground">無新發現</span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
