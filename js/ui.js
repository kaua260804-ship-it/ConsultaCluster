// js/ui.js

function showLoading() { DOM.loading.classList.remove('hidden'); DOM.resultsSection.classList.add('hidden'); DOM.noResults.classList.add('hidden'); DOM.filterSection.classList.add('hidden'); }
function hideLoading() { DOM.loading.classList.add('hidden'); }
function showError(msg) { DOM.errorMessage.textContent = msg; DOM.error.classList.remove('hidden'); DOM.loading.classList.add('hidden'); }
function hideError() { DOM.error.classList.add('hidden'); }
function updateLastUpdateDate() { DOM.lastUpdate.textContent = `Base carregada em: ${new Date().toLocaleDateString('pt-BR')}`; }
function showModalMessage(msg, type) { DOM.modalMessage.textContent = msg; DOM.modalMessage.className = `modal-message ${type}`; DOM.modalMessage.classList.remove('hidden'); }

function renderResults(results, searchedCode) {
    DOM.noResults.classList.add('hidden');
    DOM.resultsSection.classList.add('hidden');
    hideError();

    if (results.length === 0) {
        DOM.noResultsMessage.textContent = `Nenhum resultado encontrado para o código "${searchedCode}".`;
        DOM.noResults.classList.remove('hidden');
        AppState.currentResults = [];
        return;
    }

    AppState.currentResults = results;
    populateCompanyFilter(results);
    DOM.resultsCount.textContent = `${results.length} resultado${results.length > 1 ? 's' : ''} encontrado${results.length > 1 ? 's' : ''}`;
    renderCards(results);
    DOM.resultsSection.classList.remove('hidden');
    DOM.filterSection.classList.remove('hidden');
    DOM.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCards(results) {
    DOM.resultsGrid.innerHTML = '';
    results.forEach((row) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="buyer-icon"><i data-lucide="user"></i></div>
                <div class="buyer-info">
                    <div class="label">Comprador Responsável</div>
                    <div class="buyer-name">${escapeHtml(displayStr(row.comprador))}</div>
                </div>
            </div>
            <div class="highlight-box">
                <div class="highlight-label"><i data-lucide="building-2"></i> Empresa</div>
                <div class="highlight-value">${escapeHtml(displayStr(row.empresa))}</div>
            </div>
            <div class="highlight-box" style="border-left-color: #10b981;">
                <div class="highlight-label" style="color: #047857;"><i data-lucide="package"></i> Produto (Cód: ${escapeHtml(row.codigoProduto)})</div>
                <div class="highlight-value">${escapeHtml(displayStr(row.produto))}</div>
            </div>
            <div class="badges-row">
                <span class="badge badge-tipo">${escapeHtml(displayStr(row.tipo))}</span>
                <span class="badge badge-categoria">${escapeHtml(displayStr(row.categoria))}</span>
            </div>
            <div class="info-grid">
                <div class="info-item"><span class="info-label">Grupo</span><span class="info-value">${escapeHtml(displayStr(row.grupo))}</span></div>
                <div class="info-item"><span class="info-label">Subgrupo</span><span class="info-value">${escapeHtml(displayStr(row.subgrupo))}</span></div>
            </div>
        `;
        DOM.resultsGrid.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
}

function populateCompanyFilter(results) {
    const map = new Map();
    results.forEach(r => map.set(normalize(r.empresa), r.empresa));
   
