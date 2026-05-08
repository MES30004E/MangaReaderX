-- Favorites (separate table, supports ordering)
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  manga_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, manga_id)
);
CREATE INDEX idx_favorites_user ON public.favorites(user_id, position);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own favorites" ON public.favorites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Collections (folders)
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_collections_user ON public.collections(user_id, position);
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own collections" ON public.collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own collections" ON public.collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own collections" ON public.collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own collections" ON public.collections FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_collections_updated BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Collection membership (many-to-many)
CREATE TABLE public.collection_manga (
  collection_id uuid NOT NULL,
  manga_id uuid NOT NULL,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, manga_id)
);
CREATE INDEX idx_collection_manga_user ON public.collection_manga(user_id);
CREATE INDEX idx_collection_manga_manga ON public.collection_manga(manga_id);
ALTER TABLE public.collection_manga ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own coll_manga" ON public.collection_manga FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own coll_manga" ON public.collection_manga FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own coll_manga" ON public.collection_manga FOR DELETE USING (auth.uid() = user_id);

-- Reader preferences (one row per user)
CREATE TABLE public.reader_preferences (
  user_id uuid PRIMARY KEY,
  left_handed boolean NOT NULL DEFAULT false,
  invert_taps boolean NOT NULL DEFAULT false,
  tap_zone_pct integer NOT NULL DEFAULT 20,
  dim_level integer NOT NULL DEFAULT 0,
  always_hide_chrome boolean NOT NULL DEFAULT false,
  auto_resume boolean NOT NULL DEFAULT true,
  fit_vertical text NOT NULL DEFAULT 'width',
  fit_book text NOT NULL DEFAULT 'height',
  fit_conveyor text NOT NULL DEFAULT 'height',
  default_mode text NOT NULL DEFAULT 'vertical',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reader_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own prefs" ON public.reader_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own prefs" ON public.reader_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.reader_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.reader_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend manga with alt_title and auto_resume
ALTER TABLE public.manga
  ADD COLUMN alt_title text,
  ADD COLUMN auto_resume boolean NOT NULL DEFAULT false;
CREATE INDEX idx_manga_user_updated ON public.manga(user_id, updated_at DESC);
CREATE INDEX idx_manga_title_search ON public.manga USING gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(alt_title,'')));

-- Track per-chapter read state for "last read chapter" badges and unread filters
ALTER TABLE public.chapters
  ADD COLUMN read_at timestamptz;
CREATE INDEX idx_chapters_manga_index ON public.chapters(manga_id, index);