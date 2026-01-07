import type { Serial, Detection, Platform, ScanHistory } from "./types";
import * as store from "./store";

interface ScanResult {
  serialId: string;
  serialName: string;
  serialNumber: string;
  results: Array<{
    title: string;
    snippet: string;
    url: string;
    platform?: Platform;
    isShopee: boolean;
    isRuten?: boolean;
    shopeeSellerName?: string;
    shopeeSellerUrl?: string;
    rutenSellerName?: string;
    rutenSellerUrl?: string;
  }>;
}

interface ScanResponse {
  success: boolean;
  timestamp: string;
  totalResults: number;
  data: ScanResult[];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Scan a single serial number (used when adding new serials)
export async function scanSingleSerial(serial: Serial): Promise<{
  newDetections: Detection[];
  totalFound: number;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serials: [{
          id: serial.id,
          name: serial.name,
          serialNumber: serial.serialNumber,
        }],
        shopeeOnly: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Scan failed: ${response.statusText}`);
    }

    const result: ScanResponse = await response.json();

    if (!result.success) {
      throw new Error("Scan returned unsuccessful response");
    }

    // Convert results to detections and save them
    const existingDetections = store.getDetections();
    const newDetections: Detection[] = [];
    let shopeeResults = 0;
    let rutenResults = 0;
    let otherResults = 0;

    for (const scanResult of result.data) {
      for (const item of scanResult.results) {
        // Count by platform
        if (item.isShopee) shopeeResults++;
        else if (item.isRuten) rutenResults++;
        else otherResults++;

        // Check if we already have this detection (by URL)
        const exists = existingDetections.some(
          (d) => d.sourceUrl === item.url && d.serialNumber === scanResult.serialNumber
        );

        if (!exists) {
          const detection: Detection = {
            id: generateId(),
            serialId: scanResult.serialId,
            serialNumber: scanResult.serialNumber,
            serialName: scanResult.serialName,
            pageTitle: item.title,
            snippet: item.snippet,
            sourceUrl: item.url,
            platform: item.platform,
            isShopee: item.isShopee,
            isRuten: item.isRuten,
            shopeeSellerName: item.shopeeSellerName,
            shopeeSellerUrl: item.shopeeSellerUrl,
            rutenSellerName: item.rutenSellerName,
            rutenSellerUrl: item.rutenSellerUrl,
            status: "new",
            detectedAt: result.timestamp,
          };
          newDetections.push(detection);
        }
      }
    }

    // Save new detections to storage
    if (newDetections.length > 0) {
      const allDetections = [...existingDetections, ...newDetections];
      localStorage.setItem("ncc-monitor-detections", JSON.stringify(allDetections));
    }

    // Record scan history
    const duration = Date.now() - startTime;
    store.addScanHistory({
      timestamp: result.timestamp,
      type: "on-add",
      serialsScanned: 1,
      serialNames: [serial.name],
      totalResults: result.totalResults,
      newDetections: newDetections.length,
      shopeeResults,
      rutenResults,
      otherResults,
      duration,
      status: "success",
    });

    return {
      newDetections,
      totalFound: result.totalResults,
    };
  } catch (error) {
    console.error("Single serial scan error:", error);

    // Record failed scan
    const duration = Date.now() - startTime;
    store.addScanHistory({
      timestamp: new Date().toISOString(),
      type: "on-add",
      serialsScanned: 1,
      serialNames: [serial.name],
      totalResults: 0,
      newDetections: 0,
      shopeeResults: 0,
      rutenResults: 0,
      otherResults: 0,
      duration,
      status: "failed",
      errorMessage: String(error),
    });

    throw error;
  }
}

export async function performRealScan(shopeeOnly = false, scanType: 'manual' | 'auto' = 'manual'): Promise<{
  newDetections: Detection[];
  totalFound: number;
}> {
  const startTime = Date.now();
  const serials = store.getSerials().filter((s) => s.isActive);

  if (serials.length === 0) {
    return { newDetections: [], totalFound: 0 };
  }

  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        serials: serials.map((s) => ({
          id: s.id,
          name: s.name,
          serialNumber: s.serialNumber,
        })),
        shopeeOnly,
      }),
    });

    if (!response.ok) {
      throw new Error(`Scan failed: ${response.statusText}`);
    }

    const result: ScanResponse = await response.json();

    if (!result.success) {
      throw new Error("Scan returned unsuccessful response");
    }

    // Convert results to detections and save them
    const existingDetections = store.getDetections();
    const newDetections: Detection[] = [];
    let shopeeResults = 0;
    let rutenResults = 0;
    let otherResults = 0;

    for (const scanResult of result.data) {
      for (const item of scanResult.results) {
        // Count by platform
        if (item.isShopee) shopeeResults++;
        else if (item.isRuten) rutenResults++;
        else otherResults++;

        // Check if we already have this detection (by URL)
        const exists = existingDetections.some(
          (d) => d.sourceUrl === item.url && d.serialNumber === scanResult.serialNumber
        );

        if (!exists) {
          const detection: Detection = {
            id: generateId(),
            serialId: scanResult.serialId,
            serialNumber: scanResult.serialNumber,
            serialName: scanResult.serialName,
            pageTitle: item.title,
            snippet: item.snippet,
            sourceUrl: item.url,
            platform: item.platform,
            isShopee: item.isShopee,
            isRuten: item.isRuten,
            shopeeSellerName: item.shopeeSellerName,
            shopeeSellerUrl: item.shopeeSellerUrl,
            rutenSellerName: item.rutenSellerName,
            rutenSellerUrl: item.rutenSellerUrl,
            status: "new",
            detectedAt: result.timestamp,
          };
          newDetections.push(detection);
        }
      }
    }

    // Save new detections to storage
    if (newDetections.length > 0) {
      const allDetections = [...existingDetections, ...newDetections];
      localStorage.setItem("ncc-monitor-detections", JSON.stringify(allDetections));
    }

    // Record scan history
    const duration = Date.now() - startTime;
    store.addScanHistory({
      timestamp: result.timestamp,
      type: scanType,
      serialsScanned: serials.length,
      serialNames: serials.map(s => s.name),
      totalResults: result.totalResults,
      newDetections: newDetections.length,
      shopeeResults,
      rutenResults,
      otherResults,
      duration,
      status: "success",
    });

    return {
      newDetections,
      totalFound: result.totalResults,
    };
  } catch (error) {
    console.error("Scan API error:", error);

    // Record failed scan
    const duration = Date.now() - startTime;
    store.addScanHistory({
      timestamp: new Date().toISOString(),
      type: scanType,
      serialsScanned: serials.length,
      serialNames: serials.map(s => s.name),
      totalResults: 0,
      newDetections: 0,
      shopeeResults: 0,
      rutenResults: 0,
      otherResults: 0,
      duration,
      status: "failed",
      errorMessage: String(error),
    });

    throw error;
  }
}
