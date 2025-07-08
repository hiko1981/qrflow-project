document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const adminToken = params.get('token');
    const loader = document.getElementById('loader');
    const authErrorEl = document.getElementById('auth-error');
    const editorPanel = document.getElementById('editor-panel');
    const fieldsList = document.getElementById('fields-list');
    const addFieldBtn = document.getElementById('add-field-btn');
    const saveAllBtn = document.getElementById('save-all-btn');
    const statusIndicator = document.getElementById('status-indicator');
    const storageUsageEl = document.getElementById('storage-usage');
    let state = { minisite: null, fields: [], isSaving: false };

    async function init() {
        if (!adminToken) { return showAuthError('Ingen admin-token angivet i URL. Adgang nægtet.'); }
        const { minisite, role, error } = await getMinisiteByToken(adminToken);
        if (error || role !== 'admin') { return showAuthError('Ugyldig token eller manglende admin-rettigheder.'); }
        state.minisite = minisite;
        state.fields = JSON.parse(JSON.stringify(minisite.fields || []));
        loader.style.display = 'none';
        editorPanel.style.display = 'block';
        updateStorageUsage();
        render();
    }

    function render() {
        fieldsList.innerHTML = '';
        state.fields.forEach((field, index) => {
            const fieldEl = document.createElement('div');
            fieldEl.className = 'field-editor';
            fieldEl.dataset.index = index;
            fieldEl.innerHTML = createFieldHtml(field);
            fieldsList.appendChild(fieldEl);
        });
        attachEventListeners();
    }

    function createFieldHtml(field) {
        const roles = ['offentlig', 'bruger', 'traener', 'tekniker', 'admin'];
        const types = ['text', 'image', 'video', 'document'];
        const roleOpts = roles.map(r => `<option value="${r}" ${field.role === r ? 'selected' : ''}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('');
        const typeOpts = types.map(t => `<option value="${t}" ${field.type === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('');
        let contentInput = ['image', 'video', 'document'].includes(field.type)
            ? `<input type="text" class="content-input" value="${field.content || ''}" placeholder="Fil-URL vises her" readonly><input type="file" class="file-input"><small class="upload-status"></small>`
            : `<textarea class="content-input" rows="4">${field.content || ''}</textarea>`;
        return `<label>Felt Titel:</label><input type="text" class="title-input" value="${field.title || ''}"><div class="field-controls"><div class="role-select"><label>Type:</label><select class="type-select">${typeOpts}</select></div><div class="role-select"><label>Adgangsrolle:</label><select class="role-select">${roleOpts}</select></div></div><label>Indhold:</label>${contentInput}<button class="delete-btn">Slet Felt</button>`;
    }

    function attachEventListeners() {
        document.querySelectorAll('.field-editor').forEach((el, index) => {
            el.querySelector('.title-input').addEventListener('input', (e) => state.fields[index].title = e.target.value);
            el.querySelector('.role-select').addEventListener('change', (e) => state.fields[index].role = e.target.value);
            el.querySelector('.type-select').addEventListener('change', (e) => {
                state.fields[index].type = e.target.value;
                state.fields[index].content = '';
                render();
            });
            const contentInput = el.querySelector('.content-input');
            if (contentInput.tagName === 'TEXTAREA') {
                contentInput.addEventListener('input', (e) => state.fields[index].content = e.target.value);
            }
            el.querySelector('.delete-btn').addEventListener('click', () => {
                if (confirm('Sikker på du vil slette feltet?')) { state.fields.splice(index, 1); render(); }
            });
            const fileInput = el.querySelector('.file-input');
            if (fileInput) { fileInput.addEventListener('change', (e) => handleFileUpload(e, index)); }
        });
    }

    async function handleFileUpload(event, index) {
        const file = event.target.files[0];
        if (!file) return;
        const statusEl = event.target.closest('.field-editor').querySelector('.upload-status');
        statusEl.textContent = 'Uploader...';
        try {
            const { publicUrl, error } = await uploadFile(adminToken, file);
            if (error) throw error;
            state.fields[index].content = publicUrl;
            state.minisite.storage_used_bytes += file.size;
            statusEl.textContent = 'Upload fuldført!';
            updateStorageUsage();
            render();
        } catch (err) { statusEl.textContent = `Fejl: ${err.message}`; }
    }

    addFieldBtn.addEventListener('click', () => {
        state.fields.push({ id: `new_${Date.now()}`, title: 'Nyt Felt', type: 'text', role: 'offentlig', content: '' });
        render();
    });

    saveAllBtn.addEventListener('click', async () => {
        if (state.isSaving) return;
        state.isSaving = true;
        showStatus('Gemmer...', 'saving');
        const finalFields = state.fields.map((f, i) => ({ ...f, id: f.id.startsWith('new_') ? `f_${Date.now()}_${i}` : f.id }));
        const { error } = await updateMinisite(adminToken, { fields: finalFields });
        if (error) { showStatus(`Fejl: ${error.message}`, 'error'); } 
        else { showStatus('Ændringer gemt!', 'success'); state.fields = finalFields; }
        state.isSaving = false;
    });

    function showAuthError(message) { loader.style.display = 'none'; authErrorEl.textContent = message; authErrorEl.style.display = 'block'; }
    function showStatus(message, type) { statusIndicator.textContent = message; statusIndicator.className = `status-${type}`; setTimeout(() => statusIndicator.className = '', 3000); }
    function updateStorageUsage() { storageUsageEl.textContent = `${(state.minisite.storage_used_bytes / (1024 * 1024)).toFixed(2)} MB`; }
    init();
});