// Arquivo: js/supabaseClient.js
// VERSÃO FINAL E CORRIGIDA

const SUPABASE_URL = 'https://rgchiodtvblkcjclrchli.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnY2hpb2R0dmJsa2NjaXJjaGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0OTY5MDMsImV4cCI6MjAzNzA3MjkwM30.L8vjS2yYcQ8aN-9C5DkC-q0g_O1fQ9gW1vD5E6Z2b1Y';

// CORREÇÃO: Acessamos a função global 'supabase.createClient' e atribuímos
// o cliente a uma nova variável com nome diferente ('sbClient') para evitar conflito.
const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
