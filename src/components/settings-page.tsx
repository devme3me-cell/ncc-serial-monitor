"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  Shield,
  Trash2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Play,
  Pause,
  Timer,
  Sun,
  Moon,
  Monitor,
  Palette,
  Mail,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useAutoScan } from "@/hooks/use-auto-scan";
import { useEmailNotifications } from "@/hooks/use-email-notifications";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 分鐘" },
  { value: 30, label: "30 分鐘" },
  { value: 60, label: "1 小時" },
  { value: 120, label: "2 小時" },
  { value: 360, label: "6 小時" },
  { value: 720, label: "12 小時" },
  { value: 1440, label: "24 小時" },
];

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { settings, isScanning, updateSettings, triggerManualScan, getTimeUntilNextScan } = useAutoScan();
  const {
    settings: emailSettings,
    isLoading: emailLoading,
    updateSettings: updateEmailSettings
  } = useEmailNotifications();
  const { theme, setTheme } = useTheme();
  const [timeUntilNext, setTimeUntilNext] = useState("--");
  const [mounted, setMounted] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update countdown every minute
  useEffect(() => {
    const updateTime = () => {
      setTimeUntilNext(getTimeUntilNextScan());
    };

    updateTime();
    const interval = setInterval(updateTime, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [getTimeUntilNextScan]);

  const handleToggleAutoScan = () => {
    const newEnabled = !settings.enabled;
    updateSettings({ enabled: newEnabled });

    if (newEnabled) {
      toast.success(`自動掃描已啟用，每 ${INTERVAL_OPTIONS.find(o => o.value === settings.intervalMinutes)?.label || settings.intervalMinutes + " 分鐘"} 執行一次`);
    } else {
      toast.info("自動掃描已停用");
    }
  };

  const handleIntervalChange = (minutes: number) => {
    updateSettings({ intervalMinutes: minutes });
    toast.success(`掃描間隔已更新為 ${INTERVAL_OPTIONS.find(o => o.value === minutes)?.label}`);
  };

  const handleManualScan = async () => {
    toast.info("開始手動掃描...");
    await triggerManualScan();
    toast.success("手動掃描完成");
  };

  const handleClearData = () => {
    if (confirm("確定要清除所有資料嗎？此操作無法復原。")) {
      localStorage.removeItem("ncc-monitor-serials");
      localStorage.removeItem("ncc-monitor-detections");
      toast.success("資料已清除，請重新整理頁面");
    }
  };

  const formatLastScanTime = (isoString: string | null) => {
    if (!isoString) return "尚未執行";
    const date = new Date(isoString);
    return date.toLocaleString("zh-TW", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">設定</h2>
        <p className="text-muted-foreground">管理帳戶和應用程式設定</p>
      </div>

      {/* Auto Scan Settings */}
      <Card className="border-orange-200 dark:border-orange-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-orange-500" />
            自動掃描排程
          </CardTitle>
          <CardDescription>設定定時自動掃描序號</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle and Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant={settings.enabled ? "default" : "outline"}
                onClick={handleToggleAutoScan}
                className={settings.enabled ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                {settings.enabled ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    停用
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    啟用
                  </>
                )}
              </Button>
              <Badge
                variant={settings.enabled ? "default" : "secondary"}
                className={settings.enabled ? "bg-green-500" : ""}
              >
                {settings.enabled ? "運行中" : "已停用"}
              </Badge>
              {isScanning && (
                <Badge variant="outline" className="animate-pulse">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  掃描中...
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              onClick={handleManualScan}
              disabled={isScanning}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
              立即掃描
            </Button>
          </div>

          <Separator />

          {/* Interval Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">掃描間隔</label>
            <div className="flex flex-wrap gap-2">
              {INTERVAL_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={settings.intervalMinutes === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleIntervalChange(option.value)}
                  className={settings.intervalMinutes === option.value ? "bg-orange-500 hover:bg-orange-600" : ""}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Status Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">上次掃描</p>
                <p className="font-medium">{formatLastScanTime(settings.lastScanTime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Timer className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">下次掃描</p>
                <p className="font-medium">
                  {settings.enabled ? timeUntilNext : "未排程"}
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  自動掃描說明
                </p>
                <p className="text-orange-700 dark:text-orange-300 mt-1">
                  啟用後，系統會在背景自動執行掃描。發現新結果時會透過通知提醒您。
                  請注意：關閉瀏覽器後自動掃描將暫停，重新開啟頁面後會自動恢復。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            外觀設定
          </CardTitle>
          <CardDescription>自訂應用程式外觀</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">主題模式</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={mounted && theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className={mounted && theme === "light" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <Sun className="w-4 h-4 mr-2" />
                淺色
              </Button>
              <Button
                variant={mounted && theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className={mounted && theme === "dark" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <Moon className="w-4 h-4 mr-2" />
                深色
              </Button>
              <Button
                variant={mounted && theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
                className={mounted && theme === "system" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <Monitor className="w-4 h-4 mr-2" />
                系統預設
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            電子郵件通知
          </CardTitle>
          <CardDescription>
            發現新結果時發送郵件通知
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration Status */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {emailLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : emailSettings.configured ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <p className="font-medium">
                {emailLoading
                  ? "檢查設定中..."
                  : emailSettings.configured
                  ? "伺服器已設定"
                  : "伺服器未設定"
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {emailSettings.configured
                  ? "已設定 Resend API，可發送郵件通知"
                  : "需要在環境變數中設定 RESEND_API_KEY"
                }
              </p>
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">啟用郵件通知</p>
              <p className="text-sm text-muted-foreground">
                發現新序號使用記錄時發送郵件
              </p>
            </div>
            <Button
              variant={emailSettings.enabled ? "default" : "outline"}
              onClick={() => {
                updateEmailSettings({ enabled: !emailSettings.enabled });
                toast.success(emailSettings.enabled ? "郵件通知已停用" : "郵件通知已啟用");
              }}
              disabled={!emailSettings.configured}
              className={emailSettings.enabled ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              {emailSettings.enabled ? "已啟用" : "啟用"}
            </Button>
          </div>

          <Separator />

          {/* Custom Email */}
          <div className="space-y-3">
            <label className="text-sm font-medium">通知收件人（選填）</label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={emailInput || emailSettings.recipientEmail}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (emailInput) {
                    updateEmailSettings({ recipientEmail: emailInput });
                    toast.success("收件人已更新");
                  }
                }}
                disabled={!emailInput}
              >
                儲存
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              留空則使用環境變數中設定的預設收件人
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            帳戶資訊
          </CardTitle>
          <CardDescription>您的登入資訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">名稱</p>
              <p className="font-medium">{user?.name || "未設定"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">電子郵件</p>
              <p className="font-medium">{user?.email || "未設定"}</p>
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button variant="outline" onClick={logout}>
              登出
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            危險區域
          </CardTitle>
          <CardDescription>這些操作無法復原，請謹慎使用</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">清除所有資料</p>
              <p className="text-sm text-muted-foreground">
                刪除所有序號和偵測記錄
              </p>
            </div>
            <Button variant="destructive" onClick={handleClearData}>
              <Trash2 className="w-4 h-4 mr-2" />
              清除資料
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            關於
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">應用程式</p>
              <p className="font-medium">NCC 序號監控</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">版本</p>
              <p className="font-medium">1.2.0 (Web)</p>
            </div>
          </div>
          <Separator />
          <div className="text-sm text-muted-foreground">
            <p>
              此應用程式用於追蹤 NCC 認證序號在網路上的使用情況，
              幫助您監控產品序號是否被未經授權使用。
            </p>
            <p className="mt-2">
              支援蝦皮、DuckDuckGo、Bing 等平台搜尋。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
