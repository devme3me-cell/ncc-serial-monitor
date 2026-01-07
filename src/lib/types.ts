export type Platform = "shopee" | "ruten" | "pchome" | "momo" | "other";

export interface Serial {
  id: string;
  name: string;
  serialNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Detection {
  id: string;
  serialId: string;
  serialNumber: string;
  serialName: string;
  pageTitle: string;
  snippet: string;
  sourceUrl: string;
  platform?: Platform;
  isShopee: boolean;
  isRuten?: boolean;
  shopeeSellerName?: string;
  shopeeSellerUrl?: string;
  rutenSellerName?: string;
  rutenSellerUrl?: string;
  status: 'new' | 'processed' | 'ignored';
  detectedAt: string;
}

export interface ScanHistory {
  id: string;
  timestamp: string;
  type: 'manual' | 'auto' | 'on-add';
  serialsScanned: number;
  serialNames: string[];
  totalResults: number;
  newDetections: number;
  shopeeResults: number;
  rutenResults: number;
  otherResults: number;
  duration: number; // in milliseconds
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface DashboardStats {
  totalSerials: number;
  activeSerials: number;
  totalDetections: number;
  newDetections: number;
  shopeeDetections: number;
  newShopeeDetections: number;
  rutenDetections: number;
  newRutenDetections: number;
}
