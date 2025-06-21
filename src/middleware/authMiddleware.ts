import { supabase } from '../config/supabaseClient';
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export async function getUserFromReq(req: Request) {
  let token: string | undefined =
    req.headers.authorization?.replace('Bearer ', '') ||
    req.cookies.supabase_token; // Some apps store in cookie
  if (!token) throw new Error('No auth token provided');

  // Validate/parse via Supabase (best practice)
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid session token');

  // Find local user record (for app-level data)
  const user = await prisma.user.findUnique({ where: { id: data.user.id } });
  if (!user) throw new Error('Unknown user');

  return user;
}