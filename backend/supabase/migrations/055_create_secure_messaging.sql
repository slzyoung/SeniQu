-- ============================================================
-- Migration 055: Secure E2E In-App Chat Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_a UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    participant_b UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_participants UNIQUE (participant_a, participant_b)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL,
    iv TEXT NOT NULL,
    sender_public_key TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.message_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_blocks UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.message_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Conversations viewable by participants" ON public.conversations
    FOR SELECT USING (auth.uid() = participant_a OR auth.uid() = participant_b);
CREATE POLICY "Conversations manageable by participants" ON public.conversations
    FOR ALL USING (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "Messages viewable by participants" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Messages manageable by participants" ON public.messages
    FOR ALL USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Message blocks manageable by blocker" ON public.message_blocks
    FOR ALL USING (auth.uid() = blocker_id);

CREATE POLICY "Message reports manageable by reporter" ON public.message_reports
    FOR ALL USING (auth.uid() = reporter_id);

-- Grants
GRANT SELECT ON TABLE public.conversations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;

GRANT SELECT ON TABLE public.messages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;

GRANT SELECT ON TABLE public.message_blocks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.message_blocks TO authenticated;
GRANT ALL ON TABLE public.message_blocks TO service_role;

GRANT SELECT ON TABLE public.message_reports TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.message_reports TO authenticated;
GRANT ALL ON TABLE public.message_reports TO service_role;
