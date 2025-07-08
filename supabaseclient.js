// supabaseClient.js --- ALLERSIDSTE, KOMPLETTE VERSION

// Sørg for at dine Supabase URL og Key er indsat her
const SUPABASE_URL = 'https://kfoilmhcxhcfctrjungw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmb2lsbWhjeGhjZmN0cmp1bmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Nzg4MDAsImV4cCI6MjA2NzU1NDgwMH0.BN6klqpSaD4VhbelufB0r7VXaeV3kmfMLZhAgKxLaKg';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/**
 * Henter et minisite og den besøgendes rolle via en sikker RPC-funktion.
 */
async function getMinisiteByToken(token) {
    if (!token) {
        return { minisite: null, role: 'offentlig', error: { message: 'Ingen token angivet.' } };
    }
    const { data, error } = await supabaseClient.rpc('get_minisite_and_role', {
        token_to_check: token
    });
    if (error || !data) {
        console.error('Fejl ved hentning via RPC:', error);
        return { minisite: null, role: 'offentlig', error: error || { message: 'Token er ugyldig eller sitet findes ikke.' } };
    }
    return { minisite: data.minisite, role: data.role, error: null };
}


/**
 * Opdaterer data for et minisite via en sikker RPC-funktion. (RETTET)
 */
async function updateMinisite(adminToken, updatedData) {
    const { minisite: ms } = await getMinisiteByToken(adminToken);
    if (!ms) {
        return { data: null, error: { message: 'Ugyldig admin token.' } };
    }

    const { error } = await supabaseClient.rpc('update_minisite_data', {
        token_to_check: adminToken,
        id_to_update: ms.id,
        new_fields: updatedData.fields,
        new_storage_bytes: updatedData.storage_used_bytes
    });

    if (error) {
        console.error('Fejl ved opdatering via RPC:', error);
        // Vis fejlen direkte til brugeren for bedre feedback
        const userFriendlyError = error.message.includes('Ugyldig admin-token') 
            ? 'Fejl: Din token er ugyldig.' 
            : `Fejl ved lagring: ${error.message}`;
        alert(userFriendlyError);
    }

    return { data: !error, error };
}


/**
 * Uploader en fil til Supabase Storage.
 */
async function uploadFile(adminToken, file) {
    const { minisite } = await getMinisiteByToken(adminToken);
    if (!minisite) {
        return { data: null, error: { message: 'Ugyldig admin token for upload.' } };
    }
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${minisite.id}/${fileName}`;

    const { data, error } = await supabaseClient.storage
        .from('uploads')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
        });
    
    if (error) {
        console.error('Fejl under upload:', error);
        alert(`Upload fejlede: ${error.message}`);
        return { publicUrl: null, error };
    }

    const { data: { publicUrl } } = supabaseClient.storage.from('uploads').getPublicUrl(filePath);
    
    // VIGTIGT: Opdater både lagerforbrug OG de eksisterende felter i ét kald.
    const currentFields = minisite.fields || [];
    const newSize = minisite.storage_used_bytes + file.size;
    await updateMinisite(adminToken, { fields: currentFields, storage_used_bytes: newSize });
    
    return { publicUrl, error: null };
}