document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const fieldsContainer = document.getElementById('fields-container');
    const titleElement = document.getElementById('minisite-title');
    const roleHierarchy = { 'offentlig': 0, 'bruger': 1, 'traener': 2, 'tekniker': 3, 'admin': 4 };

    try {
        const { minisite, role, error } = await getMinisiteByToken(token);
        loader.style.display = 'none';
        if (error || !minisite) {
            throw new Error(error?.message || 'Kunne ikke finde minisite. Er din token korrekt?');
        }
        titleElement.textContent = minisite.title || 'QRFlow Side';
        document.title = minisite.title || 'QRFlow Side';
        const userAccessLevel = roleHierarchy[role];
        const visibleFields = minisite.fields.filter(field => roleHierarchy[field.role] <= userAccessLevel);
        if (visibleFields.length === 0) {
            fieldsContainer.innerHTML = '<p>Der er intet indhold at vise for din adgangsrolle.</p>';
            return;
        }
        renderFields(visibleFields);
    } catch (e) {
        loader.style.display = 'none';
        errorMessage.textContent = `Fejl: ${e.message}`;
        errorMessage.style.display = 'block';
        console.error(e);
    }

    function renderFields(fields) {
        fieldsContainer.innerHTML = '';
        fields.forEach(field => {
            const fieldEl = document.createElement('div');
            fieldEl.className = 'field';
            let contentHtml = '';
            const safeContent = (field.content || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            switch (field.type) {
                case 'image': contentHtml = `<img src="${safeContent}" alt="${field.title}">`; break;
                case 'video': contentHtml = `<video controls src="${safeContent}"></video>`; break;
                case 'document': contentHtml = `<a href="${safeContent}" target="_blank" rel="noopener noreferrer">Download ${field.title}</a>`; break;
                default: contentHtml = `<p>${safeContent.replace(/\n/g, '<br>')}</p>`; break;
            }
            fieldEl.innerHTML = `<h3>${field.title}</h3><div class="field-content">${contentHtml}</div>`;
            fieldsContainer.appendChild(fieldEl);
        });
    }
});