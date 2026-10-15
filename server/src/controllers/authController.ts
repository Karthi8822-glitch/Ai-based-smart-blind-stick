import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { isDbConnected } from '../config/db';
import { getSupabaseClient, isSupabaseConnected } from '../config/supabase';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, role = 'caregiver', assignedDeviceId = 'SBS-001' } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
        return;
      }

      // 1. Supabase Postgres Primary
      const supabase = getSupabaseClient();
      if (supabase && isSupabaseConnected()) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (existingUser) {
          res.status(409).json({ success: false, message: 'User with this email already exists.' });
          return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const { data: user, error } = await supabase
          .from('users')
          .insert({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role,
            assigned_device_id: assignedDeviceId,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'novos_ai_smart_blind_stick_secure_key_2026_jwt_token',
          { expiresIn: '7d' }
        );

        res.status(201).json({
          success: true,
          message: 'User registered successfully in Supabase DB.',
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            assignedDeviceId: user.assigned_device_id,
          },
        });
        return;
      }

      // 2. MongoDB Fallback
      if (isDbConnected()) {
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
          res.status(409).json({ success: false, message: 'User with this email already exists.' });
          return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role,
          assignedDeviceId,
        });

        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'novos_ai_smart_blind_stick_secure_key_2026_jwt_token',
          { expiresIn: '7d' }
        );

        res.status(201).json({
          success: true,
          message: 'User registered successfully.',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            assignedDeviceId: user.assignedDeviceId,
          },
        });
        return;
      }

      // 3. In-memory demo fallback
      const token = jwt.sign(
        { id: 'mem-user-1', email: email.toLowerCase(), role },
        process.env.JWT_SECRET || 'novos_ai_smart_blind_stick_secure_key_2026_jwt_token',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully (Demo Mode).',
        token,
        user: { id: 'mem-user-1', name, email, role, assignedDeviceId },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required.' });
        return;
      }

      // 1. Supabase Postgres Primary
      const supabase = getSupabaseClient();
      if (supabase && isSupabaseConnected()) {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (!user) {
          res.status(401).json({ success: false, message: 'Invalid email or credentials.' });
          return;
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          res.status(401).json({ success: false, message: 'Invalid email or credentials.' });
          return;
        }

        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'novos_ai_smart_blind_stick_secure_key_2026_jwt_token',
          { expiresIn: '7d' }
        );

        res.status(200).json({
          success: true,
          message: 'Authentication successful via Supabase DB.',
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            assignedDeviceId: user.assigned_device_id,
          },
        });
        return;
      }

      // 2. MongoDB Fallback
      if (isDbConnected()) {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
          res.status(401).json({ success: false, message: 'Invalid email or credentials.' });
          return;
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          res.status(401).json({ success: false, message: 'Invalid email or credentials.' });
          return;
        }

        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'novos_ai_smart_blind_stick_secure_key_2026_jwt_token',
          { expiresIn: '7d' }
        );

        res.status(200).json({
          success: true,
          message: 'Authentication successful.',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            assignedDeviceId: user.assignedDeviceId,
          },
        });
        return;
      }

      // 3. In-memory demo fallback
      const token = jwt.sign(
        { id: 'mem-user-1', email, role: 'caregiver' },
        process.env.JWT_SECRET || 'novos_ai_smart_blind_stick_secure_key_2026_jwt_token',
        { expiresIn: '7d' }
      );

      res.status(200).json({
        success: true,
        message: 'Authentication successful (Demo Mode).',
        token,
        user: { id: 'mem-user-1', name: 'Demo Caregiver', email, role: 'caregiver', assignedDeviceId: 'SBS-001' },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
};
