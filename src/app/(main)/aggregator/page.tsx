/* ==========================================================================*/
// page.tsx — Unified Aggregator page layout with resizable panels
/* ==========================================================================*/
// Purpose: Show aggregator builder using unified context and shared components.
//          If ?slug=&version= are provided we pre-fill the context with that
//          article's data; otherwise the builder is blank.
// Sections: Imports ▸ Utility Functions ▸ Data fetch ▸ Component ▸ Exports
/* ==========================================================================*/

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React Server Component -----------------------------------------------------
import React from "react";

// DAL helpers ----------------------------------------------------------------
import { getArticleByOrgSlugVersion, getOrgPresets } from "@/db/dal";
import type { Article } from "@/db/schema";

// Auth helpers ---------------------------------------------------------------
import { getAuthenticatedUserServer } from "@/lib/supabase/server";

// Next.js helpers ------------------------------------------------------------
import { redirect } from "next/navigation";

// Shared UI Components -------------------------------------------------------
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { BasicArticleInputs } from "@/components/article-handling/shared/basic";
import { ArticleActions } from "@/components/article-handling/shared/actions";
import { SourceInputs } from "@/components/article-handling/shared/source";
import { PresetsManager } from "@/components/article-handling/shared/presets";

// Unified Context ------------------------------------------------------------
import { ArticleHandlerProvider, type ArticleHandlerState } from "@/components/article-handling/shared/article-handler-context";

/* ==========================================================================*/
// Utility Functions
/* ==========================================================================*/

/**
 * buildInitialStateFromInputs
 *
 * Converts Article inputs from the database into ArticleHandlerState format
 * for pre-filling the aggregator form with up to 6 sources.
 *
 * @param inputs - The article inputs from the database
 * @param orgId - Organization ID
 * @param currentVersion - The current version of the article
 * @returns Partial ArticleHandlerState for context initialization
 */
function buildInitialStateFromInputs(inputs: Article, orgId: number = 1, currentVersion: number = 1): Partial<ArticleHandlerState> {
  // Build sources array from database fields
  const sources = [];

  // Source 1 (always present since it's required)
  sources.push({
    id: `source-1-${Date.now()}`,
    url: inputs.inputSourceUrl1 || "",
    usage: {
      sourceText: inputs.inputSourceText1,
      description: inputs.inputSourceDescription1,
      accredit: inputs.inputSourceAccredit1,
      verbatim: inputs.inputSourceVerbatim1,
      primary: inputs.inputSourcePrimary1,
      base: false, // Default to false, can be changed in UI
    },
  });

  // Sources 2-6 (optional, only add if they have content)
  if (inputs.inputSourceText2) {
    sources.push({
      id: `source-2-${Date.now()}`,
      url: inputs.inputSourceUrl2 || "",
      usage: {
        sourceText: inputs.inputSourceText2,
        description: inputs.inputSourceDescription2 || "",
        accredit: inputs.inputSourceAccredit2 || "",
        verbatim: inputs.inputSourceVerbatim2 || false,
        primary: inputs.inputSourcePrimary2 || false,
        base: false,
      },
    });
  }

  if (inputs.inputSourceText3) {
    sources.push({
      id: `source-3-${Date.now()}`,
      url: inputs.inputSourceUrl3 || "",
      usage: {
        sourceText: inputs.inputSourceText3,
        description: inputs.inputSourceDescription3 || "",
        accredit: inputs.inputSourceAccredit3 || "",
        verbatim: inputs.inputSourceVerbatim3 || false,
        primary: inputs.inputSourcePrimary3 || false,
        base: false,
      },
    });
  }

  if (inputs.inputSourceText4) {
    sources.push({
      id: `source-4-${Date.now()}`,
      url: inputs.inputSourceUrl4 || "",
      usage: {
        sourceText: inputs.inputSourceText4,
        description: inputs.inputSourceDescription4 || "",
        accredit: inputs.inputSourceAccredit4 || "",
        verbatim: inputs.inputSourceVerbatim4 || false,
        primary: inputs.inputSourcePrimary4 || false,
        base: false,
      },
    });
  }

  if (inputs.inputSourceText5) {
    sources.push({
      id: `source-5-${Date.now()}`,
      url: inputs.inputSourceUrl5 || "",
      usage: {
        sourceText: inputs.inputSourceText5,
        description: inputs.inputSourceDescription5 || "",
        accredit: inputs.inputSourceAccredit5 || "",
        verbatim: inputs.inputSourceVerbatim5 || false,
        primary: inputs.inputSourcePrimary5 || false,
        base: false,
      },
    });
  }

  if (inputs.inputSourceText6) {
    sources.push({
      id: `source-6-${Date.now()}`,
      url: inputs.inputSourceUrl6 || "",
      usage: {
        sourceText: inputs.inputSourceText6,
        description: inputs.inputSourceDescription6 || "",
        accredit: inputs.inputSourceAccredit6 || "",
        verbatim: inputs.inputSourceVerbatim6 || false,
        primary: inputs.inputSourcePrimary6 || false,
        base: false,
      },
    });
  }

  return {
    basic: {
      slug: inputs.slug,
      headline: inputs.headline ?? "",
    },
    sources,
    preset: {
      title: inputs.inputPresetTitle ?? "",
      instructions: inputs.inputPresetInstructions,
      blobs: inputs.inputPresetBlobs,
      length: inputs.inputPresetLength,
    },
    metadata: {
      orgId,
      currentVersion,
    },
    mode: "multi", // Always multi mode for aggregator
  };
}

