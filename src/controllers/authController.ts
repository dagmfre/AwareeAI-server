import { Request, Response } from "express";
import prisma from "../config/prismaClient";
import {
  hashPassword,
  comparePassword,
  generateJWT,
} from "../services/userService";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    const token = generateJWT(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    res.status(400).json({ error: "Registration failed: " + e.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = generateJWT(user.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    res.status(400).json({ error: "Login failed: " + e.message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    // Assume JWT middleware extracts userId into req.userId
    const userId = req.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        dateJoined: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: "Failed to retrieve profile" });
  }
};
