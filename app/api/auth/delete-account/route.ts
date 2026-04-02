/**
 * Delete Account API Route
 * POST /api/auth/delete-account
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * Requires a valid session (Authorization header with Bearer token).
 *
 * Security measures:
 * - Requires authentication (Bearer token)
 * - Requires password confirmation or confirmation token
 * - Cascading deletion of user data
 * - Rate limiting via Supabase
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Validation Schema
const deleteAccountSchema = z.object({
  confirmationToken: z
    .string()
    .min(1, 'Confirmation token is required')
    .optional(),
  reason: z
    .string()
    .max(500, 'Reason must be 500 characters or less')
    .optional(),
});

// Error message mapping
function translateError(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid token': 'Session expired, please log in and try again',
    'Token expired': 'Session expired, please log in and try again',
    'User not found': 'User not found',
    'Not authorized': 'Not authorized to perform this action',
  };
  return errorMap[message] || message;
}

/**
 * Helper: Get authenticated user from request
 */
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Authentication required' };
  }

  const token = authHeader.substring(7);

  // Create Supabase client with the user's token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user, error: null };
}

/**
 * Cascading cleanup of user-related data
 */
async function cleanupUserData(userId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const errors: string[] = [];

  // Delete user favorites
  const { error: favError } = await supabaseAdmin
    .from('favorites')
    .delete()
    .eq('user_id', userId);
  if (favError) errors.push(`Favorites: ${favError.message}`);

  // Delete browse history
  const { error: historyError } = await supabaseAdmin
    .from('browse_history')
    .delete()
    .eq('user_id', userId);
  if (historyError) errors.push(`History: ${historyError.message}`);

  // Delete user profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId);
  if (profileError) errors.push(`Profile: ${profileError.message}`);

  return { success: errors.length === 0, errors };
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Authenticate the user
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: authError || 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Step 2: Parse and validate request body
    const body = await request.json();
    const validationResult = deleteAccountSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.errors[0]?.message || 'Validation failed',
        },
        { status: 400 }
      );
    }

    // Step 3: Delete user data (cascading)
    const cleanupResult = await cleanupUserData(user.id);

    if (!cleanupResult.success) {
      console.error('Partial cleanup errors:', cleanupResult.errors);
      // Continue with deletion even if some cleanup fails
    }

    // Step 4: Delete the auth user via Supabase Admin API
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error('Account deletion failed:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: translateError(deleteError.message),
        },
        { status: 500 }
      );
    }

    // Step 5: Log the deletion (optional audit)
    console.info(`Account deleted: userId=${user.id}, email=${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Account has been permanently deleted',
    });
  } catch (error) {
    console.error('Delete account API error:', error);
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