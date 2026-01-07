"use client";

import type { Serial, Detection, User, DashboardStats, ScanHistory } from "./types";

const STORAGE_KEYS = {
  SERIALS: "ncc-monitor-serials",
  DETECTIONS: "ncc-monitor-detections",
  USER: "ncc-monitor-user",
  SCAN_HISTORY: "ncc-monitor-scan-history",
} as const;

// Helper to generate random IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Serials CRUD
export function getSerials(): Serial[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEYS.SERIALS);
  return data ? JSON.parse(data) : [];
}

export function getSerial(id: string): Serial | undefined {
  return getSerials().find((s) => s.id === id);
}

export function createSerial(data: Pick<Serial, "name" | "serialNumber" | "isActive">): Serial {
  const serials = getSerials();
  const now = new Date().toISOString();
  const serial: Serial = {
    id: generateId(),
    name: data.name,
    serialNumber: data.serialNumber.toUpperCase(),
    isActive: data.isActive,
    createdAt: now,
    updatedAt: now,
  };
  serials.push(serial);
  localStorage.setItem(STORAGE_KEYS.SERIALS, JSON.stringify(serials));
  return serial;
}

export function updateSerial(id: string, data: Partial<Pick<Serial, "name" | "serialNumber" | "isActive">>): Serial | null {
  const serials = getSerials();
  const index = serials.findIndex((s) => s.id === id);
  if (index === -1) return null;

  serials[index] = {
    ...serials[index],
    ...data,
    serialNumber: data.serialNumber ? data.serialNumber.toUpperCase() : serials[index].serialNumber,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEYS.SERIALS, JSON.stringify(serials));
  return serials[index];
}

export function deleteSerial(id: string): boolean {
  const serials = getSerials();
  const filtered = serials.filter((s) => s.id !== id);
  if (filtered.length === serials.length) return false;
  localStorage.setItem(STORAGE_KEYS.SERIALS, JSON.stringify(filtered));

  // Also delete related detections
  const detections = getDetections().filter((d) => d.serialId !== id);
  localStorage.setItem(STORAGE_KEYS.DETECTIONS, JSON.stringify(detections));

  return true;
}

// Detections
export function getDetections(): Detection[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEYS.DETECTIONS);
  return data ? JSON.parse(data) : [];
}

export function getDetectionsBySerial(serialId: string): Detection[] {
  return getDetections().filter((d) => d.serialId === serialId);
}

export function updateDetectionStatus(id: string, status: Detection["status"]): Detection | null {
  const detections = getDetections();
  const index = detections.findIndex((d) => d.id === id);
  if (index === -1) return null;

  detections[index] = { ...detections[index], status };
  localStorage.setItem(STORAGE_KEYS.DETECTIONS, JSON.stringify(detections));
  return detections[index];
}

// Mock scanning function - creates sample detections
export function performScan(shopeeOnly = false): Detection[] {
  const serials = getSerials().filter((s) => s.isActive);
  if (serials.length === 0) return [];

  const detections = getDetections();
  const newDetections: Detection[] = [];

  // Simulate finding some results for random serials
  const selectedSerials = serials.filter(() => Math.random() > 0.6);

  for (const serial of selectedSerials) {
    const isShopee = shopeeOnly || Math.random() > 0.5;

    if (shopeeOnly && !isShopee) continue;

    // Check if we already have a detection with similar details
    const existingUrl = `https://${isShopee ? "shopee.tw" : "example.com"}/product/${serial.serialNumber.toLowerCase()}`;
    if (detections.some((d) => d.sourceUrl === existingUrl)) continue;

    const detection: Detection = {
      id: generateId(),
      serialId: serial.id,
      serialNumber: serial.serialNumber,
      serialName: serial.name,
      pageTitle: isShopee
        ? `【特價】${serial.name} 正品保證 - 蝦皮購物`
        : `${serial.name} - 商品搜尋結果`,
      snippet: isShopee
        ? `出售 ${serial.serialNumber} 相關產品，特價優惠中！含稅價格...`
        : `搜尋結果顯示 ${serial.serialNumber} 在此頁面出現...`,
      sourceUrl: existingUrl,
      isShopee,
      shopeeSellerName: isShopee ? `seller_${Math.floor(Math.random() * 1000)}` : undefined,
      shopeeSellerUrl: isShopee ? `https://shopee.tw/shop/${Math.floor(Math.random() * 10000)}` : undefined,
      status: "new",
      detectedAt: new Date().toISOString(),
    };

    newDetections.push(detection);
  }

  if (newDetections.length > 0) {
    const allDetections = [...detections, ...newDetections];
    localStorage.setItem(STORAGE_KEYS.DETECTIONS, JSON.stringify(allDetections));
  }

  return newDetections;
}

// Dashboard stats
export function getDashboardStats(): DashboardStats {
  const serials = getSerials();
  const detections = getDetections();

  return {
    totalSerials: serials.length,
    activeSerials: serials.filter((s) => s.isActive).length,
    totalDetections: detections.length,
    newDetections: detections.filter((d) => d.status === "new").length,
    shopeeDetections: detections.filter((d) => d.isShopee).length,
    newShopeeDetections: detections.filter((d) => d.isShopee && d.status === "new").length,
    rutenDetections: detections.filter((d) => d.isRuten).length,
    newRutenDetections: detections.filter((d) => d.isRuten && d.status === "new").length,
  };
}

// Scan History
export function getScanHistory(): ScanHistory[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
  return data ? JSON.parse(data) : [];
}

export function addScanHistory(history: Omit<ScanHistory, "id">): ScanHistory {
  const histories = getScanHistory();
  const newHistory: ScanHistory = {
    id: generateId(),
    ...history,
  };

  // Keep only last 100 records
  const updatedHistories = [newHistory, ...histories].slice(0, 100);
  localStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(updatedHistories));

  return newHistory;
}

export function clearScanHistory(): void {
  localStorage.removeItem(STORAGE_KEYS.SCAN_HISTORY);
}

export function getScanHistoryStats(): {
  totalScans: number;
  todayScans: number;
  totalDetectionsFound: number;
  lastScanTime: string | null;
} {
  const histories = getScanHistory();
  const today = new Date().toDateString();

  const todayScans = histories.filter(h =>
    new Date(h.timestamp).toDateString() === today
  ).length;

  const totalDetectionsFound = histories.reduce((sum, h) => sum + h.newDetections, 0);
  const lastScanTime = histories.length > 0 ? histories[0].timestamp : null;

  return {
    totalScans: histories.length,
    todayScans,
    totalDetectionsFound,
    lastScanTime,
  };
}

// User/Auth (mock)
export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  return data ? JSON.parse(data) : null;
}

export function login(email: string, password: string): User | null {
  // Mock login - any email/password works
  if (!email || !password) return null;

  const user: User = {
    id: generateId(),
    name: email.split("@")[0],
    email,
  };

  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  return user;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// Initialize with demo data if empty
export function initializeDemoData(): void {
  if (typeof window === "undefined") return;

  const serials = getSerials();
  if (serials.length === 0) {
    // Add some demo serials
    const demoSerials = [
      { name: "手機型號 A", serialNumber: "NCC-ABC123456", isActive: true },
      { name: "藍牙耳機 B", serialNumber: "NCC-DEF789012", isActive: true },
      { name: "無線路由器 C", serialNumber: "NCC-GHI345678", isActive: false },
    ];

    for (const data of demoSerials) {
      createSerial(data);
    }
  }
}
