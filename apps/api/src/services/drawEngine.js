const crypto = require('crypto');
const Redis = require('ioredis');
const { createClient } = require('@supabase/supabase-js');

if (!process.env.REDIS_URL) {
  throw new Error('FATAL: REDIS_URL must be set.');
}

const redis = new Redis(process.env.REDIS_URL);
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const logAudit = async (action, metadata, actorId = null) => {
  try {
    await supabase.from('audit_log').insert({
      action,
      resource: 'draw',
      actor_id: actorId,
      metadata
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

const executeDraw = async (lottery_id, admin_id) => {
  let lockAcquired = false;
  const lockKey = `draw_lock:${lottery_id}`;

  try {
    // 1. Validate lottery ownership
    const { data: lottery, error: lotError } = await supabase
      .from('lotteries')
      .select('*')
      .eq('id', lottery_id)
      .single();

    if (lotError || !lottery) {
      await logAudit('draw_failed', { lottery_id, reason: 'Lottery not found' }, admin_id);
      throw new Error('Lottery not found');
    }

    if (lottery.admin_id !== admin_id) {
      await logAudit('draw_failed', { lottery_id, reason: 'Forbidden' }, admin_id);
      throw new Error('Forbidden');
    }

    if (lottery.status !== 'active') {
      await logAudit('draw_failed', { lottery_id, reason: 'Lottery is not active' }, admin_id);
      throw new Error('Lottery is not active');
    }

    // 2. Acquire Redis lock
    // EX 30 sets an expiration of 30 seconds to prevent permanent deadlocks if the server crashes.
    // NX (Not Exists) ensures we ONLY set the lock if it's not already there.
    // This atomic operation guarantees that concurrent identical draw requests (e.g., from rapid clicking)
    // are rejected immediately, preventing race conditions or duplicate winners.
    let lockRes;
    try {
      lockRes = await redis.set(lockKey, 'locked', 'NX', 'EX', 30);
    } catch (err) {
      await logAudit('draw_failed', { lottery_id, reason: 'Lock service unavailable' }, admin_id);
      throw new Error('Cannot execute draw: lock service unavailable');
    }

    if (lockRes === null) {
      await logAudit('draw_failed', { lottery_id, reason: 'Draw already in progress' }, admin_id);
      throw new Error('Draw already in progress');
    }
    
    lockAcquired = true;

    // 3. Fetch all tickets
    // Ordered by purchased_at ASC and id ASC for strict determinism
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .select('id, ticket_number, player_id')
      .eq('lottery_id', lottery_id)
      .order('purchased_at', { ascending: true })
      .order('id', { ascending: true });

    if (ticketError) {
      throw new Error('Failed to fetch tickets');
    }

    if (!tickets || tickets.length === 0) {
      throw new Error('No tickets sold yet');
    }

    const total_tickets = tickets.length;

    // 4. Compute winner using commit-reveal
    const { data: drawRecord, error: drawError } = await supabase
      .from('draws')
      .select('secret_seed')
      .eq('lottery_id', lottery_id)
      .single();

    if (drawError || !drawRecord || !drawRecord.secret_seed) {
      throw new Error('Draw record or secret_seed not found');
    }

    const secret_seed = drawRecord.secret_seed;

    // Perform modulo operation using BigInt to handle large hash values securely
    const hash = crypto.createHash('sha256').update(secret_seed + total_tickets.toString()).digest('hex');
    const winner_index = Number(BigInt('0x' + hash) % BigInt(total_tickets));
    const winner = tickets[winner_index];

    // 5. Save result in single Supabase transaction using RPC
    const { error: rpcError } = await supabase.rpc('complete_draw', {
      p_lottery_id: lottery_id,
      p_winner_ticket_id: winner.id
    });

    if (rpcError) {
      throw new Error(`RPC complete_draw failed: ${rpcError.message}`);
    }

    const payload = {
      winner_ticket_id: winner.id,
      winner_ticket_number: winner.ticket_number,
      winner_player_id: winner.player_id
    };

    // 6. Broadcast result via Realtime
    await supabase.channel(`lottery:draw:${lottery_id}`).send({
      type: 'broadcast',
      event: 'draw_completed',
      payload
    });

    // 8. Log to audit_log (Step 7 is finally block)
    await logAudit('draw_executed', {
      lottery_id,
      winner_ticket_id: winner.id,
      winner_ticket_number: winner.ticket_number,
      total_tickets
    }, admin_id);

    return payload;
  } catch (error) {
    // Prevent double logging for controlled errors already logged above
    const isControlledError = [
      'Lottery not found', 
      'Forbidden', 
      'Lottery is not active', 
      'Draw already in progress', 
      'Cannot execute draw: lock service unavailable'
    ].includes(error.message);
    
    if (!isControlledError) {
      await logAudit('draw_failed', { lottery_id, reason: error.message }, admin_id);
    }
    
    throw error;
  } finally {
    // 7. Release Redis lock
    // The finally block executes 100% of the time, regardless of whether the try block completes
    // successfully or throws an error. This is crucial for locks because if the Node process
    // encounters a network failure midway through the draw, we must release the lock so the admin
    // can safely retry. If we missed this, the lottery would be permanently frozen.
    if (lockAcquired) {
      try {
        await redis.del(lockKey);
      } catch (err) {
        console.error('Failed to release redis lock', err);
      }
    }
  }
};

module.exports = {
  executeDraw
};
