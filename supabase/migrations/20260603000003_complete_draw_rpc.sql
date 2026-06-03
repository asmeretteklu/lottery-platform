CREATE OR REPLACE FUNCTION public.complete_draw(p_lottery_id uuid, p_winner_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Set ticket as winner
    UPDATE tickets
    SET is_winner = true
    WHERE id = p_winner_ticket_id
      AND lottery_id = p_lottery_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Winner ticket not found or does not belong to this lottery';
    END IF;

    -- 2. Update draws row with result and verification
    UPDATE draws
    SET winner_ticket_id = p_winner_ticket_id,
        drawn_at = now(),
        verified = true
    WHERE lottery_id = p_lottery_id;

    -- 3. Set lottery status to completed
    UPDATE lotteries
    SET status = 'completed'
    WHERE id = p_lottery_id;
END;
$$;

-- Grant execution to authenticated role
GRANT EXECUTE ON FUNCTION public.complete_draw(uuid, uuid) TO authenticated;
