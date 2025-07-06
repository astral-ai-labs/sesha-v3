/* ==========================================================================*/
// page.tsx — Aggregator page layout with resizable panels
/* ==========================================================================*/
// Purpose: Show aggregator builder. If ?slug=&version= are provided we pre-fill the
//          context with that article's data; otherwise the builder is blank.
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

// Aggregator UI (all client components) -------------------------------------
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { BasicAggregatorInputs } from "@/components/aggregator/basic";
import { AggregatorActions } from "@/components/aggregator/actions";
import { SourceInputs } from "@/components/aggregator/source";
import { PresetsManager } from "@/components/aggregator/presets";

// Context --------------------------------------------------------------------
import { AggregatorProvider, type AggregatorState } from "@/components/aggregator/aggregator-context";

/* ==========================================================================*/
// Utility Functions
/* ==========================================================================*/

/**
 * buildInitialStateFromInputs
 * 
 * Converts Article inputs from the database into AggregatorState format
 * for pre-filling the aggregator form with up to 6 sources.
 * 
 * @param inputs - The article inputs from the database
 * @param orgId - Organization ID
 * @param currentVersion - The current version of the article
 * @returns Partial AggregatorState for context initialization
 */
function buildInitialStateFromInputs(
  inputs: Article, 
  orgId: number = 1,
  currentVersion: number = 1
): Partial<AggregatorState> {
  // Build sources array from database fields
  const sources = [];
  
  // Source 1 (always present since it's required)
  sources.push({
    id: `source-1-${Date.now()}`,
    url: "", // URL is not stored in DB, only used for processing
    usage: {
      sourceText: inputs.inputSourceText1,
      description: inputs.inputSourceDescription1,
      accredit: inputs.inputSourceAccredit1,
      verbatim: inputs.inputSourceVerbatim1,
      primary: inputs.inputSourcePrimary1,
    }
  });

  // Sources 2-6 (optional, only add if they have content)
  if (inputs.inputSourceText2) {
    sources.push({
      id: `source-2-${Date.now()}`,
      url: "",
      usage: {
        sourceText: inputs.inputSourceText2,
        description: inputs.inputSourceDescription2 || "",
        accredit: inputs.inputSourceAccredit2 || "",
        verbatim: inputs.inputSourceVerbatim2 || false,
        primary: inputs.inputSourcePrimary2 || false,
      }
    });
  }

  if (inputs.inputSourceText3) {
    sources.push({
      id: `source-3-${Date.now()}`,
      url: "",
      usage: {
        sourceText: inputs.inputSourceText3,
        description: inputs.inputSourceDescription3 || "",
        accredit: inputs.inputSourceAccredit3 || "",
        verbatim: inputs.inputSourceVerbatim3 || false,
        primary: inputs.inputSourcePrimary3 || false,
      }
    });
  }

  if (inputs.inputSourceText4) {
    sources.push({
      id: `source-4-${Date.now()}`,
      url: "",
      usage: {
        sourceText: inputs.inputSourceText4,
        description: inputs.inputSourceDescription4 || "",
        accredit: inputs.inputSourceAccredit4 || "",
        verbatim: inputs.inputSourceVerbatim4 || false,
        primary: inputs.inputSourcePrimary4 || false,
      }
    });
  }

  if (inputs.inputSourceText5) {
    sources.push({
      id: `source-5-${Date.now()}`,
      url: "",
      usage: {
        sourceText: inputs.inputSourceText5,
        description: inputs.inputSourceDescription5 || "",
        accredit: inputs.inputSourceAccredit5 || "",
        verbatim: inputs.inputSourceVerbatim5 || false,
        primary: inputs.inputSourcePrimary5 || false,
      }
    });
  }

  if (inputs.inputSourceText6) {
    sources.push({
      id: `source-6-${Date.now()}`,
      url: "",
      usage: {
        sourceText: inputs.inputSourceText6,
        description: inputs.inputSourceDescription6 || "",
        accredit: inputs.inputSourceAccredit6 || "",
        verbatim: inputs.inputSourceVerbatim6 || false,
        primary: inputs.inputSourcePrimary6 || false,
      }
    });
  }

  return {
    basic: {
      slug: inputs.slug,
      headline: ""
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
  };
}

/* ==========================================================================*/
// Main Component  
/* ==========================================================================*/

/**
 * AggregatorPage
 *
 * Main aggregator page with resizable left panel for input forms and right panel for presets manager.
 * Uses 70/30 split with user-adjustable resize handle.
 */
async function AggregatorPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ slug?: string; version?: string }> 
}) {
  /* ------------------------- 1. Parse URL params ----------------------- */
  const { slug, version } = await searchParams;
  const ORG_ID = 1; // <-- replace w/ auth session later

  /* ------------------------- 2. Fetch presets (always) ------------------ */
  const presets = await getOrgPresets(ORG_ID);

  /* ------------------------- 3. Fetch article (optional) ---------------- */
  let initialState: Partial<AggregatorState> | undefined;

  if (slug) {
    try {
      // Get both article metadata and inputs
      const article = await getArticleByOrgSlugVersion(ORG_ID, slug, version ? Number(version) : 1);
      
      if (article) {
        initialState = buildInitialStateFromInputs(
          article, 
          ORG_ID,
          version ? Number(version) : 1
        );
      }
      // If no article found, initialState remains undefined (blank form)
    } catch (error) {
      console.error('Failed to fetch article, leaving blank form:', error);
      // Continue with blank form on error
    }
  }

  console.log("🔍 AggregatorPage version:", version ? Number(version) : 1);

  // For new articles, make sure we have the orgId in metadata
  if (!initialState) {
    initialState = {
      metadata: {
        orgId: ORG_ID,
        currentVersion: version ? Number(version) : 1,
      },
    };
  }

  console.log("🔍 AggregatorPage initialState:", initialState);

  /* ------------------------- 4. Render client tree --------------------- */
  return (
    <AggregatorProvider initialState={initialState}>
      <div className="h-[calc(100vh-4rem)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100vh-3rem)] transition-[height] ease-linear">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Start of Left Panel --- */}
          <ResizablePanel defaultSize={65} minSize={60} maxSize={70} className="">
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-12">

                <BasicAggregatorInputs />
                <SourceInputs />
                <AggregatorActions />   
              </div>
            </div>
          </ResizablePanel>
          {/* End of Left Panel ---- */}

          <ResizableHandle />

          {/* Start of Right Panel --- */}
          <ResizablePanel defaultSize={35} minSize={30} maxSize={40} className="max-h-full bg-secondary/30">
            <PresetsManager presets={presets} />
          </ResizablePanel>
          {/* End of Right Panel ---- */}
        </ResizablePanelGroup>
      </div>
    </AggregatorProvider>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/

export default AggregatorPage;
