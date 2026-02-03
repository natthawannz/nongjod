const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LineStrategy = require('passport-line').Strategy;
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories'); // เปลี่ยนจาก Categories
const budgetRoutes = require('./routes/budget'); // แก้ไขการพิมพ์ผิด
const notificationsRouter = require('./routes/notifications');
const ocrRoutes = require('./routes/ocr'); // OCR routes
dotenv.config();
const app = express();
// LINE Login configuration
passport.use(new LineStrategy({
  channelID: '2008748910',
  channelSecret: '36ca849ef6db52fdf5126b41a03c6ef4',
  callbackURL: 'http://localhost:5050/callback',
  scope: ['profile', 'openid', 'email']
}, async (accessToken, refreshToken, params, profile, done) => {
  try {
    // LINE profile: profile.id, profile.displayName, profile.emails
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.id}@line.local`;
    let user = await User.findOne({ email });
    const profilePic = profile._json && profile._json.pictureUrl ? profile._json.pictureUrl : '';
    if (!user) {
      user = new User({
        email,
        password: '', // No password for LINE login
        name: profile.displayName || '',
        profilePic,
        role: 'user'
      });
      await user.save();
    } else {
      // Update name or profilePic if changed
      let updated = false;
      if (profile.displayName && user.name !== profile.displayName) {
        user.name = profile.displayName;
        updated = true;
      }
      if (profilePic && user.profilePic !== profilePic) {
        user.profilePic = profilePic;
        updated = true;
      }
      if (updated) await user.save();
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});
// Middleware - Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Session and Passport middleware
app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

// LINE Login routes
app.get('/auth/line', passport.authenticate('line'));
app.get('/callback', passport.authenticate('line', {
  failureRedirect: '/login',
  session: true
}), (req, res) => {
  // Successful authentication
  // Generate JWT token for the user
  const user = req.user;
  const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET);
  // Redirect to frontend with token and profilePic as query params
  const profilePic = encodeURIComponent(user.profilePic || '');
  res.redirect(`http://localhost:3000/dashboard?token=${token}&profilePic=${profilePic}`);
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes); // เปลี่ยนจาก Categories
app.use('/api/budgets', budgetRoutes); // แก้ไขการพิมพ์ผิด
app.use('/api', notificationsRouter); // ใช้ /api/notifications
app.use('/api/ocr', ocrRoutes); // OCR routes
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));