/* ==========================================================================*/
// Main Component
/* ==========================================================================*/

/**
 * Aggregator2Page
 *
 * Unified aggregator page with resizable left panel for input forms and right panel for presets manager.
 * Uses shared components and unified context. 70/30 split with user-adjustable resize handle.
 */
async function Aggregator2Page({ searchParams }: { searchParams: Promise<{ slug?: string; version?: string }> }) {
  /* ------------------------- 1. Parse URL params ----------------------- */
  const { slug, version } = await searchParams;
  const user = await getAuthenticatedUserServer();
  if (!user) {
    redirect("/login");
  }
  const ORG_ID = user.orgId;

  /* ------------------------- 2. Fetch presets (always) ------------------ */
  const presets = await getOrgPresets(ORG_ID);

  /* ------------------------- 3. Fetch article (optional) ---------------- */
  let initialState: Partial<ArticleHandlerState> | undefined;

  if (slug) {
    try {
      // Get both article metadata and inputs
      const article = await getArticleByOrgSlugVersion(ORG_ID, slug, version ? version : "1.00");

      if (article) {
        console.log("🔍 article:", article);
        initialState = buildInitialStateFromInputs(article, ORG_ID, version ? Number(version) : 1);
      }
      // If no article found, initialState remains undefined (blank form)
    } catch (error) {
      console.error("Failed to fetch article, leaving blank form:", error);
      // Continue with blank form on error
    }
  }

  console.log("🔍 Aggregator2Page version:", version ? Number(version) : 1);

  // For new articles, make sure we have the orgId in metadata and set multi mode
  if (!initialState) {
    initialState = {
      metadata: {
        orgId: ORG_ID,
        currentVersion: version ? Number(version) : 1,
      },
      mode: "multi",
    };
  } else {
    // Ensure mode is set to multi even when loading existing article
    initialState.mode = "multi";
  }

  console.log("🔍 Aggregator2Page initialState:", initialState);

  /* ------------------------- 4. Render client tree --------------------- */
  return (
    <ArticleHandlerProvider initialMode="multi" initialState={initialState}>
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
                    <PresetsManager presets={presets} />
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
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Main Content Panel */}
            <ResizablePanel defaultSize={79} minSize={60} maxSize={79} className="">
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-12">
                  <BasicArticleInputs />
                  <SourceInputs />
                  <ArticleActions />
                </div>
              </div>
            </ResizablePanel>
            
            <ResizableHandle />
            
            {/* Presets Panel */}
            <ResizablePanel defaultSize={21} minSize={21} maxSize={40} className="bg-secondary/30">
              <PresetsManager presets={presets} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

      </div>
    </ArticleHandlerProvider>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default Aggregator2Page;
