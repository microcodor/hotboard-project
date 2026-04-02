/**
 * Forgot Password API Route
 * POST /api/auth/forgot-password
 *
 * Sends a password reset email to the user via Supabase Auth.
 * Follows the same patterns as the existing login/register routes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Validation Schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Error message mapping (consistent with existing auth routes)
function translateError(message: string): string {
  const errorMap: Record<string, string> = {
    'User not found': 'No account found with this email address',
    'Email not confirmed': 'Email not verified, please verify first',
    'Rate limit exceeded': 'Too many requests, please try again later',
    'For security purposes, you can only request this once every 60 seconds':
      'For security, you can only request this once every 60 seconds',
  };
  return errorMap[message] || message;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.errors[0]?.message || 'Validation failed',
        },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });

    if (error) {
      console.error('Password reset email failed:', error);
      return NextResponse.json(
        {
          success: false,
          error: translateError(error.message),
        },
        { status: 400 }
      );
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Server error, please try again later',
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler (CORS)
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}