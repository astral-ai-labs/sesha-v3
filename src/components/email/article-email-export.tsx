/* ==========================================================================*/
// article-email-export.tsx — Email template for article export functionality
/* ==========================================================================*/
// Purpose: Renders email template when users send articles via email export
// Sections: Imports, Props, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React Core ---
import * as React from "react";

/* ==========================================================================*/
// Props Interface
/* ==========================================================================*/

interface ArticleEmailExportProps {
  recipientName: string;
  senderName: string;
  articleHeadline: string;
  articleSlug: string;
  versionDecimal: string;
  href: string;
  content?: string;
  articleHtml?: string;
  blobs?: string;
}

/* ==========================================================================*/
// Component
/* ==========================================================================*/

export function ArticleEmailExport({ articleHeadline, articleSlug, versionDecimal, href, content, articleHtml, blobs }: ArticleEmailExportProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Format blobs as bullet points
  const formatBlobs = (blobText: string) => {
    if (!blobText) return null;

    const blobItems = blobText
      .split("\n")
      .map((blob) => blob.trim())
      .filter((blob) => blob.length > 0);

    return blobItems.map((blob, index) => (
      <div
        key={index}
        style={{
          margin: "8px 0",
          fontSize: "16px",
          fontWeight: "bold",
          color: "#000",
          paddingLeft: "20px",
          textIndent: "-20px",
        }}
      >
        • {blob}
      </div>
    ));
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        backgroundColor: "white",
        fontFamily: "Arial, sans-serif",
        padding: "20px",
        border: "none",
        borderLeft: "none",
      }}
    >
      {/* Greeting */}
      <p style={{ margin: "0 0 20px 0", fontSize: "16px", color: "#000", padding: "0", border: "none" }}>Hi,</p>

      {/* Custom message if provided */}
      {content && content.trim() && <p style={{ margin: "0 0 20px 0", fontSize: "16px", color: "#000", whiteSpace: "pre-wrap", padding: "0", border: "none" }}>{content}</p>}

      {/* Separator */}
      <hr style={{ border: "none", borderTop: "1px solid #000", margin: "20px 0" }} />

      {/* Metadata */}
      <div style={{ margin: "20px 0", fontSize: "14px", color: "#000", padding: "0", border: "none" }}>
        <p style={{ margin: "0 0 5px 0", padding: "0", border: "none" }}>
          <strong>Slug:</strong> {articleSlug} <strong>Version:</strong> {versionDecimal}
        </p>
        <p style={{ margin: "0 0 5px 0", padding: "0", border: "none" }}>
          <strong>Export by:</strong> sesha systems <strong>on:</strong> {currentDate}
        </p>
      </div>

      {/* Separator */}
      <hr style={{ border: "none", borderTop: "1px solid #000", margin: "20px 0" }} />

      {/* Article Title */}
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "#000",
          margin: "20px 0 20px 0",
          lineHeight: "1.3",
          padding: "0",
          border: "none",
        }}
      >
        {articleHeadline}
      </h1>

      {/* Article Link */}
      <div style={{ margin: "20px 0", textAlign: "center" }}>
        <a
          href={href}
          style={{
            display: "inline-block",
            backgroundColor: "#007bff",
            color: "white",
            padding: "12px 24px",
            textDecoration: "none",
            borderRadius: "4px",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          View Article Online
        </a>
      </div>

      {/* Blobs */}
      {blobs && blobs.trim() && <div style={{ margin: "0 0 20px 0", padding: "0", border: "none" }}>{formatBlobs(blobs)}</div>}

      {/* Article Content */}
      {articleHtml && articleHtml.trim() && (
        <div
          style={{
            fontSize: "16px",
            lineHeight: "1.6",
            color: "#000",
            margin: "10px 0 0 0",
            padding: "0",
            border: "none",
          }}
          dangerouslySetInnerHTML={{ __html: articleHtml }}
        />
      )}
    </div>
  );
}