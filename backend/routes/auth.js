const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const LineMessagingLinkSession = require('../models/LineMessagingLinkSession');
const { mergeUsers } = require('../utils/mergeUsers');


// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.exp) return res.status(401).json({ message: 'Token expired' });
    req.user = decoded;
    next();
  } catch (error) {
    if (error && error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired' });
    res.status(401).json({ message: 'Invalid token' });
  }
};


// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'Natthawan1502@gmail.com',
    pass: 'ycgfwhrgroawxnvt', // 
  },
});


// Register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name: name || '' });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.status(201).json({ token, user: { email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email }); // เพิ่มเพื่อดีบัก
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email); // เพิ่มเพื่อดีบัก
      return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for:', email); // เพิ่มเพื่อดีบัก
      return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({ token, user: { email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

	// Get user profile
	router.get('/me', authMiddleware, async (req, res) => {
	  console.log('Fetching user for ID:', req.user.userId);
	  try {
	    const user = await User.findById(req.user.userId).select('-password');
	    if (!user) {
	      console.log('User not found for ID:', req.user.userId);
	      return res.status(401).json({ message: 'Invalid token' });
	    }
	    res.json({
	      id: user._id,
	      name: user.name,
	      email: user.email,
	      profilePic: user.profilePic || '',
	      lineUserId: user.lineUserId || '',
	      lineMessagingUserId: user.lineMessagingUserId || ''
	    });
	  } catch (error) {
	    console.error('Profile fetch error:', error);
	    res.status(500).json({ message: 'Server error' });
	  }
	});

	// Link LINE Messaging API account (web login account) via short-lived code from bot chat
	router.post('/link-line-messaging', authMiddleware, async (req, res) => {
	  try {
	    const rawCode = String(req.body?.code || '').trim();
	    if (!rawCode) return res.status(400).json({ message: 'Missing code' });

	    const secret = process.env.SESSION_TOKEN_SECRET || process.env.JWT_SECRET || process.env.LINE_CHANNEL_SECRET || 'dev-session-secret';
	    const codeHash = crypto.createHmac('sha256', String(secret)).update(rawCode).digest('hex');

	    const session = await LineMessagingLinkSession.findOne({ codeHash });
	    if (!session) return res.status(404).json({ message: 'Code not found' });
	    if (session.usedAt) return res.status(410).json({ message: 'Code already used' });
	    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) return res.status(410).json({ message: 'Code expired' });

	    const lineMessagingUserId = String(session.lineMessagingUserId || '').trim();
	    if (!lineMessagingUserId) return res.status(500).json({ message: 'Invalid session payload' });

	    const currentUser = await User.findById(req.user.userId);
	    if (!currentUser) return res.status(404).json({ message: 'User not found' });

	    // If another (bot-only) user already owns this messaging id, migrate their data
	    // so the web account and bot account become a single backend user.
	    const other = await User.findOne({ lineMessagingUserId });
	    if (other && String(other._id) !== String(currentUser._id)) {
	      const otherEmail = String(other.email || '');
	      const safeToDelete =
	        !other.password &&
	        (otherEmail.endsWith('@local') || /^line_/i.test(otherEmail) || /^line_msg_/i.test(otherEmail));
	      await mergeUsers({ fromUserId: other._id, toUserId: currentUser._id, deleteSource: safeToDelete });
	    }

	    currentUser.lineMessagingUserId = lineMessagingUserId;
	    await currentUser.save();

	    session.usedAt = new Date();
	    await session.save();

	    return res.json({ ok: true, lineMessagingUserId });
	  } catch (err) {
	    console.error('link-line-messaging error', err);
	    return res.status(500).json({ message: 'Server error: ' + (err?.message || 'Unknown error') });
	  }
	});

// Update user profile
router.put('/me', authMiddleware, async (req, res) => {
  const { name } = req.body; // รับเฉพาะ name เท่านั้น
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = name;

    await user.save();
    res.json({ name: user.name, email: user.email, profilePic: user.profilePic || '' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not found' });

    const token = crypto.randomBytes(20).toString('hex');
    const resetPasswordExpires = Date.now() + 3600000; // 1 ชั่วโมง

    user.resetPasswordToken = token;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

const resetUrl = `http://localhost:3000/reset-password?token=${token}`;

const mailOptions = {
  from: 'Natthawan1502@gmail.com',
  to: email,
  subject: 'รีเซ็ตรหัสผ่านของคุณ | Balanz.ia 💙',
  html: `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #D9F7F8; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
      
      <!-- Header -->
      <div style="background-color: #6BE2E4; padding: 30px; text-align: center;">
        <img src="cid:savei_logo" alt="SAVEi Logo" width="100" style="margin-bottom: 10px;" />
        <h2 style="color: #004E53; margin: 0;">ยินดีต้อนรับสู่ <b>Balanz.ia</b></h2>
        <p style="color: #004E53; margin: 5px 0 0;">จัดการการเงินของคุณได้อย่างง่ายดายและมีประสิทธิภาพ</p>
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #333;">
        <p>คุณได้ทำการร้องขอเพื่อรีเซ็ตรหัสผ่านของบัญชี <b>Balanz.ia</b> ของคุณ</p>
        <p>กรุณาคลิกลิงก์ด้านล่างเพื่อเปลี่ยนรหัสผ่านใหม่ของคุณ 👇</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
            style="background: linear-gradient(90deg, #6BE2E4 0%, #25BCC1 100%); color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            🔐 รีเซ็ตรหัสผ่านของฉัน
          </a>
        </div>
        <p>ลิงก์นี้จะหมดอายุภายใน <b>1 ชั่วโมง</b> เพื่อความปลอดภัยของบัญชีคุณ</p>
        <p>หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่าน โปรดละเว้นอีเมลฉบับนี้</p>
        <br>
        <p style="color: #555;">ขอแสดงความนับถือ,<br><b>ทีมงาน Balanz.ia </b></p>
      </div>

      <!-- Footer -->
      <div style="background-color: #E6FBFC; text-align: center; padding: 10px; font-size: 12px; color: #888;">
        <p>© 2025 SAVEi — Smart Finance Platform</p>
      </div>
    </div>
  </div>
  `,
  attachments: [
    {
      filename: 'Balanz.png',
      path: path.join(__dirname, '../../public/Balanz.png'), // <-- ใช้ path จริงของไฟล์
      cid: 'savei_logo', // ต้องตรงกับ src="cid:savei_logo" ใน HTML
    },
  ],
};
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Reset password link sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
module.exports = router;
