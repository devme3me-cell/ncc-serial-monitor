"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface EmailSettings {
  enabled: boolean;
  recipientEmail: string;
  configured: boolean;
}

interface EmailNotificationsContextType {
  settings: EmailSettings;
  isLoading: boolean;
  updateSettings: (settings: Partial<EmailSettings>) => void;
  sendEmailNotification: (detections: Array<{
    serialNumber: string;
    serialName: string;
    pageTitle: string;
    sourceUrl: string;
    isShopee: boolean;
  }>) => Promise<boolean>;
  checkConfiguration: () => Promise<void>;
}

const EmailNotificationsContext = createContext<EmailNotificationsContextType | undefined>(undefined);

const STORAGE_KEY = "ncc-monitor-email-settings";

const DEFAULT_SETTINGS: EmailSettings = {
  enabled: false,
  recipientEmail: "",
  configured: false,
};

export function EmailNotificationsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage and check configuration on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore
      }
    }

    // Check server configuration
    const checkConfig = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/notify");
        const data = await response.json();
        setSettings((prev) => ({
          ...prev,
          configured: data.configured,
        }));
      } catch (error) {
        console.error("Failed to check email configuration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkConfig();
  }, []);

  // Save settings to storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const checkConfiguration = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notify");
      const data = await response.json();
      setSettings((prev) => ({
        ...prev,
        configured: data.configured,
      }));
    } catch (error) {
      console.error("Failed to check email configuration:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<EmailSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const sendEmailNotification = useCallback(
    async (
      detections: Array<{
        serialNumber: string;
        serialName: string;
        pageTitle: string;
        sourceUrl: string;
        isShopee: boolean;
      }>
    ): Promise<boolean> => {
      if (!settings.enabled || detections.length === 0) {
        return false;
      }

      try {
        const response = await fetch("/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            detections,
            recipientEmail: settings.recipientEmail || undefined,
          }),
        });

        const data = await response.json();
        return data.success === true;
      } catch (error) {
        console.error("Failed to send email notification:", error);
        return false;
      }
    },
    [settings.enabled, settings.recipientEmail]
  );

  return (
    <EmailNotificationsContext.Provider
      value={{
        settings,
        isLoading,
        updateSettings,
        sendEmailNotification,
        checkConfiguration,
      }}
    >
      {children}
    </EmailNotificationsContext.Provider>
  );
}

export function useEmailNotifications() {
  const context = useContext(EmailNotificationsContext);
  if (!context) {
    throw new Error("useEmailNotifications must be used within an EmailNotificationsProvider");
  }
  return context;
}
