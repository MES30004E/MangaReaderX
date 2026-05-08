
-- 1) Default always_hide_chrome to true for new rows + flip existing rows that still hold the old default
ALTER TABLE public.reader_preferences ALTER COLUMN always_hide_chrome SET DEFAULT true;
UPDATE public.reader_preferences SET always_hide_chrome = true WHERE always_hide_chrome = false;

-- 2) Manga shares table
CREATE TABLE public.manga_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  recipient_user_id uuid NOT NULL,
  permission text NOT NULL DEFAULT 'read',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (manga_id, recipient_user_id)
);

ALTER TABLE public.manga_shares ENABLE ROW LEVEL SECURITY;

-- Owner or recipient can view a share row
CREATE POLICY "Share visible to owner or recipient"
ON public.manga_shares FOR SELECT
USING (auth.uid() = owner_user_id OR auth.uid() = recipient_user_id);

-- Only the owner can create a share (must own the manga)
CREATE POLICY "Owner inserts share"
ON public.manga_shares FOR INSERT
WITH CHECK (
  auth.uid() = owner_user_id
  AND EXISTS (SELECT 1 FROM public.manga m WHERE m.id = manga_id AND m.user_id = auth.uid())
);

-- Owner can delete the share globally; recipient can delete their own access
CREATE POLICY "Owner or recipient deletes share"
ON public.manga_shares FOR DELETE
USING (auth.uid() = owner_user_id OR auth.uid() = recipient_user_id);

-- 3) Recipient SELECT access to manga / chapters / pages via share rows
CREATE POLICY "Recipients view shared manga"
ON public.manga FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.manga_shares s
    WHERE s.manga_id = manga.id AND s.recipient_user_id = auth.uid()
  )
);

CREATE POLICY "Recipients view shared chapters"
ON public.chapters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.manga_shares s
    WHERE s.manga_id = chapters.manga_id AND s.recipient_user_id = auth.uid()
  )
);

CREATE POLICY "Recipients view shared pages"
ON public.pages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chapters c
    JOIN public.manga_shares s ON s.manga_id = c.manga_id
    WHERE c.id = pages.chapter_id AND s.recipient_user_id = auth.uid()
  )
);

CREATE INDEX idx_manga_shares_recipient ON public.manga_shares(recipient_user_id);
CREATE INDEX idx_manga_shares_manga ON public.manga_shares(manga_id);
