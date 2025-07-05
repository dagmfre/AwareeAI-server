import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";

export const register = async ({ email, password, displayName }: any) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error("User already exists");
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword, displayName },
  });
  const token = generateToken(user.id);
  return { user, token };
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");
  if (user.password == null) throw new Error("No password set for this user");
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) throw new Error("Invalid credentials");
  const token = generateToken(user.id);
  return { user, token };
};

export const logout = async (_token: string) => {
  // Implement token blacklist if needed
};

export const getUserById = async (id: string) =>
  prisma.user.findUnique({ where: { id } });

export const updateUser = async (id: string, updates: any) =>
  prisma.user.update({ where: { id }, data: updates });

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.password == null) throw new Error("No password set for this user");
  const isValidPassword = await bcrypt.compare(currentPassword, user.password);
  if (!isValidPassword) throw new Error("Current password is incorrect");
  const hashedNewPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword },
  });
};

const generateToken = (userId: string) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "7d",
  });
