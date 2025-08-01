"use client";

/* ==========================================================================*/
// client.tsx — Client-side digest page with resizable panel management
/* ==========================================================================*/
// Purpose: Handle resizable panel state and provide panel size to presets component
// Sections: Imports, Hooks, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import React, { useState, useRef } from "react";

// Local Modules ---
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { BasicArticleInputs } from "@/components/article-handling/shared/basic";
import { ArticleActions } from "@/components/article-handling/shared/actions";
import { SourceInputs } from "@/components/article-handling/shared/source";
import { PresetsManager } from "@/components/article-handling/shared/presets";

// Types ---
import { Preset } from "@/db/schema";

/* ==========================================================================*/
// Types and Interfaces
/* ==========================================================================*/

interface ImperativePanelHandle {
  getId(): string;
  getSize(): number;
  resize(size: number): void;
  isCollapsed(): boolean;
  isExpanded(): boolean;
  collapse(): void;
  expand(): void;
}

interface DigestPageClientProps {
  presets: Preset[];
}

/* ==========================================================================*/
// Main Component
/* ==========================================================================*/

/**
 * DigestPageClient
 *
 * Client component for digest page with resizable panels and size tracking.
 * Manages presets panel size state and provides programmatic resizing with dynamic constraints.
 */
function DigestPageClient({ presets }: DigestPageClientProps) {
  // Panel state tracking ---
  const [presetsPanelSize, setPresetsPanelSize] = useState<number>(21); // Default size
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const presetsPanelRef = useRef<ImperativePanelHandle>(null);

  // Panel resize handlers ---
  const handlePresetsPanelResize = (size: number) => {
    setPresetsPanelSize(size);
  };

  const collapsePresetsPanel = () => {
    setIsCollapsed(true);
    setPresetsPanelSize(3);
  };

  const expandPresetsPanel = () => {
    setIsCollapsed(false);
    setPresetsPanelSize(21);
  };

  return (
    <div className="h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] transition-[height] ease-linear">
      {/* Mobile/Tablet Layout (up to lg) - Main content with Drawer for presets */}
      <div className="lg:hidden h-full">
        <div className="h-full flex flex-col relative">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-20 space-y-12">
            <BasicArticleInputs />
            <SourceInputs />
            <ArticleActions />
          </div>

          {/* Floating Drawer Trigger */}
          <div className="fixed bottom-6 right-6 z-40">
            <Drawer>
              <DrawerTrigger asChild>
                <Button size="lg" className="shadow-lg">
                  Presets
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Article Presets</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
                  <PresetsManager 
                    presets={presets}
                    isCollapsed={false} 
                    onCollapse={() => {}} 
                    onExpand={() => {}} 
                    panelSize={100}
                  />
                </div>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button variant="outline">Close</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>

      {/* Desktop Layout (lg+) - Resizable horizontal panels */}
      <div className="hidden lg:block h-full">
        <ResizablePanelGroup 
          direction="horizontal" 
          className="h-full"
          key={`panel-group-${isCollapsed ? 'collapsed' : 'expanded'}`}
        >
          {/* Main Content Panel */}
          <ResizablePanel 
            defaultSize={isCollapsed ? 97 : 79} 
            minSize={60} 
            maxSize={isCollapsed ? 97 : 79} 
            className=""
          >
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-12">
                <BasicArticleInputs />
                <SourceInputs />
                <ArticleActions />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Presets Panel - Force remount with key when collapse state changes */}
          <ResizablePanel 
            ref={presetsPanelRef}
            id="presets-panel"
            key={`presets-panel-${isCollapsed ? 'collapsed' : 'expanded'}`}
            defaultSize={isCollapsed ? 3 : 21} 
            minSize={isCollapsed ? 3 : 15} 
            maxSize={isCollapsed ? 3 : 30} 
            className="bg-secondary/30"
            onResize={handlePresetsPanelResize}
          >
            <PresetsManager 
              presets={presets}
              isCollapsed={isCollapsed} 
              onCollapse={collapsePresetsPanel} 
              onExpand={expandPresetsPanel} 
              panelSize={presetsPanelSize}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default DigestPageClient; 