import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Server-side Supabase connectivity test.
 * Queries the Supabase REST health endpoint to verify that the
 * URL and publishable key are correctly configured.
 *
 * GET /api/health/supabase
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasPublishableKey = !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const hasSecretKey = !!process.env.SUPABASE_SECRET_KEY;

  if (!url || !hasPublishableKey) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Missing required environment variables.',
        details: {
          hasSupabaseUrl: !!url,
          hasPublishableKey: hasPublishableKey,
          hasSecretKey: hasSecretKey,
        },
      },
      { status: 500 }
    );
  }

  try {
    const supabase = createSupabaseServerClient();

    // Query the auth health endpoint — lightweight, no table access needed.
    const { error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Supabase client initialized but returned an error.',
          details: error.message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase connection is healthy.',
      details: {
        url: url,
        envVarsConfigured: {
          NEXT_PUBLIC_SUPABASE_URL: true,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: true,
          SUPABASE_SECRET_KEY: hasSecretKey,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to connect to Supabase.',
        details: message,
      },
      { status: 502 }
    );
  }
}
