const express = require('express');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET is not set in the environment variables.');
}

const logAudit = async (action, metadata, actorId = null) => {
  try {
    await supabase.from('audit_log').insert({
      action,
      resource: 'auth',
      actor_id: actorId,
      metadata
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

// 1. POST /auth/phone-otp
router.post('/phone-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
      // Generic error to avoid revealing if phone exists
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    res.json({ message: 'OTP sent' });
  } catch (error) {
    res.status(500).json({ error: 'Invalid credentials' });
  }
});

// 2. POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { phone, token } = req.body;
  
  if (!phone || !token) {
    await logAudit('login_failed', { phone, reason: 'Missing phone or token' });
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  try {
    let userId;

    if (process.env.NODE_ENV === 'development' && token === '000000') {
      // DEV BYPASS ONLY — this MUST never execute in staging or production
      console.warn('[SECURITY] Dev OTP bypass used — only allowed in NODE_ENV=development');
      const { data: existing } = await supabase.from('users').select('id').eq('phone', phone).single();
      if (existing) {
        userId = existing.id;
      } else {
        const { randomUUID } = require('crypto');
        userId = randomUUID();
      }
    } else {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms'
      });

      if (error || !data.user) {
        await logAudit('login_failed', { phone, reason: 'Supabase verify failed' });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      userId = data.user.id;
    }

    // Look up custom user record bypassing RLS (we use SERVICE_ROLE_KEY)
    let { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, phone, full_name, role, is_active, created_at')
      .eq('id', userId)
      .single();

    if (userError || !userRecord) {
      // Auto-register player
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          phone: phone,
          role: 'player',
          full_name: 'Player',
          is_active: true
        })
        .select('id, phone, full_name, role, is_active, created_at')
        .single();
        
      if (insertError || !newUser) {
        await logAudit('login_failed', { phone, reason: 'Failed to create user record' }, userId);
        return res.status(500).json({ error: 'Failed to create user' });
      }
      userRecord = newUser;
      await logAudit('player_self_registered', { phone }, userId);
    } else if (!userRecord.is_active) {
      await logAudit('login_failed', { phone, reason: 'Account inactive' }, userId);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Sign Custom JWT
    const jwtToken = jwt.sign(
      { userId, role: userRecord.role, phone: userRecord.phone },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    await logAudit('login_success', { phone, method: 'otp' }, userId);

    // Never return the Supabase session token
    res.json({ token: jwtToken });
  } catch (error) {
    console.error('Verify OTP error:', error);
    await logAudit('login_failed', { phone, reason: 'Server error' });
    res.status(500).json({ error: 'Invalid credentials' });
  }
});

// 3. POST /auth/admin-login
router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    await logAudit('login_failed', { email, reason: 'Missing email or password' });
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      await logAudit('login_failed', { email, reason: 'Supabase signIn failed' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userId = data.user.id;

    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, phone, full_name, role, is_active, created_at')
      .eq('id', userId)
      .single();

    if (userError || !userRecord) {
      await logAudit('login_failed', { email, reason: 'User record not found' }, userId);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (userRecord.role !== 'admin' && userRecord.role !== 'super_admin') {
      await logAudit('login_failed', { email, reason: 'Not an admin' }, userId);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!userRecord.is_active) {
      await logAudit('login_failed', { email, reason: 'Account inactive' }, userId);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Sign Custom JWT
    const jwtToken = jwt.sign(
      { userId, role: userRecord.role, phone: userRecord.phone },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    await logAudit('login_success', { email, method: 'password' }, userId);

    res.json({ token: jwtToken });
  } catch (error) {
    console.error('Admin login error:', error);
    await logAudit('login_failed', { email, reason: 'Server error' });
    res.status(500).json({ error: 'Invalid credentials' });
  }
});

// 4. GET /auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: userRecord, error } = await supabase
      .from('users')
      .select('id, phone, full_name, role, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error || !userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only return safe fields
    res.json(userRecord);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. PUT /auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name } = req.body;
    const userId = req.user.userId;

    if (!full_name) {
      return res.status(400).json({ error: 'full_name is required' });
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ full_name })
      .eq('id', userId)
      .select('id, phone, full_name, role, created_at')
      .single();

    if (error || !updatedUser) {
      return res.status(400).json({ error: 'Failed to update profile' });
    }

    await logAudit('profile_updated', { full_name }, userId);
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
