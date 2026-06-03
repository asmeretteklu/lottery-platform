const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware, roleGuard } = require('../middleware/auth');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const logAudit = async (action, metadata, actorId = null) => {
  try {
    await supabase.from('audit_log').insert({
      action,
      resource: 'tickets',
      actor_id: actorId,
      metadata
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

router.use(authMiddleware);

// POST /tickets/purchase
router.post('/purchase', roleGuard(['player']), async (req, res) => {
  try {
    const { lottery_id } = req.body;
    const player_id = req.user.userId;

    if (!lottery_id) {
      return res.status(400).json({ error: 'lottery_id is required' });
    }

    // RPC automatically handles transaction, locks row, checks 3-ticket max, and status
    const { data, error } = await supabase.rpc('purchase_ticket', {
      p_lottery_id: lottery_id,
      p_player_id: player_id
    });

    if (error) {
      console.error('RPC Error:', error);
      const msg = error.message || error.details || 'Internal server error';
      await logAudit('purchase_ticket_failed', { lottery_id, reason: msg }, player_id);
      
      // Map postgres exceptions back to friendly HTTP 400s safely
      if (msg.includes('sold out')) return res.status(400).json({ error: 'This lottery is sold out' });
      if (msg.includes('not accepting tickets')) return res.status(400).json({ error: 'This lottery is not accepting tickets' });
      if (msg.includes('limit exceeded')) return res.status(400).json({ error: 'Ticket limit exceeded: Maximum 3 tickets per lottery' });
      if (msg.includes('not found')) return res.status(404).json({ error: 'Lottery not found' });
      
      return res.status(500).json({ error: 'Failed to purchase ticket' });
    }

    await logAudit('purchase_ticket_success', { lottery_id, ticket_id: data.id }, player_id);

    res.status(201).json(data);
  } catch (err) {
    console.error('Purchase ticket error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /tickets/my
router.get('/my', roleGuard(['player']), async (req, res) => {
  try {
    // Nested query gets ticket + lottery title + nested prize title
    const { data, error } = await supabase
      .from('tickets')
      .select('*, lotteries(title, prizes(title))')
      .eq('player_id', req.user.userId);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Get my tickets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
