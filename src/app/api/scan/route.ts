import { NextRequest, NextResponse } from "next/server";

// Environment variables for Google Custom Search
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

type Platform = "shopee" | "ruten" | "pchome" | "momo" | "other";

// Helper to detect platform from URL
function detectPlatform(url: string): Platform {
  if (url.includes("shopee.tw") || url.includes("shopee.com")) return "shopee";
  if (url.includes("ruten.com.tw")) return "ruten";
  if (url.includes("pchome.com.tw") || url.includes("pcstore.com.tw")) return "pchome";
  if (url.includes("momoshop.com.tw") || url.includes("momo.com")) return "momo";
  return "other";
}

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  platform: Platform;
  isShopee: boolean; // Keep for backward compatibility
  isRuten?: boolean;
  shopeeSellerName?: string;
  shopeeSellerUrl?: string;
  rutenSellerName?: string;
  rutenSellerUrl?: string;
}

interface ShopeeItem {
  item_basic?: {
    shopid?: number;
    itemid?: number;
    name?: string;
    price?: number;
    sold?: number;
  };
  shopid?: number;
  itemid?: number;
  name?: string;
  price?: number;
  sold?: number;
}

// Real Shopee search using their public API
async function searchShopee(serialNumber: string): Promise<SearchResult[]> {
  try {
    const keyword = encodeURIComponent(serialNumber);

    // Shopee Taiwan search API endpoint
    const response = await fetch(
      `https://shopee.tw/api/v4/search/search_items?by=relevancy&keyword=${keyword}&limit=10&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
          "Referer": "https://shopee.tw/",
        },
      }
    );

    if (!response.ok) {
      console.log("Shopee API returned non-OK status:", response.status);
      return [];
    }

    const data = await response.json();
    const items = data?.items || [];

    const results: SearchResult[] = items.slice(0, 5).map((item: ShopeeItem) => {
      const itemInfo = item.item_basic || item;
      const shopId = itemInfo.shopid || item.shopid;
      const itemId = itemInfo.itemid || item.itemid;
      const name = itemInfo.name || "商品名稱";

      return {
        title: name,
        snippet: `蝦皮商品 - 價格: NT${itemInfo.price ? Math.floor(itemInfo.price / 100000) : "未知"} - ${itemInfo.sold || 0} 已售出`,
        url: `https://shopee.tw/product/${shopId}/${itemId}`,
        platform: "shopee" as Platform,
        isShopee: true,
        shopeeSellerName: `shop_${shopId}`,
        shopeeSellerUrl: `https://shopee.tw/shop/${shopId}`,
      };
    });

    return results;
  } catch (error) {
    console.error("Shopee search error:", error);
    return [];
  }
}

// Ruten (露天拍賣) search using their search page
async function searchRuten(serialNumber: string): Promise<SearchResult[]> {
  try {
    const keyword = encodeURIComponent(serialNumber);

    // Ruten search URL
    const response = await fetch(
      `https://find.ruten.com.tw/s/?q=${keyword}&sort=rnk%2Fdc`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        },
      }
    );

    if (!response.ok) {
      console.log("Ruten returned non-OK status:", response.status);
      return [];
    }

    const html = await response.text();
    const results: SearchResult[] = [];

    // Parse product cards from HTML
    // Ruten uses data attributes and specific class patterns
    const productPattern = /<a[^>]*href="(https:\/\/www\.ruten\.com\.tw\/item\/show\?[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi;
    const pricePattern = /<span[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/span>/gi;

    let match;
    const products: { url: string; title: string }[] = [];

    while ((match = productPattern.exec(html)) !== null && products.length < 5) {
      products.push({
        url: match[1],
        title: match[2].trim(),
      });
    }

    // Alternative pattern for Ruten's newer layout
    if (products.length === 0) {
      const altPattern = /data-href="(https:\/\/www\.ruten\.com\.tw\/item\/show\?[^"]+)"[\s\S]*?title="([^"]+)"/gi;
      while ((match = altPattern.exec(html)) !== null && products.length < 5) {
        products.push({
          url: match[1],
          title: match[2].trim(),
        });
      }
    }

    // Another alternative for direct link patterns
    if (products.length === 0) {
      const linkPattern = /<a[^>]*href="(https:\/\/www\.ruten\.com\.tw\/item\/show\?[^"]+)"[^>]*title="([^"]+)"/gi;
      while ((match = linkPattern.exec(html)) !== null && products.length < 5) {
        products.push({
          url: match[1],
          title: match[2].trim(),
        });
      }
    }

    for (const product of products) {
      // Extract seller ID from URL if possible
      const sellerMatch = product.url.match(/\/(\d+)\//);
      const sellerId = sellerMatch ? sellerMatch[1] : null;

      results.push({
        title: product.title,
        snippet: `露天拍賣商品 - 搜尋「${serialNumber}」的結果`,
        url: product.url,
        platform: "ruten",
        isShopee: false,
        isRuten: true,
        rutenSellerName: sellerId ? `seller_${sellerId}` : undefined,
        rutenSellerUrl: sellerId ? `https://www.ruten.com.tw/user/${sellerId}/` : undefined,
      });
    }

    console.log(`Ruten search found ${results.length} results for ${serialNumber}`);
    return results;
  } catch (error) {
    console.error("Ruten search error:", error);
    return [];
  }
}

