"use client";

/* ==========================================================================*/
// client.tsx — Client-side article page with resizable panel management
/* ==========================================================================*/
// Purpose: Handle resizable panel state and provide panel size to versions component
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
import Versions from "@/components/article/versions";
import ArticleContentPanel from "@/components/article/article-content-panel";

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

/* ==========================================================================*/
// Main Component
/* ==========================================================================*/

/**
 * ArticlePageClient
 *
 * Client component for article page with resizable panels and size tracking.
 * Manages versions panel size state and provides programmatic resizing with dynamic constraints.
 */
function ArticlePageClient() {
  // Panel state tracking ---
  const [versionsPanelSize, setVersionsPanelSize] = useState<number>(21); // Default size
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const versionsPanelRef = useRef<ImperativePanelHandle>(null);

  // Panel resize handlers ---
  const handleVersionsPanelResize = (size: number) => {
    setVersionsPanelSize(size);
  };

  const collapseVersionsPanel = () => {
    setIsCollapsed(true);
    setVersionsPanelSize(3);
  };

  const expandVersionsPanel = () => {
    setIsCollapsed(false);
    setVersionsPanelSize(21);
  };

  return (
    <div className="h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] transition-[height] ease-linear">
      {/* Mobile/Tablet Layout (up to lg) - Main content with Drawer for versions */}
      <div className="lg:hidden h-full">
        <div className="h-full flex flex-col relative">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <ArticleContentPanel />
          </div>

          {/* Floating Drawer Trigger */}
          <div className="fixed bottom-6 right-6 z-40">
            <Drawer>
              <DrawerTrigger asChild>
                <Button size="lg" className="shadow-lg">
                  Versions
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Article Versions</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
                  <Versions 
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
            defaultSize={isCollapsed ? 97 : 75} 
            minSize={70} 
            maxSize={isCollapsed ? 97 : 80} 
            className=""
          >
            <ArticleContentPanel />
          </ResizablePanel>

          <ResizableHandle />

          {/* Versions Panel - Force remount with key when collapse state changes */}
          <ResizablePanel 
            ref={versionsPanelRef}
            id="versions-panel"
            key={`versions-panel-${isCollapsed ? 'collapsed' : 'expanded'}`}
            defaultSize={isCollapsed ? 3 : 25} 
            minSize={isCollapsed ? 3 : 20} 
            maxSize={isCollapsed ? 3 : 30} 
            className="bg-secondary/30"
            onResize={handleVersionsPanelResize}
          >
            <Versions 
              isCollapsed={isCollapsed} 
              onCollapse={collapseVersionsPanel} 
              onExpand={expandVersionsPanel} 
              panelSize={versionsPanelSize}
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

export default ArticlePageClient; 