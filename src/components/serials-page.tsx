"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  List,
  AlertCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { Serial } from "@/lib/types";
import * as store from "@/lib/store";
import { scanSingleSerial } from "@/lib/api";
import { useNotifications } from "@/hooks/use-notifications";

export function SerialsPage() {
  const [serials, setSerials] = useState<Serial[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSerial, setEditingSerial] = useState<Serial | null>(null);
  const [deletingSerial, setDeletingSerial] = useState<Serial | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningSerialId, setScanningSerialId] = useState<string | null>(null);

  const { sendNotification } = useNotifications();

  // Form state
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadSerials = () => {
    setSerials(store.getSerials());
  };

  useEffect(() => {
    loadSerials();
  }, []);

  const resetForm = () => {
    setName("");
    setSerialNumber("");
    setIsActive(true);
  };

  // Scan a single serial and show results
  const performScanForSerial = async (serial: Serial) => {
    setIsScanning(true);
    setScanningSerialId(serial.id);

    try {
      const { newDetections, totalFound } = await scanSingleSerial(serial);

      if (newDetections.length > 0) {
        toast.success(`掃描完成！發現 ${newDetections.length} 筆結果`, {
          description: `序號「${serial.name}」已完成掃描`,
        });

        sendNotification(
          "新序號掃描發現結果",
          `序號「${serial.name}」發現 ${newDetections.length} 筆使用記錄`,
          "warning"
        );
      } else if (totalFound > 0) {
        toast.info(`掃描完成，共 ${totalFound} 筆結果（無新發現）`, {
          description: `序號「${serial.name}」`,
        });
      } else {
        toast.success(`掃描完成，未發現任何使用記錄`, {
          description: `序號「${serial.name}」目前安全`,
        });
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("掃描失敗", {
        description: "無法完成掃描，請稍後手動重試",
      });
    } finally {
      setIsScanning(false);
      setScanningSerialId(null);
    }
  };

  const handleAdd = async () => {
    if (!name.trim() || !serialNumber.trim()) {
      toast.error("請填寫所有必填欄位");
      return;
    }

    const serial = store.createSerial({
      name: name.trim(),
      serialNumber: serialNumber.trim(),
      isActive,
    });

    toast.success("序號已新增，正在掃描全網...", {
      description: `正在搜尋「${serial.serialNumber}」的使用記錄`,
      icon: <Search className="w-4 h-4" />,
    });

    loadSerials();
    setIsAddDialogOpen(false);
    resetForm();

    // Trigger automatic scan for the new serial if it's active
    if (isActive) {
      await performScanForSerial(serial);
    }
  };

  const handleRescan = async (serial: Serial) => {
    await performScanForSerial(serial);
  };

  const handleEdit = () => {
    if (!editingSerial || !name.trim() || !serialNumber.trim()) {
      toast.error("請填寫所有必填欄位");
      return;
    }

    store.updateSerial(editingSerial.id, {
      name: name.trim(),
      serialNumber: serialNumber.trim(),
      isActive,
    });

    toast.success("序號已更新");
    loadSerials();
    setIsEditDialogOpen(false);
    setEditingSerial(null);
    resetForm();
  };

  const handleDelete = () => {
    if (!deletingSerial) return;

    store.deleteSerial(deletingSerial.id);
    toast.success("序號已刪除");
    loadSerials();
    setIsDeleteDialogOpen(false);
    setDeletingSerial(null);
  };

  const handleToggleActive = (serial: Serial) => {
    store.updateSerial(serial.id, { isActive: !serial.isActive });
    toast.success(serial.isActive ? "序號已停用" : "序號已啟用");
    loadSerials();
  };

  const openEditDialog = (serial: Serial) => {
    setEditingSerial(serial);
    setName(serial.name);
    setSerialNumber(serial.serialNumber);
    setIsActive(serial.isActive);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (serial: Serial) => {
    setDeletingSerial(serial);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">序號管理</h2>
          <p className="text-muted-foreground">管理您要監控的 NCC 序號</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setIsAddDialogOpen(true);
              }}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增序號
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增序號</DialogTitle>
              <DialogDescription>
                輸入要監控的 NCC 序號資訊，新增後將自動掃描全網
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">名稱</Label>
                <Input
                  id="add-name"
                  placeholder="例：手機型號 A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-serial">序號</Label>
                <Input
                  id="add-serial"
                  placeholder="例：NCC-ABC123456"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <Label htmlFor="add-active" className="cursor-pointer">
                  立即啟用監控（啟用後自動掃描）
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAdd} disabled={isScanning}>
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    掃描中...
                  </>
                ) : (
                  "新增並掃描"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Banner */}
      <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Search className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-orange-800 dark:text-orange-200">
                自動掃描功能
              </p>
              <p className="text-orange-700 dark:text-orange-300 mt-1">
                新增序號後，系統會自動掃描蝦皮、露天及其他網站，將發現的結果存入偵測記錄。
                您也可以隨時點擊序號旁的掃描按鈕手動重新掃描。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Serials List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5" />
            序號列表
          </CardTitle>
          <CardDescription>
            共 {serials.length} 個序號，{serials.filter((s) => s.isActive).length} 個啟用中
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serials.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium text-lg">尚未新增任何序號</p>
              <p className="text-muted-foreground mt-1">
                點擊「新增序號」開始監控
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {serials.map((serial, index) => (
                  <div key={serial.id}>
                    {index > 0 && <Separator className="my-2" />}
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{serial.name}</p>
                          <Badge
                            variant={serial.isActive ? "default" : "secondary"}
                            className={serial.isActive ? "bg-green-500" : ""}
                          >
                            {serial.isActive ? "啟用" : "停用"}
                          </Badge>
                          {scanningSerialId === serial.id && (
                            <Badge variant="outline" className="animate-pulse">
                              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              掃描中
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-mono text-muted-foreground mt-1">
                          {serial.serialNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          新增於 {new Date(serial.createdAt).toLocaleDateString("zh-TW")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Manual Rescan Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRescan(serial)}
                          disabled={isScanning || !serial.isActive}
                          title="重新掃描"
                        >
                          <RefreshCw className={`w-4 h-4 ${scanningSerialId === serial.id ? "animate-spin" : ""}`} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRescan(serial)}
                              disabled={isScanning}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              重新掃描
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(serial)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              編輯
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(serial)}>
                              {serial.isActive ? (
                                <>
                                  <PowerOff className="w-4 h-4 mr-2" />
                                  停用
                                </>
                              ) : (
                                <>
                                  <Power className="w-4 h-4 mr-2" />
                                  啟用
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(serial)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              刪除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯序號</DialogTitle>
            <DialogDescription>
              修改序號資訊
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">名稱</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-serial">序號</Label>
              <Input
                id="edit-serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              <Label htmlFor="edit-active" className="cursor-pointer">
                啟用監控
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              確定要刪除序號「{deletingSerial?.name}」嗎？此操作無法復原，相關的偵測記錄也會一併刪除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
