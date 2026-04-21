-- Add visibility + access control for global manga
ALTER TABLE public.global_manga
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- Restrict allowed values via trigger (avoid CHECK so we can evolve)
CREATE OR REPLACE FUNCTION public.validate_global_manga_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.visibility NOT IN ('public','restricted') THEN
    RAISE EXCEPTION 'visibility must be public or restricted';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_global_manga_visibility ON public.global_manga;
CREATE TRIGGER trg_validate_global_manga_visibility
  BEFORE INSERT OR UPDATE ON public.global_manga
  FOR EACH ROW EXECUTE FUNCTION public.validate_global_manga_visibility();

-- Per-user access list for restricted entries
CREATE TABLE IF NOT EXISTS public.global_manga_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_manga_id uuid NOT NULL REFERENCES public.global_manga(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (global_manga_id, user_id)
);

ALTER TABLE public.global_manga_access ENABLE ROW LEVEL SECURITY;

-- Admins manage; users see their own grants
DROP POLICY IF EXISTS "Admins manage global access" ON public.global_manga_access;
CREATE POLICY "Admins manage global access"
  ON public.global_manga_access
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users see own access grants" ON public.global_manga_access;
CREATE POLICY "Users see own access grants"
  ON public.global_manga_access
  FOR SELECT
  USING (auth.uid() = user_id);

-- Replace the broad SELECT policy on global_manga with visibility-aware one
DROP POLICY IF EXISTS "Authenticated users browse global manga" ON public.global_manga;
CREATE POLICY "Browse public or granted global manga"
  ON public.global_manga
  FOR SELECT
  TO authenticated
  USING (
    visibility = 'public'
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.global_manga_access a
      WHERE a.global_manga_id = global_manga.id AND a.user_id = auth.uid()
    )
  );

-- Mirror visibility on global_chapters via parent
DROP POLICY IF EXISTS "Authenticated users browse global chapters" ON public.global_chapters;
CREATE POLICY "Browse chapters of accessible global manga"
  ON public.global_chapters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.global_manga g
      WHERE g.id = global_chapters.global_manga_id
        AND (
          g.visibility = 'public'
          OR public.has_role(auth.uid(), 'admin')
          OR EXISTS (
            SELECT 1 FROM public.global_manga_access a
            WHERE a.global_manga_id = g.id AND a.user_id = auth.uid()
          )
        )
    )
  );