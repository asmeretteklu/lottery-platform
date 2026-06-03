const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const logAudit = async (action, metadata, actorId = null) => {
  try {
    await supabase.from('audit_log').insert({
      action,
      resource: 'lotteries',
      actor_id: actorId,
      metadata
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

// All routes require authentication
router.use(authMiddleware);

// POST /lotteries — create lottery
router.post('/', roleGuard(['admin', 'super_admin']), async (req, res) => {
  const { title, ticket_price, max_tickets, draw_at } = req.body;
  const admin_id = req.user.userId;

  if (!title || !ticket_price || !max_tickets || !draw_at) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Generate secure secrets
  const secret_seed = crypto.randomBytes(32).toString('hex');
  const seed_hash = crypto.createHash('sha256').update(secret_seed).digest('hex');

  try {
    // 1. Insert Lottery
    const { data: lottery, error: lotError } = await supabase
      .from('lotteries')
      .insert({
        admin_id,
        title,
        ticket_price,
        max_tickets,
        draw_at,
        seed_hash
      })
      .select()
      .single();

    if (lotError) throw lotError;

    // 2. Insert into draws table to store the secret_seed for the commit-reveal
    const { error: drawError } = await supabase
      .from('draws')
      .insert({
        lottery_id: lottery.id,
        secret_seed,
        seed_hash,
        winner_ticket_id: null,
        drawn_at: null, // explicit null as per requirements
        verified: false
      });

    if (drawError) {
      console.error('Draw creation error:', drawError);
      await supabase.from('lotteries').delete().eq('id', lottery.id);
      return res.status(500).json({ error: 'Internal server error' });
    }

    await logAudit('create_lottery', { lottery_id: lottery.id, title }, admin_id);

    // Explicitly returning lottery data (which never contains secret_seed)
    res.status(201).json(lottery);
  } catch (err) {
    console.error('Create lottery error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /lotteries — admin sees only their own lotteries. super_admin sees all.
router.get('/', roleGuard(['admin', 'super_admin']), async (req, res) => {
  try {
    let query = supabase.from('lotteries').select('*');

    if (req.user.role === 'admin') {
      query = query.eq('admin_id', req.user.userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Get lotteries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /lotteries/:id — returns lottery with prize and tickets_sold count.
router.get('/:id', roleGuard(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    let query = supabase
      .from('lotteries')
      .select('*, prizes(*)')
      .eq('id', id);

    if (req.user.role === 'admin') {
      query = query.eq('admin_id', req.user.userId);
    }

    const { data, error } = await query.single();
    
    if (error) {
      return res.status(404).json({ error: 'Lottery not found' });
    }

    if (data.prizes && data.prizes.length > 0) {
      data.prizes.sort((a, b) => (a.prize_rank || 1) - (b.prize_rank || 1));
    }

    res.json(data);
  } catch (err) {
    console.error('Get lottery by id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /lotteries/:id — admin can update title, draw_at only.
router.put('/:id', roleGuard(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, draw_at } = req.body;
    
    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('lotteries')
      .select('admin_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'admin' && existing.admin_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabase
      .from('lotteries')
      .update({ title, draw_at })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAudit('update_lottery', { lottery_id: id, updates: { title, draw_at } }, req.user.userId);

    res.json(data);
  } catch (err) {
    console.error('Update lottery error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /lotteries/:id/status — admin can set status to active or cancelled only
router.put('/:id/status', roleGuard(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status update. Can only be active or cancelled.' });
    }

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('lotteries')
      .select('admin_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'admin' && existing.admin_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // If setting to active, verify a prize exists
    if (status === 'active') {
      const { data: prize } = await supabase
        .from('prizes')
        .select('id')
        .eq('lottery_id', id)
        .maybeSingle();
      
      if (!prize) {
        return res.status(400).json({ error: 'Cannot activate lottery without a prize.' });
      }
    }

    const { data, error } = await supabase
      .from('lotteries')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAudit('update_lottery_status', { lottery_id: id, status }, req.user.userId);

    res.json(data);
  } catch (err) {
    console.error('Update lottery status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /lotteries/:id/prize
router.post('/:id/prize', roleGuard(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, value_etb, photo_url, prize_rank = 1 } = req.body;

    // Check ownership
    const { data: existingLottery, error: checkError } = await supabase
      .from('lotteries')
      .select('admin_id')
      .eq('id', id)
      .single();

    if (checkError || !existingLottery) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'admin' && existingLottery.admin_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabase
      .from('prizes')
      .insert({
        lottery_id: id,
        title,
        description,
        value_etb,
        photo_url,
        prize_rank
      })
      .select()
      .single();

    if (error) throw error;

    await logAudit('create_prize', { lottery_id: id, prize_id: data.id }, req.user.userId);

    res.status(201).json(data);
  } catch (err) {
    console.error('Create prize error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /lotteries/:id/tickets
router.get('/:id/tickets', roleGuard(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('lotteries')
      .select('admin_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'admin' && existing.admin_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabase
      .from('tickets')
      .select('*, users!inner(phone)')
      .eq('lottery_id', id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Get tickets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /lotteries/:id/prize/claim
router.put('/:id/prize/claim', roleGuard(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { prize_id } = req.body;

    if (!prize_id) {
      return res.status(400).json({ error: 'prize_id is required' });
    }

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('lotteries')
      .select('admin_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'admin' && existing.admin_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabase
      .from('prizes')
      .update({ claimed: true, claimed_at: new Date().toISOString() })
      .eq('lottery_id', id)
      .eq('id', prize_id)
      .select()
      .single();

    if (error) throw error;

    await logAudit('claim_prize', { lottery_id: id, prize_id: data.id }, req.user.userId);

    res.json(data);
  } catch (err) {
    console.error('Claim prize error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /lotteries/:id/prize/upload-photo
router.post('/:id/prize/upload-photo', roleGuard(['admin', 'super_admin']), upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No photo provided' });
    }

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('lotteries')
      .select('admin_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'admin' && existing.admin_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const fileExt = path.extname(req.file.originalname);
    const fileName = `${id}-${Date.now()}${fileExt}`;

    const { data, error } = await supabase.storage
      .from('prize-photos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('prize-photos')
      .getPublicUrl(fileName);

    res.json({ photo_url: publicUrlData.publicUrl });
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /lotteries/:id
router.delete('/:id', roleGuard(['admin', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch lottery with prizes for ownership check and photo cleanup
    const { data: lottery, error: fetchError } = await supabase
      .from('lotteries')
      .select('*, prizes(photo_url)')
      .eq('id', id)
      .single();

    if (fetchError || !lottery) return res.status(404).json({ error: 'Lottery not found' });

    // Ownership check
    if (req.user.role === 'admin' && lottery.admin_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Status check
    if (['active', 'completed'].includes(lottery.status)) {
      return res.status(400).json({ error: 'Cannot delete an active or completed lottery.' });
    }

    // Tickets sold check
    if ((lottery.tickets_sold || 0) > 0) {
      return res.status(400).json({ error: 'Cannot delete a lottery that has sold tickets. Cancel it instead.' });
    }

    // Delete prize photos from storage
    const photoUrls = (lottery.prizes || [])
      .map(p => p.photo_url)
      .filter(Boolean);

    for (const photoUrl of photoUrls) {
      try {
        const urlParts = photoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        await supabase.storage.from('prize-photos').remove([fileName]);
      } catch (storageErr) {
        console.warn('Failed to delete prize photo from storage:', storageErr);
      }
    }

    // Delete lottery (cascades to draws and prizes)
    const { error: deleteError } = await supabase
      .from('lotteries')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await logAudit('delete_lottery', { lottery_id: id, title: lottery.title }, req.user.userId);

    res.json({ message: 'Lottery deleted successfully' });
  } catch (err) {
    console.error('Delete lottery error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

