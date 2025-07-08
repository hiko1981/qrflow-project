// view.js – QRFlow visningsmotor v1.2

// Forbind til Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient('https://https://kfoilmhcxhcfctrjungw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmb2lsbWhjeGhjZmN0cmp1bmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Nzg4MDAsImV4cCI6MjA2NzU1NDgwMH0.BN6klqpSaD4VhbelufB0r7VXaeV3kmfMLZhAgKxLaKg');

// Udtræk token fra URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const minisiteId = urlParams.get('id');

// Hent brugerrolle baseret på token
async function getUserRole(minisite) {
  const accessTokens = minisite.access_tokens || [];
  for (let access of accessTokens) {
    if (access.token === token) return access.role;
  }
  return null;
}

// Hent og vis minisite
async function loadMinisite() {
  if (!minisiteId || !token) {
    document.body.innerHTML = '<p>Mangler ID eller token.</p>';
    return;
  }

  const { data, error } = await supabase
    .from('minisites')
    .select('*')
    .eq('id', minisiteId)
    .single();

  if (error || !data) {
    document.body.innerHTML = '<p>Minisite ikke fundet.</p>';
    return;
  }

  const role = await getUserRole(data);
  if (!role) {
    document.body.innerHTML = '<p>Ingen adgang – ugyldig token.</p>';
    return;
  }

  const fields = data.fields || [];
  const container = document.getElementById('fields-container');
  container.innerHTML = '';

  fields.forEach(field => {
    if (
      field.visibility === 'public' ||
      role === 'admin' ||
      (role === 'editor' && field.visibility !== 'private')
    ) {
      const el = renderField(field);
      container.appendChild(el);
    }
  });
}

// Render felter
function renderField(field) {
  const wrapper = document.createElement('div');
  wrapper.className =
