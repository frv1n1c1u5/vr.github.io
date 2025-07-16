// Arquivo: js/supabaseClient.js
// VERSÃO FINAL COM O PAR DE URL E CHAVE 100% CORRETO

const SUPABASE_URL = 'https://jnpgajezpvozelaieb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpucGdvamplenB2b3plbGFpZWIiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyMTE1OTY5MywiZXhwIjoyMDM2NzM1NjkzfQ.B53v0N8g1rQGZcZ1eX3r9y8v7o5Y5e5i7I4t8l2k4p4';

// Acessamos a função global 'supabase.createClient' e atribuímos
// o cliente a uma nova variável com nome diferente ('sbClient') para evitar conflito.
const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
