-- ====================================================================
-- SCHEMA SUPABASE POUR LE SITE KHADIJA_ND
-- Copiez et collez ce script dans l'editeur SQL de Supabase (SQL Editor)
-- puis cliquez sur "Run".
-- ====================================================================

-- 1. Table des contenus en vedette (videos / Reels / TikTok)
CREATE TABLE IF NOT EXISTS public.contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    video_url TEXT NOT NULL DEFAULT '',
    order_index INTEGER DEFAULT 0
);

-- 2. Table de la galerie (Univers / photos)
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    caption TEXT DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    order_index INTEGER DEFAULT 0
);

-- 3. Table des collaborations (marques / logos)
CREATE TABLE IF NOT EXISTS public.collabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    logo_url TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0
);

-- 4. Table des messages de contact / demandes de partenariat
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    brand TEXT DEFAULT '',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'nouveau'
);

-- ====================================================================
-- ACTIVATION DE LA SECURITE AU NIVEAU DES LIGNES (RLS)
-- ====================================================================

ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture publique pour le site
DROP POLICY IF EXISTS "Lecture publique des contenus" ON public.contents;
CREATE POLICY "Lecture publique des contenus" ON public.contents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lecture publique de la galerie" ON public.gallery;
CREATE POLICY "Lecture publique de la galerie" ON public.gallery FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lecture publique des collabs" ON public.collabs;
CREATE POLICY "Lecture publique des collabs" ON public.collabs FOR SELECT USING (true);

-- Politiques de gestion (ecriture/suppression/mise a jour)
DROP POLICY IF EXISTS "Gestion publique des contenus" ON public.contents;
CREATE POLICY "Gestion publique des contenus" ON public.contents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gestion publique de la galerie" ON public.gallery;
CREATE POLICY "Gestion publique de la galerie" ON public.gallery FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Gestion publique des collabs" ON public.collabs;
CREATE POLICY "Gestion publique des collabs" ON public.collabs FOR ALL USING (true) WITH CHECK (true);

-- Politiques pour les messages
DROP POLICY IF EXISTS "Insertion publique des messages" ON public.contact_messages;
CREATE POLICY "Insertion publique des messages" ON public.contact_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Gestion publique des messages" ON public.contact_messages;
CREATE POLICY "Gestion publique des messages" ON public.contact_messages FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- CREATION DU BUCKET DE STOCKAGE "media" POUR LES VIDEOS ET PHOTOS
-- ====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politiques de stockage pour le bucket media
DROP POLICY IF EXISTS "Acces public aux medias" ON storage.objects;
CREATE POLICY "Acces public aux medias" ON storage.objects FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Upload public de medias" ON storage.objects;
CREATE POLICY "Upload public de medias" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "Suppression publique de medias" ON storage.objects;
CREATE POLICY "Suppression publique de medias" ON storage.objects FOR DELETE USING (bucket_id = 'media');

-- ====================================================================
-- DONNEES INITIALES (Exemples de demarrage si tables vides)
-- ====================================================================

INSERT INTO public.collabs (name, logo_url, order_index)
SELECT name, logo_url, order_index FROM (
    VALUES 
        ('Yas', '', 1),
        ('Marque B', '', 2),
        ('Marque C', '', 3),
        ('Marque D', '', 4),
        ('Marque E', '', 5)
) AS v(name, logo_url, order_index)
WHERE NOT EXISTS (SELECT 1 FROM public.collabs);

INSERT INTO public.gallery (caption, image_url, order_index)
SELECT caption, image_url, order_index FROM (
    VALUES 
        ('photo 1', '', 1),
        ('photo 2', '', 2),
        ('photo 3', '', 3),
        ('photo 4', '', 4),
        ('photo 5', '', 5),
        ('photo 6', '', 6),
        ('photo 7', '', 7),
        ('photo 8', '', 8)
) AS v(caption, image_url, order_index)
WHERE NOT EXISTS (SELECT 1 FROM public.gallery);
