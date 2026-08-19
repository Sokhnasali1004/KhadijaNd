/**
 * ====================================================================
 * SUPABASE CLIENT & API MODULE POUR KHADIJA_ND
 * ====================================================================
 * Ce fichier gère la communication avec Supabase (Base de données PostgreSQL
 * et Storage Cloud pour les vidéos et photos).
 * 
 * Vous pouvez renseigner directement vos clés ci-dessous, ou les configurer
 * depuis l'espace Admin du site (onglet "Configuration Supabase").
 */

// ⚠️ Remplacez ces valeurs par celles de votre projet Supabase (https://supabase.com/dashboard)
const DEFAULT_SUPABASE_URL = "https://fpxhhbkelcoeqyxcigoj.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_PaaJJ3fIeM6-X3UJsmA_6w_4V9N05hZ";

const SUPABASE_STORAGE_KEYS = {
  url: "khadija_supabase_url",
  key: "khadija_supabase_anon_key",
  localContents: "khadija_contents_v2",
  localGallery: "khadija_gallery_v1",
  localCollabs: "khadija_collabs_v1",
  localMessages: "khadija_messages_v1"
};

// Données par défaut si aucune donnée n'est trouvée
const INITIAL_FALLBACK_DATA = {
  contents: [],
  gallery: [
    { id: "g1", caption: "photo 1", image: "" },
    { id: "g2", caption: "photo 2", image: "" },
    { id: "g3", caption: "photo 3", image: "" },
    { id: "g4", caption: "photo 4", image: "" },
    { id: "g5", caption: "photo 5", image: "" },
    { id: "g6", caption: "photo 6", image: "" },
    { id: "g7", caption: "photo 7", image: "" },
    { id: "g8", caption: "photo 8", image: "" }
  ],
  collabs: [
    { id: "b1", name: "Yas", logo: "" },
    { id: "b2", name: "Marque B", logo: "" },
    { id: "b3", name: "Marque C", logo: "" },
    { id: "b4", name: "Marque D", logo: "" },
    { id: "b5", name: "Marque E", logo: "" }
  ],
  messages: []
};

function cleanSupabaseUrl(url) {
  if (!url) return "";
  let clean = url.trim();
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  clean = clean.replace(/\/+$/, '');
  return clean;
}

class SupabaseService {
  constructor() {
    this.client = null;
    this.url = "";
    this.anonKey = "";
    this.init();
  }

  getCredentials() {
    const savedUrl = localStorage.getItem(SUPABASE_STORAGE_KEYS.url) || DEFAULT_SUPABASE_URL;
    const savedKey = localStorage.getItem(SUPABASE_STORAGE_KEYS.key) || DEFAULT_SUPABASE_ANON_KEY;
    return {
      url: cleanSupabaseUrl(savedUrl),
      anonKey: savedKey ? savedKey.trim() : ""
    };
  }

