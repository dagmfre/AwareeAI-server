import { Request, Response } from "express";
import { supabase } from "../config/supabaseClient";
import axios from "axios";
import prisma from "../config/prismaClient";
import { asyncHandler } from "../utils/asyncHandler";
import {
  ValidationError,
  AuthenticationError,
  DatabaseError,
  ConflictError,
} from "../utils/errors";

/**
 * Register a new user using Supabase Auth and sync user to R2R
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ValidationError("Email and password are required");
  }

  if (password.length < 6) {
    throw new ValidationError("Password must be at least 6 characters long");
  }

  // Declare signUpData and signUpError so they are accessible in catch
  let signUpData: any = undefined;
  let signUpError: any = undefined;

  try {
    // Sign up user with Supabase
    const result = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { displayName },
    });
    signUpData = result.data;
    signUpError = result.error;

    if (signUpError) {
      throw new AuthenticationError(signUpError.message);
    }

    const supabaseId = signUpData.user?.id;
    if (!supabaseId) {
      throw new AuthenticationError("Failed to create user");
    }

    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError("User already exists in our database");
    }

    // Save to Prisma user table
    const user = await prisma.user.create({
      data: {
        id: supabaseId,
        email,
        displayName: displayName || email.split("@")[0],
        password,
      },
    });

    // Sync user with R2R for embedding scoping and auth
    try {
      await axios.post(
        `${process.env.R2R_URL}/v3/users/sync`,
        { email, user_id: supabaseId },
        {
          headers: {
            "x-r2r-api-key": process.env.R2R_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
    } catch (r2rError: any) {
      console.error("R2R sync failed:", r2rError);
      // Don't fail registration if R2R sync fails, just log it
    }

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user_id: supabaseId,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error: any) {
    // If user creation in Supabase succeeded but our DB failed, clean up
    if (signUpData?.user?.id && error instanceof DatabaseError) {
      try {
        await supabase.auth.admin.deleteUser(signUpData.user.id);
      } catch (cleanupError) {
        console.error("Failed to cleanup Supabase user:", cleanupError);
      }
    }
    throw error;
  }
});

/**
 * Login (Supabase handles, you issue a session JWT)
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError("Email and password are required");
  }

  const { data: loginData, error: loginError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (loginError) {
    throw new AuthenticationError(loginError.message);
  }

  if (!loginData.session || !loginData.user) {
    throw new AuthenticationError("Login failed - no session created");
  }

  // Find user in our database
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, displayName: true },
  });

  if (!user) {
    throw new AuthenticationError("User not found in our database");
  }

  // Store session in database
  try {
    await prisma.session.create({
      data: {
        userId: user.id,
        token: loginData.session.access_token,
        expiresAt: new Date(loginData.session.expires_at! * 1000),
      },
    });
  } catch (sessionError: any) {
    // Log session creation failure but don't fail login
    console.error("Failed to store session:", sessionError);
  }

  res.json({
    success: true,
    data: {
      access_token: loginData.session.access_token,
      user_id: user.id,
      expires_in: loginData.session.expires_in,
      refresh_token: loginData.session.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
    },
  });
});

/**
 * Get current user (from Supabase access token)
 */
export const me = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new AuthenticationError("Missing authorization token");
  }

  // Validate session with Supabase
  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    throw new AuthenticationError(error.message);
  }

  if (!data.user) {
    throw new AuthenticationError("Invalid token - no user found");
  }

  // Get user details from our database
  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { id: true, email: true, displayName: true },
  });

  if (!user) {
    throw new AuthenticationError("User not found in our database");
  }

  res.json({
    success: true,
    data: { user },
  });
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    throw new AuthenticationError("Missing authorization token");
  }

  // Remove session from database
  try {
    await prisma.session.deleteMany({
      where: { token },
    });
  } catch (error) {
    console.error("Failed to remove session from database:", error);
  }

  // Invalidate token with Supabase
  const { error } = await supabase.auth.admin.signOut(token);

  if (error) {
    console.error("Supabase logout error:", error);
    // Don't throw error here as session is already removed from our DB
  }

  res.json({
    success: true,
    message: "Logged out successfully",
  });
});
