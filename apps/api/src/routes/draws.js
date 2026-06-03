const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware, roleGuard } = require('../middleware/auth');
const { executeDraw } = require('../services/drawEngine');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

router.use(authMiddleware);

// POST /draws/:lottery_id/execute
router.post('/:lottery_id/execute', roleGuard(['admin', 'super_admin']), async (req, res) => {
  try {
    const { lottery_id } = req.params;
    const admin_id = req.user.userId;

    const result = await executeDraw(lottery_id, admin_id);
    res.json(result);
  } catch (error) {
    console.error('Execute draw error:', error);
    
    // Whitelist of controlled errors we can safely map to 400/403
    const safeErrors = [
      'Lottery not found', 
      'Forbidden', 
      'Lottery is not active', 
      'Draw already in progress', 
      'Cannot execute draw: lock service unavailable', 
      'No tickets sold yet'
    ];
    
    if (safeErrors.includes(error.message)) {
      const status = error.message === 'Forbidden' ? 403 : 400;
      return res.status(status).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error during draw execution' });
  }
});

// GET /draws/:lottery_id
router.get('/:lottery_id', roleGuard(['player', 'admin', 'super_admin']), async (req, res) => {
  try {
    const { lottery_id } = req.params;

    // Retrieve draw, associated ticket info, and prize info
    const { data: draw, error } = await supabase
      .from('draws')
      .select(`
        drawn_at,
        verified,
        seed_hash,
        winner_ticket_id,
        tickets!winner_ticket_id(ticket_number, player_id),
        lotteries!inner(status, prizes(title, description, value_etb, photo_url))
      `)
      .eq('lottery_id', lottery_id)
      .single();

    if (error || !draw) {
      return res.status(404).json({ error: 'Draw not found' });
    }

    if (draw.lotteries.status !== 'completed') {
      return res.status(400).json({ error: 'Lottery is not completed yet' });
    }

    // Security: the secret_seed is deliberately omitted from the .select() above.
    // However, if the query is ever modified by mistake, we enforce a strict strip here.
    if (draw.secret_seed) {
      delete draw.secret_seed;
    }

    res.json({
      lottery_id,
      drawn_at: draw.drawn_at,
      verified: draw.verified,
      seed_hash: draw.seed_hash,
      winner_ticket_id: draw.winner_ticket_id,
      winner_ticket_number: draw.tickets?.ticket_number,
      winner_player_id: draw.tickets?.player_id,
      prize: draw.lotteries?.prizes?.[0] || null
    });
  } catch (error) {
    console.error('Get draw error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
