/**
 * Reset Password API Route
 * POST /api/auth/reset-password
 *
 * Updates the user's password after they have verified
 * their identity via the Supabase password reset flow.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Validation Schema
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Error message mapping
function translateError(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid token': 'Reset link has expired or is invalid, please request a new one',
    'Token expired': 'Reset link has expired, please request a new one',
    'Password should be at least 6 characters': 'Password must be at least 8 characters',
    'New password should be different from the old password':
      'New password must be different from the old password',
    'Same password': 'New password must be different from the old password',
  };
  return errorMap[message] || message;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.errors[0]?.message || 'Validation failed',
        },
        { status: 400 }
      );
    }

    const { password } = validationResult.data;

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Update the user's password
    // Note: Supabase requires a valid session from the password reset link
    // The session is automatically set when the user clicks the reset link
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error('Password reset failed:', error);
      return NextResponse.json(
        {
          success: false,
          error: translateError(error.message),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
      data: {
        user: data.user,
      },
    });
  } catch (error) {
    console.error('Reset password API error:', error);
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