"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  List,
  AlertTriangle,
  Search,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Bell,
  BellOff,
  Timer,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import type { DashboardStats, Detection } from "@/lib/types";
import * as store from "@/lib/store";
import { performRealScan } from "@/lib/api";
import { useNotifications } from "@/hooks/use-notifications";
import { useAutoScan } from "@/hooks/use-auto-scan";
import { ScanHistoryCard, ScanHistoryPanel } from "@/components/scan-history";

interface DashboardProps {
  onNavigateToSerials: () => void;
  onNavigateToDetections: () => void;
  onNavigateToSettings: () => void;
}

export function Dashboard({ onNavigateToSerials, onNavigateToDetections, onNavigateToSettings }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDetections, setRecentDetections] = useState<Detection[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isScanningShopee, setIsScanningShopee] = useState(false);

  const {
    permission,
    requestPermission,
    sendNotification,
    unreadCount
  } = useNotifications();

  const {
    settings: autoScanSettings,
    isScanning: isAutoScanning,
    getTimeUntilNextScan,
  } = useAutoScan();

  const loadData = () => {
    setStats(store.getDashboardStats());
    const detections = store.getDetections();
    // Sort by date, newest first
    detections.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
    setRecentDetections(detections.slice(0, 5));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success("通知已啟用！");
      sendNotification("通知已啟用", "您將收到掃描結果的即時通知", "success");
    } else {
      toast.error("無法啟用通知，請在瀏覽器設定中允許通知權限");
    }
  };

  const handleScanAll = async () => {
    setIsScanning(true);

    try {
      const { newDetections, totalFound } = await performRealScan(false, "manual");
      loadData();

      if (newDetections.length > 0) {
        toast.success(`掃描完成！發現 ${newDetections.length} 筆新結果`);

        // Send notification
        sendNotification(
          "掃描發現新結果",
          `發現 ${newDetections.length} 筆新的序號使用記錄`,
          "warning"
        );
      } else if (totalFound > 0) {
        toast.info(`掃描完成，共 ${totalFound} 筆結果（無新發現）`);
      } else {
        toast.info("掃描完成，未發現任何結果");
      }
    } catch (error) {
      toast.error("掃描失敗，請稍後再試");
      sendNotification("掃描失敗", "無法完成掃描，請檢查網路連線", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleScanShopee = async () => {
    setIsScanningShopee(true);

    try {
      const { newDetections, totalFound } = await performRealScan(true, "manual");
      loadData();

      if (newDetections.length > 0) {
        toast.success(`蝦皮掃描完成！發現 ${newDetections.length} 筆新結果`);

        sendNotification(
          "蝦皮掃描發現新結果",
          `在蝦皮平台發現 ${newDetections.length} 筆新的序號使用記錄`,
          "warning"
        );
      } else if (totalFound > 0) {
        toast.info(`蝦皮掃描完成，共 ${totalFound} 筆結果（無新發現）`);
      } else {
        toast.info("蝦皮掃描完成，未發現任何結果");
      }
    } catch (error) {
      toast.error("蝦皮掃描失敗，請稍後再試");
    } finally {
      setIsScanningShopee(false);
    }
  };

  const getStatusBadge = (status: Detection["status"]) => {
    switch (status) {
      case "new":
        return <Badge variant="destructive" className="text-xs">新發現</Badge>;
      case "processed":
        return <Badge className="bg-green-500 text-xs">已處理</Badge>;
      case "ignored":
        return <Badge variant="secondary" className="text-xs">已忽略</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">監控總覽</h2>
          <p className="text-muted-foreground">追蹤您的 NCC 序號使用情況</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scan History Button */}
          <ScanHistoryPanel />

          {/* Notification Permission Button */}
          {permission !== "granted" && (
            <Button
              variant="outline"
              onClick={handleEnableNotifications}
              className="gap-2"
            >
              <Bell className="w-4 h-4" />
              啟用通知
            </Button>
          )}
          {permission === "granted" && unreadCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Bell className="w-3 h-3" />
              {unreadCount} 則未讀
            </Badge>
          )}
        </div>
      </div>

      {/* Notification Permission Banner */}
      {permission === "denied" && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BellOff className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  通知已被封鎖
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  請在瀏覽器設定中允許通知權限以接收掃描結果提醒
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-orange-200/50 dark:border-orange-900/30">
          <CardHeader className="pb-2">
            <CardDescription>監控序號</CardDescription>
            <CardTitle className="text-4xl font-bold">
              {stats?.activeSerials ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <List className="w-4 h-4" />
              共 {stats?.totalSerials ?? 0} 個序號
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200/50 dark:border-orange-900/30">
          <CardHeader className="pb-2">
            <CardDescription>新發現</CardDescription>
            <CardTitle
              className={`text-4xl font-bold ${
                (stats?.newDetections ?? 0) > 0 ? "text-red-500" : "text-green-500"
              }`}
            >
              {stats?.newDetections ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              共 {stats?.totalDetections ?? 0} 筆記錄
            </p>
          </CardContent>
        </Card>

        {/* Shopee Card */}
        <Card className="border-[#EE4D2D]/30 bg-[#EE4D2D]/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#EE4D2D] rounded-md flex items-center justify-center text-white text-xs font-bold">
                蝦
              </div>
              <CardDescription className="text-[#EE4D2D] font-medium">
                蝦皮監控
              </CardDescription>
            </div>
            <CardTitle className="text-3xl font-bold text-[#EE4D2D]">
              {stats?.newShopeeDetections ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              新發現（共 {stats?.shopeeDetections ?? 0} 筆）
            </p>
            <Button
              size="sm"
              onClick={handleScanShopee}
              disabled={isScanningShopee}
              className="bg-[#EE4D2D] hover:bg-[#D94429] text-white"
            >
              {isScanningShopee ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                "掃描蝦皮"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Ruten Card */}
        <Card className="border-[#C7000B]/30 bg-[#C7000B]/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#C7000B] rounded-md flex items-center justify-center text-white text-xs font-bold">
                露
              </div>
              <CardDescription className="text-[#C7000B] font-medium">
                露天監控
              </CardDescription>
            </div>
            <CardTitle className="text-3xl font-bold text-[#C7000B]">
              {stats?.newRutenDetections ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              新發現（共 {stats?.rutenDetections ?? 0} 筆）
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleScanAll}
          disabled={isScanning}
          className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-medium shadow-md"
        >
          {isScanning ? (
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Search className="w-5 h-5 mr-2" />
          )}
          {isScanning ? "掃描中..." : "全面掃描（含蝦皮）"}
        </Button>
        <Button
          variant="outline"
          onClick={onNavigateToSerials}
          className="flex-1 h-12 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950"
        >
          <TrendingUp className="w-5 h-5 mr-2" />
          新增序號
        </Button>
      </div>

      {/* Auto Scan Status */}
      <Card className={autoScanSettings.enabled ? "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : "bg-muted/30"}>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                autoScanSettings.enabled
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-muted"
              }`}>
                <Timer className={`w-5 h-5 ${autoScanSettings.enabled ? "text-green-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">自動掃描</p>
                  <Badge
                    variant={autoScanSettings.enabled ? "default" : "secondary"}
                    className={autoScanSettings.enabled ? "bg-green-500" : ""}
                  >
                    {autoScanSettings.enabled ? "已啟用" : "未啟用"}
                  </Badge>
                  {isAutoScanning && (
                    <Badge variant="outline" className="animate-pulse">
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      執行中
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {autoScanSettings.enabled
                    ? `下次掃描：${getTimeUntilNextScan()}`
                    : "前往設定頁面啟用自動掃描排程"
                  }
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToSettings}
              className="text-muted-foreground"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scan History Card */}
      <ScanHistoryCard />

      {/* Recent Detections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">最新偵測</CardTitle>
            <CardDescription>近期發現的序號使用記錄</CardDescription>
          </div>
          {recentDetections.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onNavigateToDetections}>
              查看全部
              <ExternalLink className="w-4 h-4 ml-1" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {recentDetections.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <p className="font-medium text-lg">目前沒有偵測記錄</p>
              <p className="text-muted-foreground mt-1">
                新增序號並執行掃描以開始監控
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {recentDetections.map((detection, index) => (
                  <div key={detection.id}>
                    {index > 0 && <Separator className="my-3" />}
                    <button
                      type="button"
                      onClick={onNavigateToDetections}
                      className="w-full text-left group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">
                              {detection.pageTitle || "無標題"}
                            </p>
                            {detection.isShopee && (
                              <Badge className="bg-[#EE4D2D] text-white text-xs">
                                蝦皮
                              </Badge>
                            )}
                            {detection.isRuten && (
                              <Badge className="bg-[#C7000B] text-white text-xs">
                                露天
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {detection.snippet || detection.sourceUrl}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusBadge(detection.status)}
                            <span className="text-xs text-muted-foreground">
                              {detection.serialNumber}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </button>
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
