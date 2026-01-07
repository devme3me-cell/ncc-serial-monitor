"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { performRealScan } from "@/lib/api";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";

interface AutoScanSettings {
  enabled: boolean;
  intervalMinutes: number; // 15, 30, 60, 120, 360, 720, 1440
  lastScanTime: string | null;
  nextScanTime: string | null;
  includeShopee: boolean;
}

interface AutoScanContextType {
  settings: AutoScanSettings;
  isScanning: boolean;
  updateSettings: (settings: Partial<AutoScanSettings>) => void;
  triggerManualScan: () => Promise<void>;
  getTimeUntilNextScan: () => string;
}

const AutoScanContext = createContext<AutoScanContextType | undefined>(undefined);

const STORAGE_KEY = "ncc-monitor-auto-scan-settings";

const DEFAULT_SETTINGS: AutoScanSettings = {
  enabled: false,
  intervalMinutes: 60,
  lastScanTime: null,
  nextScanTime: null,
  includeShopee: true,
};

export function AutoScanProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AutoScanSettings>(DEFAULT_SETTINGS);
  const [isScanning, setIsScanning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { sendNotification } = useNotifications();
  const { isAuthenticated } = useAuth();

  // Load settings from storage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  // Save settings to storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Perform the scan
  const performAutoScan = useCallback(async () => {
    if (isScanning || !isAuthenticated) return;

    setIsScanning(true);
    const scanStartTime = new Date().toISOString();

    try {
      console.log("[AutoScan] Starting scheduled scan...");

      const { newDetections, totalFound } = await performRealScan(false, "auto");

      const now = new Date();
      const nextScan = new Date(now.getTime() + settings.intervalMinutes * 60 * 1000);

      setSettings((prev) => ({
        ...prev,
        lastScanTime: scanStartTime,
        nextScanTime: nextScan.toISOString(),
      }));

      if (newDetections.length > 0) {
        sendNotification(
          "自動掃描發現新結果",
          `定時掃描發現 ${newDetections.length} 筆新的序號使用記錄`,
          "warning"
        );
      } else {
        console.log(`[AutoScan] Scan complete. ${totalFound} results found, no new detections.`);
      }
    } catch (error) {
      console.error("[AutoScan] Scan failed:", error);
      sendNotification(
        "自動掃描失敗",
        "定時掃描無法完成，將在下次排程時重試",
        "error"
      );
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, isAuthenticated, settings.intervalMinutes, sendNotification]);

  // Set up the interval
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!settings.enabled || !isAuthenticated) {
      return;
    }

    // Calculate time until next scan
    let timeUntilNextScan = settings.intervalMinutes * 60 * 1000;

    if (settings.nextScanTime) {
      const nextScan = new Date(settings.nextScanTime);
      const now = new Date();
      const diff = nextScan.getTime() - now.getTime();

      if (diff > 0) {
        timeUntilNextScan = diff;
      } else {
        // Past due, scan immediately
        performAutoScan();
        timeUntilNextScan = settings.intervalMinutes * 60 * 1000;
      }
    } else {
      // First time enabling, set next scan time
      const nextScan = new Date(Date.now() + timeUntilNextScan);
      setSettings((prev) => ({
        ...prev,
        nextScanTime: nextScan.toISOString(),
      }));
    }

    console.log(`[AutoScan] Scheduling next scan in ${Math.round(timeUntilNextScan / 60000)} minutes`);

    // Set up initial timeout, then interval
    const initialTimeout = setTimeout(() => {
      performAutoScan();

      // Set up recurring interval
      intervalRef.current = setInterval(() => {
        performAutoScan();
      }, settings.intervalMinutes * 60 * 1000);
    }, timeUntilNextScan);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settings.enabled, settings.intervalMinutes, settings.nextScanTime, isAuthenticated, performAutoScan]);

  const updateSettings = useCallback((newSettings: Partial<AutoScanSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };

      // If enabling or changing interval, recalculate next scan time
      if (newSettings.enabled === true || (newSettings.intervalMinutes && prev.enabled)) {
        const intervalMs = (newSettings.intervalMinutes || prev.intervalMinutes) * 60 * 1000;
        updated.nextScanTime = new Date(Date.now() + intervalMs).toISOString();
      }

      // If disabling, clear next scan time
      if (newSettings.enabled === false) {
        updated.nextScanTime = null;
      }

      return updated;
    });
  }, []);

  const triggerManualScan = useCallback(async () => {
    await performAutoScan();
  }, [performAutoScan]);

  const getTimeUntilNextScan = useCallback((): string => {
    if (!settings.enabled || !settings.nextScanTime) {
      return "未排程";
    }

    const nextScan = new Date(settings.nextScanTime);
    const now = new Date();
    const diff = nextScan.getTime() - now.getTime();

    if (diff <= 0) {
      return "即將開始";
    }

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours} 小時 ${remainingMinutes} 分鐘`;
    }

    return `${minutes} 分鐘`;
  }, [settings.enabled, settings.nextScanTime]);

  return (
    <AutoScanContext.Provider
      value={{
        settings,
        isScanning,
        updateSettings,
        triggerManualScan,
        getTimeUntilNextScan,
      }}
    >
      {children}
    </AutoScanContext.Provider>
  );
}

export function useAutoScan() {
  const context = useContext(AutoScanContext);
  if (!context) {
    throw new Error("useAutoScan must be used within an AutoScanProvider");
  }
  return context;
}
