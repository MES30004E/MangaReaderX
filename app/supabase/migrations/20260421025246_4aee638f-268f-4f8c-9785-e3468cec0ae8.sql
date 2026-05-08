-- 1) Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Global manga catalogue
CREATE TABLE public.global_manga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  alt_title text,
  description text,
  language text,
  status text NOT NULL DEFAULT 'ongoing',
  cover_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.global_manga ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_global_manga_updated_at
  BEFORE UPDATE ON public.global_manga
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Authenticated users browse global manga"
  ON public.global_manga FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins insert global manga"
  ON public.global_manga FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update global manga"
  ON public.global_manga FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete global manga"
  ON public.global_manga FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) Global chapters
CREATE TABLE public.global_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_manga_id uuid NOT NULL REFERENCES public.global_manga(id) ON DELETE CASCADE,
  title text NOT NULL,
  index integer NOT NULL,
  page_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_global_chapters_manga ON public.global_chapters(global_manga_id, index);

ALTER TABLE public.global_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users browse global chapters"
  ON public.global_chapters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage global chapters"
  ON public.global_chapters FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) Link personal manga rows to a global entry (reference model, not duplication)
ALTER TABLE public.manga
  ADD COLUMN global_manga_id uuid REFERENCES public.global_manga(id) ON DELETE SET NULL;

CREATE INDEX idx_manga_global_ref ON public.manga(global_manga_id) WHERE global_manga_id IS NOT NULL;

-- A user can only have one personal row referencing a given global manga
CREATE UNIQUE INDEX uniq_user_global_manga
  ON public.manga(user_id, global_manga_id)
  WHERE global_manga_id IS NOT NULL AND deleted_at IS NULL;

-- 5) Storage bucket for global covers (public read)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('global-covers', 'global-covers', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Global covers publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'global-covers');

CREATE POLICY "Admins upload global covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'global-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update global covers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'global-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete global covers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'global-covers' AND public.has_role(auth.uid(), 'admin'));