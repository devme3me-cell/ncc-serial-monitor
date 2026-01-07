"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { SerialsPage } from "@/components/serials-page";
import { DetectionsPage } from "@/components/detections-page";
import { SettingsPage } from "@/components/settings-page";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            onNavigateToSerials={() => setActiveTab("serials")}
            onNavigateToDetections={() => setActiveTab("detections")}
            onNavigateToSettings={() => setActiveTab("settings")}
          />
        );
      case "serials":
        return <SerialsPage />;
      case "detections":
        return <DetectionsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AppShell>
  );
}
