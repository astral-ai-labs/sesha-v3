import { ArticleEmailExport } from '@/components/email/article-email-export';
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

// ==========================================================================
// Configuration
// ==========================================================================

const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================================================================
// Request Types
// ==========================================================================

interface SendEmailRequest {
  to: string[];
  subject: string;
  href: string;
  name: string;
  slug: string;
  version: number;
  versionDecimal: string;
  content?: string;
  articleHtml?: string;
  blobs?: string;
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json();

    // Validate required fields
    if (!body.to || !body.subject || !body.href) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and href are required' }, 
        { status: 400 }
      );
    }

    // Validate email array
    if (!Array.isArray(body.to) || body.to.length === 0) {
      return NextResponse.json(
        { error: 'to field must be a non-empty array of email addresses' }, 
        { status: 400 }
      );
    }

    console.log("Sending email to: ", body.to);
    console.log("Subject: ", body.subject);
    console.log("Href: ", body.href);
    console.log("Name: ", body.name);
    console.log("Slug: ", body.slug);
    console.log("Version: ", body.version);
    console.log("Version Decimal: ", body.versionDecimal);
    console.log("Content: ", body.content);
    console.log("Article HTML length: ", body.articleHtml?.length);
    console.log("Blobs: ", body.blobs);

    const { data, error } = await resend.emails.send({
      from: 'updates@updates.sesha-systems.com',
      to: body.to,
      subject: body.subject,
      react: ArticleEmailExport({ 
        recipientName: 'User', // We don't have recipient name from the form
        senderName: body.name,
        articleHeadline: body.subject,
        articleSlug: body.slug,
        versionDecimal: body.versionDecimal,
        content: body.content,
        articleHtml: body.articleHtml,
        blobs: body.blobs
      }),
    });

    if (error) {
      console.log("Error sending email: ", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.log("Error in send email route: ", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}