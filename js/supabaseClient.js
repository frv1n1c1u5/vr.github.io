// Arquivo: js/supabaseClient.js
// VERSÃO FINAL COM O PAR DE URL E CHAVE 100% CORRETO

const SUPABASE_URL = 'https://nvtfpqtfhsvbezcbxgzt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52dGZwcXRmaHN2YmV6Y2J4Z3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2OTI4NjcsImV4cCI6MjA2ODI2ODg2N30.1AIeEPsOUktmfqQVbmb5N_sYGy5Tfj6PNdHSSJhXOeE';

// Acessamos a função global 'supabase.createClient' e atribuímos
// o cliente a uma nova variável com nome diferente ('sbClient') para evitar conflito.
const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
