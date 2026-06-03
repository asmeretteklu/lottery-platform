CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.purchase_ticket(p_lottery_id uuid, p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lottery record;
    v_ticket_count integer;
    v_new_tickets_sold integer;
    v_ticket_id uuid;
    v_lottery_prefix text;
    v_ticket_number text;
    v_qr_hash text;
    v_ticket record;
BEGIN
    -- 1. Lock the lottery row to prevent concurrent race conditions
    SELECT * INTO v_lottery
    FROM lotteries
    WHERE id = p_lottery_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lottery not found';
    END IF;

    -- 2. Check status
    IF v_lottery.status != 'active' THEN
        RAISE EXCEPTION 'This lottery is not accepting tickets';
    END IF;

    -- 3. Check max tickets limit
    IF v_lottery.tickets_sold >= v_lottery.max_tickets THEN
        RAISE EXCEPTION 'This lottery is sold out';
    END IF;

    -- 4. Check player limit
    SELECT count(*) INTO v_ticket_count
    FROM tickets
    WHERE lottery_id = p_lottery_id AND player_id = p_player_id;

    IF v_ticket_count >= 3 THEN
        RAISE EXCEPTION 'Ticket limit exceeded: Maximum 3 tickets per lottery';
    END IF;

    -- 5. Increment tickets sold
    v_new_tickets_sold := v_lottery.tickets_sold + 1;
    
    UPDATE lotteries
    SET tickets_sold = v_new_tickets_sold
    WHERE id = p_lottery_id;

    -- 6. Generate ticket number: LOT-{first4charsOfLotteryId}-{zero_padded_4_digit_count}
    v_lottery_prefix := upper(substring(p_lottery_id::text from 1 for 4));
    v_ticket_number := 'LOT-' || v_lottery_prefix || '-' || lpad(v_new_tickets_sold::text, 4, '0');

    -- 7. Generate IDs and secure qr_hash
    v_ticket_id := gen_random_uuid();
    v_qr_hash := encode(digest(v_ticket_id::text || p_player_id::text || p_lottery_id::text, 'sha256'), 'hex');

    -- 8. Insert ticket
    INSERT INTO tickets (id, lottery_id, player_id, ticket_number, qr_hash, is_winner, purchased_at)
    VALUES (v_ticket_id, p_lottery_id, p_player_id, v_ticket_number, v_qr_hash, false, now())
    RETURNING * INTO v_ticket;

    -- Return JSON representation of the new ticket
    RETURN row_to_json(v_ticket)::jsonb;
END;
$$;

-- Grant access to authenticated users to call this RPC
GRANT EXECUTE ON FUNCTION public.purchase_ticket(uuid, uuid) TO authenticated;
