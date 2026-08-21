import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import pool from '../db';

const router = express.Router();

// Setup Nodemailer (Using Ethereal for Dev/Testing by default)
let transporter: nodemailer.Transporter;
nodemailer.createTestAccount().then((account) => {
  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });
}).catch(console.error);

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  if (role !== 'organizer' && role !== 'attendee') {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, is_verified, verification_token) VALUES ($1, $2, $3, $4, TRUE, $5) RETURNING id, name, email, role',
      [name, email, passwordHash, role, verificationToken]
    );
    
    const user = result.rows[0];

    // Send verification email
    if (transporter) {
      const verifyUrl = `${process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5173'}/verify/${verificationToken}`;
      const mailOptions = {
        from: '"Event Checker" <noreply@eventchecker.local>',
        to: email,
        subject: 'Please verify your email address',
        text: `Hello ${name},\n\nPlease verify your email by clicking the following link: ${verifyUrl}`,
        html: `<p>Hello ${name},</p><p>Please verify your email by clicking the following link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
      };

      transporter.sendMail(mailOptions).then((info) => {
        console.log('Preview URL for Verification Email: %s', nodemailer.getTestMessageUrl(info));
      }).catch(console.error);
    }

    res.status(201).json({ message: 'User registered successfully! You can now log in.' });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.is_verified) {
      res.status(403).json({ error: 'Please verify your email address before logging in' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Missing token' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id',
      [token]
    );

    if (result.rows.length === 0) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
