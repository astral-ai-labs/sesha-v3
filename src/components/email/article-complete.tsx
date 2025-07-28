/* ==========================================================================*/
// article-complete.tsx — Article completion email component
/* ==========================================================================*/
// Purpose: Renders a styled email notification when an article is completed
// Sections: Imports, Props, Component, Exports

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React Core ---
import * as React from "react";

/* ==========================================================================*/
// Props Interface
/* ==========================================================================*/

interface ArticleCompleteProps {
  name: string;
  slug: string;
  versionDecimal: string;
  href: string;
}

/* ==========================================================================*/
// Component
/* ==========================================================================*/

export function ArticleComplete({ name, slug, versionDecimal, href }: ArticleCompleteProps) {
  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      padding: '24px',
      border: 'none',
    }}>
      {/* Header with Logo */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          marginBottom: '16px' 
        }}>
          {/* <img
            src="" 
            alt="Sesha Logo" 
            style={{ width: '195px', height: '50px' }}
          /> */}
        </div>
        
        {/* Article Completed Banner */}
        <div style={{
          backgroundColor: 'black',
          color: 'white',
          textAlign: 'center',
          padding: '12px 24px',
          borderRadius: '0',
          marginBottom: '24px'
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            ARTICLE COMPLETED
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ marginBottom: '24px' }}>
        {/* Greeting */}
        <p style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          color: '#374151',
          lineHeight: '1.5'
        }}>
          Hi {name},
        </p>

        {/* Article completion message */}
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '16px',
          color: '#374151',
          lineHeight: '1.6'
        }}>
          Your <span style={{ fontWeight: '500' }}>article</span> - &quot;{slug}&quot; version: {versionDecimal} is now complete! This <span style={{ fontWeight: '500' }}>article</span> is ready for your review.
        </p>

        {/* Review Button */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                backgroundColor: '#2563eb',
                color: 'white',
                fontWeight: 'bold',
                padding: '16px 24px',
                textAlign: 'center',
                fontSize: '16px',
                letterSpacing: '0.05em',
                borderRadius: '6px',
                textDecoration: 'none',
                textTransform: 'uppercase',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              REVIEW &quot;{slug}&quot; VERSION {versionDecimal}
            </a>
          </div>
        </div>

        {/* Instructions and Alternative Link */}
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '16px',
          color: '#374151',
          lineHeight: '1.6'
        }}>
          Or copy this link into your browser:{" "}
          <a 
            href={href} 
            style={{
              color: '#2563eb',
              textDecoration: 'underline'
            }}
            target="_blank" 
            rel="noopener noreferrer"
          >
            {href}
          </a>
        </p>
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '16px',
          color: '#374151',
          lineHeight: '1.6'
        }}>
          Now that your article is completed, you can always try to re-run it again with minor adjustments or make further human edits to polish it off.
        </p>

        {/* Tip Section */}
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '16px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{
            margin: '0',
            fontSize: '16px',
            color: '#374151',
            lineHeight: '1.6'
          }}>
            <span style={{ fontWeight: 'bold' }}>TIP:</span> You can run multiple versions of an article simultaneously to review and compare minor adjustments.
          </p>
        </div>
      </div>
    </div>
  );
}