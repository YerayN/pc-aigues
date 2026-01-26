// assets/js/config.js

// Sustituye esto por tus datos reales de Supabase
const SUPABASE_URL = 'https://irmkphwdqavkzbgszkon.supabase.co';
const SUPABASE_KEY = 'sb_publishable_YE4P7UxXiUbAMdXKBPRKYQ_RkrsgsDE';

// Inicializamos el cliente (se crea una variable global 'supabase')
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("✅ Supabase conectado");