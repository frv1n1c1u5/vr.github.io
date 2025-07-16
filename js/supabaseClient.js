// Arquivo: js/supabaseClient.js

// =================================================================================
//   INSTRUÇÕES:
//   1. Cole a URL do seu projeto Supabase onde está escrito 'https://jnpgojziezpvozelaieb.supabase.co'.
//   2. Cole a sua chave 'anon' (a longa que começa com "eyJ") onde está 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpucGdvanppZXpwdm96ZWxhaWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODcyMDAsImV4cCI6MjA2ODI2MzIwMH0.YYhvopnYgzJDQeOQcxYYc1gWCoOCVlYy97AXYqv2Hww'.
// =================================================================================

const SUPABASE_URL = 'https://jnpgojziezpvozelaieb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpucGdvanppZXpwdm96ZWxhaWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2ODcyMDAsImV4cCI6MjA2ODI2MzIwMH0.YYhvopnYgzJDQeOQcxYYc1gWCoOCVlYy97AXYqv2Hww';

// Verificação para garantir que as chaves foram inseridas
if (!SUPABASE_URL || SUPABASE_URL === 'COLE_SUA_URL_SUPABASE_AQUI') {
    alert('ERRO: A URL do Supabase não foi definida no arquivo js/supabaseClient.js');
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'COLE_SUA_CHAVE_ANON_AQUI') {
    alert('ERRO: A chave ANON do Supabase não foi definida no arquivo js/supabaseClient.js');
}

// Inicializa e exporta o cliente Supabase para ser usado em outras partes do site
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
