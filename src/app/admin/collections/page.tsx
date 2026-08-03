"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { CollectionList } from "@/components/collection/CollectionList";
import { CreateCollectionDialog } from "@/components/collection/CreateCollectionDialog";
import { ImportCollectionDialog } from "@/components/collection/ImportCollectionDialog";
import { AdminHeader } from "@/components/admin/header";

export default function CollectionsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [hasCollections, setHasCollections] = useState(true);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const fetchCollections = async () => {
    // 这里是获取书签集合的逻辑
  };

  const handleCreateSuccess = () => {
    setKey(prev => prev + 1);
    fetchCollections();
  };

  const handleCollectionsChange = (collections: any[]) => {
    setHasCollections(collections.length > 0);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader title="合集管理">
        {(
          <>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              新建合集
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              导入合集
            </Button>
          </>
        )}
      </AdminHeader>

      <main className="flex-1 overflow-y-auto p-8 bg-background">
        <CollectionList key={key} onCollectionsChange={handleCollectionsChange} />

        <CreateCollectionDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSuccess={handleCreateSuccess}
        />

        <ImportCollectionDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
        />
      </main>
    </div>
  );
}
