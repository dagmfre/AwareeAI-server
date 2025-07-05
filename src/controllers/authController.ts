import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { logger } from '../utils/logger';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    const result = await authService.register({ email, password, displayName });
    res.status(201).json({ message: 'User registered', user: result.user, token: result.token });
  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json({ message: 'Login successful', user: result.user, token: result.token });
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Invalid credentials' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) await authService.logout(token);
    res.json({ message: 'Logout successful' });
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await authService.getUserById(userId);
    res.json({ user });
  } catch (error: any) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const updates = req.body;
    const updatedUser = await authService.updateUser(userId, updates);
    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (error: any) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(userId, currentPassword, newPassword);
    res.json({ message: 'Password changed' });
  } catch (error: any) {
    logger.error('Change password error:', error);
    res.status(400).json({ error: error.message || 'Failed to change password' });
  }
};