-- Migration: Fix "no unique or exclusion constraint matching the ON CONFLICT
-- specification" error on fn_bulk_save_zalo_messages.
--
-- Root cause (from 013_zca_bulk_save_rpc.sql / 015_update_bulk_save_rpc.sql):
-- fn_bulk_save_zalo_messages() tries to INSERT ... ON CONFLICT (user_id, group_id)
-- into zalo_groups (and ON CONFLICT (user_id, group_id, source_message_id) into
-- zalo_messages) BEFORE creating the unique indexes those ON CONFLICT clauses
-- need — the "CREATE UNIQUE INDEX IF NOT EXISTS" statements sit at the END of
-- the SAME function body, so they only run if the INSERT above them succeeds.
-- Since the underlying zalo_groups/zalo_messages tables never had those unique
-- indexes to begin with, EVERY call to this RPC throws immediately at the first
-- INSERT and the index-creation statements are never actually reached — a
-- chicken-and-egg bug that has been there since the RPC's first version.
--
-- Effect on the app: every listener message save falls back from the RPC to a
-- plain REST upsert, which ALSO specifies on_conflict=user_id,group_id(,...)
-- and fails with the same Postgres error for zalo_groups — so messages/groups
-- were never actually being persisted reliably. This is very likely why
-- messages appeared to "flash and disappear" in the Zalo chat UI (only ever
-- showing from optimistic local/listener state, not from what's really saved).
--
-- Fix: create the unique indexes as standalone, one-time DDL statements here
-- (not inside the function body), so they exist BEFORE the RPC is ever called.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_groups_uniq
    ON public.zalo_groups (user_id, group_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_messages_uniq
    ON public.zalo_messages (user_id, group_id, source_message_id);

CREATE INDEX IF NOT EXISTS idx_zalo_messages_lookup
    ON public.zalo_messages (user_id, group_id, source_message_id);

-- Re-create the RPC without the now-redundant (and unreachable) in-body
-- "CREATE INDEX" statements, so the function body no longer tries to create
-- schema objects on every call.
CREATE OR REPLACE FUNCTION public.fn_bulk_save_zalo_messages(
    p_user_id TEXT,
    p_groups JSONB,   -- JSON array of groups
    p_messages JSONB  -- JSON array of messages
) RETURNS INT AS $$
DECLARE
    v_saved_count INT := 0;
BEGIN
    -- 1. Bulk Upsert zalo_groups
    IF p_groups IS NOT NULL AND jsonb_array_length(p_groups) > 0 THEN
        INSERT INTO public.zalo_groups (
            user_id, group_id, group_name, avatar_url, unread_count,
            last_message_at, last_message_content, last_sender_id,
            last_sender_name, last_message_type, is_pinned, is_friend, updated_at
        )
        SELECT
            p_user_id,
            (g->>'group_id')::TEXT,
            (g->>'group_name')::TEXT,
            (g->>'avatar_url')::TEXT,
            (g->>'unread_count')::INT, -- Allow NULL here to coalesce in DO UPDATE
            (g->>'last_message_at')::TIMESTAMPTZ,
            (g->>'last_message_content')::TEXT,
            (g->>'last_sender_id')::TEXT,
            (g->>'last_sender_name')::TEXT,
            (g->>'last_message_type')::TEXT,
            COALESCE((g->>'is_pinned')::BOOLEAN, FALSE),
            (g->>'is_friend')::BOOLEAN, -- Allow NULL here to coalesce in DO UPDATE
            NOW()
        FROM jsonb_array_elements(p_groups) AS g
        ON CONFLICT (user_id, group_id)
        DO UPDATE SET
            group_name = EXCLUDED.group_name,
            avatar_url = COALESCE(EXCLUDED.avatar_url, zalo_groups.avatar_url),
            unread_count = COALESCE(EXCLUDED.unread_count, zalo_groups.unread_count),
            last_message_at = COALESCE(EXCLUDED.last_message_at, zalo_groups.last_message_at),
            last_message_content = COALESCE(EXCLUDED.last_message_content, zalo_groups.last_message_content),
            last_sender_id = COALESCE(EXCLUDED.last_sender_id, zalo_groups.last_sender_id),
            last_sender_name = COALESCE(EXCLUDED.last_sender_name, zalo_groups.last_sender_name),
            last_message_type = COALESCE(EXCLUDED.last_message_type, zalo_groups.last_message_type),
            is_pinned = EXCLUDED.is_pinned,
            is_friend = COALESCE(EXCLUDED.is_friend, zalo_groups.is_friend),
            updated_at = NOW();
    END IF;

    -- 2. Bulk Upsert zalo_messages
    IF p_messages IS NOT NULL AND jsonb_array_length(p_messages) > 0 THEN
        INSERT INTO public.zalo_messages (
            user_id, group_id, group_name, source_message_id,
            sender_id, sender_name, created_at, timestamp_text,
            time_text, type, content, is_sent, is_deleted
        )
        SELECT
            p_user_id,
            (m->>'group_id')::TEXT,
            (m->>'group_name')::TEXT,
            COALESCE((m->>'message_id')::TEXT, (m->>'source_message_id')::TEXT),
            (m->>'sender_id')::TEXT,
            (m->>'sender_name')::TEXT,
            COALESCE((m->>'created_at')::TIMESTAMPTZ, NOW()),
            (m->>'timestamp_text')::TEXT,
            (m->>'time_text')::TEXT,
            COALESCE((m->>'type')::TEXT, 'text'),
            (m->>'content')::TEXT,
            COALESCE((m->>'is_sent')::BOOLEAN, FALSE),
            COALESCE((m->>'is_deleted')::BOOLEAN, FALSE)
        FROM jsonb_array_elements(p_messages) AS m
        ON CONFLICT (user_id, group_id, source_message_id)
        DO UPDATE SET
            sender_name = EXCLUDED.sender_name,
            content = EXCLUDED.content,
            type = EXCLUDED.type,
            is_sent = EXCLUDED.is_sent,
            is_deleted = EXCLUDED.is_deleted;

        GET DIAGNOSTICS v_saved_count = ROW_COUNT;
    END IF;

    RETURN v_saved_count;
END;
$$ LANGUAGE plpgsql;