// Google Custom Search API (if configured)
async function searchGoogle(serialNumber: string): Promise<SearchResult[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    console.log("Google Custom Search API not configured, skipping...");
    return [];
  }

  try {
    const keyword = encodeURIComponent(`"${serialNumber}"`);
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${keyword}&num=10`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error("Google API error:", response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    const items = data.items || [];

    const results: SearchResult[] = items.slice(0, 5).map((item: { title?: string; snippet?: string; link?: string }) => {
      const url = item.link || "";
      const platform = detectPlatform(url);
      return {
        title: item.title || "無標題",
        snippet: item.snippet || "",
        url,
        platform,
        isShopee: platform === "shopee",
        isRuten: platform === "ruten",
        shopeeSellerName: platform === "shopee" ? "Shopee賣家" : undefined,
        shopeeSellerUrl: platform === "shopee" ? url : undefined,
        rutenSellerName: platform === "ruten" ? "露天賣家" : undefined,
        rutenSellerUrl: platform === "ruten" ? url : undefined,
      };
    });

    console.log(`Google search found ${results.length} results for ${serialNumber}`);
    return results;
  } catch (error) {
    console.error("Google search error:", error);
    return [];
  }
}

// Search using DuckDuckGo HTML (more reliable than API)
async function searchDuckDuckGo(serialNumber: string): Promise<SearchResult[]> {
  try {
    const keyword = encodeURIComponent(`"${serialNumber}" site:tw`);

    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${keyword}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        },
      }
    );

    if (!response.ok) {
      console.log("DuckDuckGo returned non-OK status:", response.status);
      return [];
    }

    const html = await response.text();

    // Parse results from HTML using regex (simple parsing)
    const results: SearchResult[] = [];

    // Match result links and titles
    const resultPattern = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    const snippetPattern = /<a[^>]*class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi;

    let match;
    const links: { url: string; title: string }[] = [];

    while ((match = resultPattern.exec(html)) !== null && links.length < 5) {
      const url = decodeURIComponent(match[1].replace(/.*uddg=/, "").split("&")[0]);
      const title = match[2].replace(/<[^>]*>/g, "").trim();

      if (url && title && !url.includes("duckduckgo.com")) {
        links.push({ url, title });
      }
    }

    // Get snippets
    const snippets: string[] = [];
    while ((match = snippetPattern.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]*>/g, "").trim());
    }

    for (let i = 0; i < links.length; i++) {
      const url = links[i].url;
      const platform = detectPlatform(url);
      results.push({
        title: links[i].title,
        snippet: snippets[i] || `搜尋結果包含 ${serialNumber}`,
        url,
        platform,
        isShopee: platform === "shopee",
        isRuten: platform === "ruten",
        shopeeSellerName: platform === "shopee" ? "Shopee賣家" : undefined,
        shopeeSellerUrl: platform === "shopee" ? url : undefined,
        rutenSellerName: platform === "ruten" ? "露天賣家" : undefined,
        rutenSellerUrl: platform === "ruten" ? url : undefined,
      });
    }

    return results;
  } catch (error) {
    console.error("DuckDuckGo search error:", error);
    return [];
  }
}

// Alternative: Search using Bing
async function searchBing(serialNumber: string): Promise<SearchResult[]> {
  try {
    const keyword = encodeURIComponent(`"${serialNumber}"`);

    const response = await fetch(
      `https://www.bing.com/search?q=${keyword}&setlang=zh-TW&cc=TW`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const results: SearchResult[] = [];

    // Simple regex to extract Bing results
    const resultPattern = /<a[^>]*href="(https?:\/\/[^"]*)"[^>]*><h2>([^<]*)<\/h2><\/a>/gi;

    let match;
    while ((match = resultPattern.exec(html)) !== null && results.length < 5) {
      const url = match[1];
      const title = match[2];

      if (!url.includes("bing.com") && !url.includes("microsoft.com")) {
        const platform = detectPlatform(url);
        results.push({
          title,
          snippet: `搜尋結果包含 ${serialNumber}`,
          url,
          platform,
          isShopee: platform === "shopee",
          isRuten: platform === "ruten",
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Bing search error:", error);
    return [];
  }
}

// Combined search function
async function performSearch(serialNumber: string, shopeeOnly: boolean): Promise<SearchResult[]> {
  const allResults: SearchResult[] = [];

  if (shopeeOnly) {
    // Only search Shopee
    const shopeeResults = await searchShopee(serialNumber);
    allResults.push(...shopeeResults);
  } else {
    // Try Google first if configured, otherwise use DuckDuckGo/Bing
    const hasGoogleAPI = GOOGLE_API_KEY && GOOGLE_SEARCH_ENGINE_ID;

    if (hasGoogleAPI) {
      // Use Google Custom Search + Shopee + Ruten in parallel
      const [shopeeResults, rutenResults, googleResults] = await Promise.all([
        searchShopee(serialNumber),
        searchRuten(serialNumber),
        searchGoogle(serialNumber),
      ]);

      allResults.push(...shopeeResults);
      allResults.push(...rutenResults);
      allResults.push(...googleResults);

      // Fallback to DuckDuckGo if Google returned no results
      if (googleResults.length === 0) {
        const duckResults = await searchDuckDuckGo(serialNumber);
        allResults.push(...duckResults);
      }
    } else {
      // Use DuckDuckGo + Shopee + Ruten (no Google API configured)
      const [shopeeResults, rutenResults, webResults] = await Promise.all([
        searchShopee(serialNumber),
        searchRuten(serialNumber),
        searchDuckDuckGo(serialNumber),
      ]);

      allResults.push(...shopeeResults);
      allResults.push(...rutenResults);
      allResults.push(...webResults);

      // If DuckDuckGo didn't return results, try Bing as fallback
      if (webResults.length === 0) {
        const bingResults = await searchBing(serialNumber);
        allResults.push(...bingResults);
      }
    }
  }

  // Remove duplicates by URL
  const seen = new Set<string>();
  return allResults.filter((result) => {
    if (seen.has(result.url)) return false;
    seen.add(result.url);
    return true;
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serials, shopeeOnly = false } = body as {
      serials: Array<{ id: string; name: string; serialNumber: string }>;
      shopeeOnly?: boolean;
    };

    if (!serials || !Array.isArray(serials) || serials.length === 0) {
      return NextResponse.json(
        { error: "No serials provided" },
        { status: 400 }
      );
    }

    console.log(`Starting real scan for ${serials.length} serial(s), shopeeOnly: ${shopeeOnly}`);

    const allResults: Array<{
      serialId: string;
      serialName: string;
      serialNumber: string;
      results: SearchResult[];
    }> = [];

    // Process each serial number with a small delay to avoid rate limiting
    for (let i = 0; i < serials.length; i++) {
      const serial = serials[i];

      console.log(`Scanning serial: ${serial.serialNumber}`);

      const results = await performSearch(serial.serialNumber, shopeeOnly);

      console.log(`Found ${results.length} results for ${serial.serialNumber}`);

      if (results.length > 0) {
        allResults.push({
          serialId: serial.id,
          serialName: serial.name,
          serialNumber: serial.serialNumber,
          results,
        });
      }

      // Add a small delay between searches to be respectful
      if (i < serials.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const totalResults = allResults.reduce((sum, r) => sum + r.results.length, 0);
    console.log(`Scan complete. Total results: ${totalResults}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalResults,
      data: allResults,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Scan failed", message: String(error) },
      { status: 500 }
    );
  }
}