  init() {
    const creds = this.getCredentials();
    this.url = creds.url;
    this.anonKey = creds.anonKey;

    if (this.url && this.anonKey && window.supabase && window.supabase.createClient) {
      try {
        this.client = window.supabase.createClient(this.url, this.anonKey);
      } catch (err) {
        console.warn("Erreur initialisation Supabase :", err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    return Boolean(this.client && this.url && this.anonKey);
  }

  async testConnection(url, key) {
    if (!window.supabase || !window.supabase.createClient) {
      return { success: false, message: "La librairie Supabase JS n'est pas chargée." };
    }
    const cleanUrl = cleanSupabaseUrl(url);
    if (!cleanUrl || !key) {
      return { success: false, message: "Veuillez renseigner l'URL et la clé Anon." };
    }
    try {
      const testClient = window.supabase.createClient(cleanUrl, key.trim());
      const { data, error } = await testClient.from('contents').select('id').limit(1);
      if (error) {
        // Si l'erreur est que la table n'existe pas encore
        if (error.message && error.message.includes('relation "public.contents" does not exist')) {
          return {
            success: false,
            message: "Connexion réussie mais les tables ne sont pas créées. Exécutez le script supabase_schema.sql dans le SQL Editor de Supabase."
          };
        }
        return { success: false, message: error.message || "Erreur de connexion." };
      }
      return { success: true, message: "Connexion Supabase établie avec succès !" };
    } catch (err) {
      return { success: false, message: err.message || "Impossible de joindre Supabase." };
    }
  }

  saveCredentials(url, key) {
    const cleanUrl = cleanSupabaseUrl(url);
    if (cleanUrl) localStorage.setItem(SUPABASE_STORAGE_KEYS.url, cleanUrl);
    else localStorage.removeItem(SUPABASE_STORAGE_KEYS.url);

    if (key) localStorage.setItem(SUPABASE_STORAGE_KEYS.key, key.trim());
    else localStorage.removeItem(SUPABASE_STORAGE_KEYS.key);

    this.init();
  }

  // --- Gestion du LocalStorage (Mode hors-ligne / Fallback) ---
  getLocal(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return JSON.parse(JSON.stringify(fallback));
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return JSON.parse(JSON.stringify(fallback));
    }
  }

  setLocal(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn("Stockage local plein :", e);
      return false;
    }
  }

  // ==================================================================
  // STORAGE : UPLOAD DE FICHIERS (Vidéos, Photos, Logos)
  // ==================================================================
  async uploadFile(file, folder = 'uploads') {
    if (!file) return null;

    // Si Supabase est configuré, upload vers le bucket 'media'
    if (this.isConfigured()) {
      try {
        const fileExt = file.name.split('.').pop();
        const cleanExt = fileExt ? `.${fileExt}` : '';
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}${cleanExt}`;

        const { data, error } = await this.client.storage
          .from('media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.warn("Upload Storage Supabase échoué, repli en cours :", error.message);
          throw error;
        }

        // Récupération de l'URL publique
        const { data: publicUrlData } = this.client.storage
          .from('media')
          .getPublicUrl(fileName);

        return publicUrlData.publicUrl;
      } catch (err) {
        console.warn("Erreur Supabase Storage, conversion Base64 en fallback :", err);
        return await this.fileToBase64(file);
      }
    }

    // Sinon repli Base64
    return await this.fileToBase64(file);
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) { resolve(""); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ==================================================================
  // CONTENUS EN VEDETTE (VIDÉOS)
  // ==================================================================
  async getContents() {
    if (this.isConfigured()) {
      try {
        const { data, error } = await this.client
          .from('contents')
          .select('*')
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data.map(item => ({
            id: item.id,
            caption: item.caption,
            video: item.video_url,
            created_at: item.created_at
          }));
        }
      } catch (err) {
        console.warn("Erreur chargement Supabase contents :", err);
      }
    }
    return this.getLocal(SUPABASE_STORAGE_KEYS.localContents, INITIAL_FALLBACK_DATA.contents);
  }

  async addContent(caption, videoUrl) {
    const newContent = {
      caption: caption || "@khadija_nd",
      video_url: videoUrl || "",
      order_index: 0
    };

    if (this.isConfigured()) {
      try {
        const { data, error } = await this.client
          .from('contents')
          .insert([newContent])
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            caption: data.caption,
            video: data.video_url
          };
        }
      } catch (err) {
        console.warn("Erreur insertion Supabase contents :", err);
      }
    }

    // Fallback local
    const localList = this.getLocal(SUPABASE_STORAGE_KEYS.localContents, INITIAL_FALLBACK_DATA.contents);
    const fallbackItem = {
      id: "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      caption: newContent.caption,
      video: newContent.video_url
    };
    localList.unshift(fallbackItem);
    this.setLocal(SUPABASE_STORAGE_KEYS.localContents, localList);
    return fallbackItem;
  }

  async deleteContent(id) {
    if (this.isConfigured()) {
      try {
        const { error } = await this.client
          .from('contents')
          .delete()
          .eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn("Erreur suppression Supabase contents :", err);
      }
    }

    // Fallback local
    let localList = this.getLocal(SUPABASE_STORAGE_KEYS.localContents, INITIAL_FALLBACK_DATA.contents);
    localList = localList.filter(item => item.id !== id);
    this.setLocal(SUPABASE_STORAGE_KEYS.localContents, localList);
    return true;
  }

  // ==================================================================
  // GALERIE / UNIVERS (PHOTOS)
  // ==================================================================
  async getGallery() {
    if (this.isConfigured()) {
      try {
        const { data, error } = await this.client
          .from('gallery')
          .select('*')
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map(item => ({
            id: item.id,
            caption: item.caption,
            image: item.image_url,
            created_at: item.created_at
          }));
        }
      } catch (err) {
        console.warn("Erreur chargement Supabase gallery :", err);
      }
    }
    return this.getLocal(SUPABASE_STORAGE_KEYS.localGallery, INITIAL_FALLBACK_DATA.gallery);
  }

  async addGalleryItem(caption, imageUrl) {
    const newItem = {
      caption: caption || "",
      image_url: imageUrl || "",
      order_index: 0
    };

    if (this.isConfigured()) {
      try {
        const { data, error } = await this.client
          .from('gallery')
          .insert([newItem])
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            caption: data.caption,
            image: data.image_url
          };
        }
      } catch (err) {
        console.warn("Erreur insertion Supabase gallery :", err);
      }
    }

    // Fallback local
    const localList = this.getLocal(SUPABASE_STORAGE_KEYS.localGallery, INITIAL_FALLBACK_DATA.gallery);
    const fallbackItem = {
      id: "g_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      caption: newItem.caption,
      image: newItem.image_url
    };
    localList.unshift(fallbackItem);
    this.setLocal(SUPABASE_STORAGE_KEYS.localGallery, localList);
    return fallbackItem;
  }

  async deleteGalleryItem(id) {
    if (this.isConfigured()) {
      try {
        const { error } = await this.client
          .from('gallery')
          .delete()
          .eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn("Erreur suppression Supabase gallery :", err);
      }
    }

    // Fallback local
    let localList = this.getLocal(SUPABASE_STORAGE_KEYS.localGallery, INITIAL_FALLBACK_DATA.gallery);
    localList = localList.filter(item => item.id !== id);
    this.setLocal(SUPABASE_STORAGE_KEYS.localGallery, localList);
    return true;
  }

  // ==================================================================
  // COLLABORATIONS (MARQUES & LOGOS)
  // ==================================================================
  async getCollabs() {
    if (this.isConfigured()) {
      try {
        const { data, error } = await this.client
          .from('collabs')
          .select('*')
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map(item => ({
            id: item.id,
            name: item.name,
            logo: item.logo_url,
            created_at: item.created_at
          }));
        }
      } catch (err) {
        console.warn("Erreur chargement Supabase collabs :", err);
      }
    }
    return this.getLocal(SUPABASE_STORAGE_KEYS.localCollabs, INITIAL_FALLBACK_DATA.collabs);
  }

  async addCollab(name, logoUrl) {
    const newItem = {
      name: name || "Nouvelle Marque",
      logo_url: logoUrl || "",
      order_index: 0
    };

    if (this.isConfigured()) {
      try {
        const { data, error } = await this.client
          .from('collabs')
          .insert([newItem])
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            name: data.name,
            logo: data.logo_url
          };
        }
      } catch (err) {
        console.warn("Erreur insertion Supabase collabs :", err);
      }
    }

    // Fallback local
    const localList = this.getLocal(SUPABASE_STORAGE_KEYS.localCollabs, INITIAL_FALLBACK_DATA.collabs);
    const fallbackItem = {
      id: "b_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: newItem.name,
      logo: newItem.logo_url
    };
    localList.unshift(fallbackItem);
    this.setLocal(SUPABASE_STORAGE_KEYS.localCollabs, localList);
    return fallbackItem;
  }

  async deleteCollab(id) {
    if (this.isConfigured()) {
      try {
        const { error } = await this.client
          .from('collabs')
          .delete()
          .eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn("Erreur suppression Supabase collabs :", err);
      }
    }

    // Fallback local
    let localList = this.getLocal(SUPABASE_STORAGE_KEYS.localCollabs, INITIAL_FALLBACK_DATA.collabs);
    localList = localList.filter(item => item.id !== id);
    this.setLocal(SUPABASE_STORAGE_KEYS.localCollabs, localList);
    return true;
  }

  // ==================================================================
  // MESSAGES DE CONTACT / PARTENARIATS
  // ==================================================================
  async sendContactMessage({ name, email, brand, message }) {
    const newMsg = {
      name: name.trim(),
      email: email.trim(),
      brand: brand ? brand.trim() : '',
      message: message.trim(),
      created_at: new Date().toISOString()
    };

    if (this.isConfigured()) {
      try {
        const { data, error } = await this.client
          .from('contact_messages')
          .insert([newMsg]);

        if (error) throw error;
        return { success: true, message: "Votre message a été envoyé avec succès !" };
      } catch (err) {
        console.warn("Erreur envoi message Supabase :", err);
      }
    }

    // Fallback local
    const localMsgs = this.getLocal(SUPABASE_STORAGE_KEYS.localMessages, []);
    localMsgs.unshift({
      id: "m_" + Date.now().toString(36),
      ...newMsg
    });
    this.setLocal(SUPABASE_STORAGE_KEYS.localMessages, localMsgs);
    return { success: true, message: "Votre message a été bien transmis !" };
  }

  async getContactMessages() {
    if (this.isConfigured()) {
      try {
        const { data, error } = await this.client
          .from('contact_messages')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          return data;
        }
      } catch (err) {
        console.warn("Erreur chargement messages Supabase :", err);
      }
    }
    return this.getLocal(SUPABASE_STORAGE_KEYS.localMessages, []);
  }

  async deleteContactMessage(id) {
    if (this.isConfigured()) {
      try {
        const { error } = await this.client
          .from('contact_messages')
          .delete()
          .eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn("Erreur suppression message Supabase :", err);
      }
    }

    let localMsgs = this.getLocal(SUPABASE_STORAGE_KEYS.localMessages, []);
    localMsgs = localMsgs.filter(m => m.id !== id);
    this.setLocal(SUPABASE_STORAGE_KEYS.localMessages, localMsgs);
    return true;
  }
}

// Instance singleton
window.supabaseService = new SupabaseService();
