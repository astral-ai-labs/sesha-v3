import { NextRequest, NextResponse } from 'next/server';

/* ==========================================================================*/
// email-export/route.ts — Alternative email export endpoint
/* ==========================================================================*/
// Purpose: Alternative endpoint for email export functionality
// Note: Currently redirects to /api/send for simplicity

/* ==========================================================================*/
// Route Handler
/* ==========================================================================*/

export async function POST(request: NextRequest) {
  try {
    // Simply forward the request to the existing /api/send endpoint
    const body = await request.json();
    
    // Create a new request to the send endpoint
    const sendRequest = new Request(`${request.nextUrl.origin}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Forward the request to the send endpoint
    const response = await fetch(sendRequest);
    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(result, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in email export route:', error);
    return NextResponse.json(
      { error: 'Failed to process email export request' }, 
      { status: 500 }
    );
  }
}
