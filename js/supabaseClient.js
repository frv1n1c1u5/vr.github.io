// Arquivo: js/supabaseClient.js
// VERSÃO CORRIGIDA E FINAL

const SUPABASE_URL = 'https://rgchiodtvblkcjclrchli.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnY2hpb2R0dmJsa2NjaXJjaGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE0OTY5MDMsImV4cCI6MjAzNzA3MjkwM30.L8vjS2yYcQ8aN-9C5DkC-q0g_O1fQ9gW1vD5E6Z2b1Y';

// Inicializa o cliente Supabase para ser usado em outras partes do site
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
