import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const prisma = new PrismaClient();

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

export const register = async (req: Request, res: Response) => {
  console.log('Register controller started');
  try {
    const { name, email, password }: RegisterRequest = req.body;
    console.log('Request data:', { name, email, password: password ? '[REDACTED]' : 'undefined' });

    // Check if user already exists
    console.log('Checking if user exists:', email);
    const existingUser = await prisma.user.findUnique({ where: { email } });
    console.log('User lookup result:', existingUser ? 'User exists' : 'User not found');
    
    if (existingUser) {
      console.log('User already exists, returning 400');
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    console.log('Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Password hashed');

    // Create user
    console.log('Creating user...');
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
    console.log('User created:', { id: user.id, email: user.email });

    // Generate JWT token
    console.log('Generating JWT token...');
    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('Token generated');

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    console.log('Sending success response');
    res.status(201).json({
      status: 'success',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error: any) {
    console.error('Error in register controller:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong during registration',
      ...(process.env.NODE_ENV === 'development' && { error: error?.message || 'Unknown error' })
    });
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  console.log('Login controller started');
  try {
    const { email, password }: LoginRequest = req.body;
    console.log('Login attempt for email:', email);

    // 1. Check if user exists
    console.log('1. Checking if user exists...');
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        createdAt: true,
        updatedAt: true
      }
    });
    console.log('User lookup result:', user ? 'User found' : 'User not found');

    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid credentials' 
      });
    }

    // 2. Check password
    console.log('2. Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Login failed: Invalid password');
      return res.status(401).json({ 
        status: 'error',
        message: 'Invalid credentials' 
      });
    }

    // 3. Generate JWT
    console.log('3. Generating JWT token...');
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email 
      },
      config.JWT_SECRET,
      { 
        expiresIn: '7d' 
      }
    );

    // 4. Prepare and send response
    console.log('4. Login successful, sending token');
    
    res.status(200).json({
      status: 'success',
      data: {
        token: token
      }
    });
  } catch (error) {
    console.error('Error in login controller:', error);
    next(error);
  }
};
