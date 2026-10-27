// js/ui.js

function showLoading() {
    DOM.loading.classList.remove('hidden');
    DOM.resultsSection.classList.add('hidden');
    DOM.noResults.classList.add('hidden');
    DOM.filterSection.classList.add('hidden');
}

function hideLoading() { DOM.loading.classList.add('hidden'); }

function showError(msg) {
    DOM.errorMessage.textContent = msg;
    DOM.error.classList.remove('hidden');
    DOM.loading.classList.add('hidden');
}

function hideError() { DOM.error.classList.add('hidden'); }

function updateLastUpdateDate() {
    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    DOM.lastUpdate.textContent = `Base carregada em: ${formatted}`;
}

function showModalMessage(msg, type) {
    DOM.modalMessage.textContent = msg;
    DOM.modalMessage.className = `modal-message ${type}`;
    DOM.modalMessage.classList.remove('hidden');
}

// --- RENDERIZAÇÃO DOS CARDS ---
function renderResults(results, searchedCode) {
    DOM.noResults.classList.add('hidden');
    DOM.resultsSection.classList.add('hidden');
    DOM.filterSection.classList.add('hidden');
    hideError();

    if (results.length === 0) {
        DOM.noResultsMessage.textContent = `Nenhum resultado encontrado para o código "${searchedCode}".`;
        DOM.noResults.classList.remove('hidden');
        AppState.currentResults = [];
        return;
    }

    AppState.currentResults = results;
    populateCompanyFilter(results);
    
    const count = results.length;
    DOM.resultsCount.textContent = `${count} resultado${count > 1 ? 's' : ''} encontrado${count > 1 ? 's' : ''}`;

    renderCards(results);
    DOM.resultsSection.classList.remove('hidden');
    DOM.filterSection.classList.remove('hidden');
    DOM.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCards(results) {
    DOM.resultsGrid.innerHTML = '';

    results.forEach((row, index) => {
        const card = document.createElement('div');
        card.className = 'result-card';

        // O botão "Adicionar" fica isolado dentro do card
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
                <div class="highlight-label" style="color: #047857;">
                    <i data-lucide="package"></i> Produto (Cód: ${escapeHtml(row.codigoProduto)})
                </div>
                <div class="highlight-value">${escapeHtml(displayStr(row.produto))}</div>
            </div>
            <div class="badges-row">
                <span class="badge badge-tipo">${escapeHtml(displayStr(row.tipo))}</span>
                <span class="badge badge-categoria">${escapeHtml(displayStr(row.categoria))}</span>
            </div>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Grupo</span>
                    <span class="info-value">${escapeHtml(displayStr(row.grupo))}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Subgrupo</span>
                    <span class="info-value ${row.subgrupo ? '' : 'muted'}">${escapeHtml(displayStr(row.subgrupo))}</span>
                </div>
            </div>
            <!-- Botão Isolado -->
            <button class="btn-add-cluster" data-index="${index}">
                <i data-lucide="plus-circle"></i> Adicionar ao Cluster
            </button>
        `;

        DOM.resultsGrid.appendChild(card);
    });

    // Adiciona o evento de clique no botão recém-criado
    document.querySelectorAll('.btn-add-cluster').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.currentTarget.getAttribute('data-index');
            openModal(results[idx]);
        });
    });

    if (window.lucide) lucide.createIcons();
}

// --- FILTRO ---
function populateCompanyFilter(results) {
    const empresasMap = new Map();
    results.forEach(row => {
        const key = normalize(row.empresa);
        if (!empresasMap.has(key)) empresasMap.set(key, row.empresa);
    });

    DOM.companyFilter.innerHTML = '<option value="">Todas as empresas</option>';
    Array.from(empresasMap.values()).sort().forEach(emp => {
        const opt = document.createElement('option');
        opt.value = normalize(emp);
        opt.textContent = displayStr(emp);
        DOM.companyFilter.appendChild(opt);
    });
}

function applyCompanyFilter() {
    const filterVal = DOM.companyFilter.value;
    if (!filterVal) {
        renderCards(AppState.currentResults);
        updateCount(AppState.currentResults.length);
        return;
    }
    const filtered = AppState.currentResults.filter(row => normalize(row.empresa) === filterVal);
    renderCards(filtered);
    updateCount(filtered.length);
}

function updateCount(n) {
    DOM.resultsCount.textContent = `${n} resultado${n > 1 ? 's' : ''} encontrado${n > 1 ? 's' : ''}`;
}

// --- HISTÓRICO (Visual Corrigido) ---
function saveHistory(code) {
    let history = getHistory();
    history = history.filter(item => normalizeCode(item) !== normalizeCode(code));
    history.unshift(code);
    history = history.slice(0, AppState.MAX_HISTORY);
    try { localStorage.setItem(AppState.STORAGE_KEY, JSON.stringify(history)); } catch (e) {}
    renderHistory();
}

function getHistory() {
    try {
        const raw = localStorage.getItem(AppState.STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function renderHistory() {
    const history = getHistory();
    if (history.length === 0) return DOM.historyContainer.classList.add('hidden');

    DOM.historyChips.innerHTML = '';
    history.forEach(code => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.type = 'button';
        // Ícone de relógio e texto formatado
        chip.innerHTML = `<i data-lucide="clock"></i> <span>${escapeHtml(code)}</span>`;
        chip.addEventListener('click', () => {
            DOM.input.value = code;
            handleSearch();
        });
        DOM.historyChips.appendChild(chip);
    });
    DOM.historyContainer.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

// --- MODAL ---
function populateModalSelects() {
    DOM.modalTipo.innerHTML = '<option value="">Selecione...</option>';
    DOM.modalAutorizacao.innerHTML = '<option value="">Selecione...</option>';
    
    TIPOS_DISPONIVEIS.forEach(tipo => {
        const opt = document.createElement('option');
        opt.value = tipo;
        opt.textContent = tipo;
        DOM.modalTipo.appendChild(opt);
    });

    AUTORIZACOES_DISPONIVEIS.forEach(auth => {
        const opt = document.createElement('option');
        opt.value = auth;
        opt.textContent = auth;
        DOM.modalAutorizacao.appendChild(opt);
    });
}

function openModal(productData) {
    AppState.currentProductToCluster = productData;
    DOM.modalProductName.textContent = `${productData.codigoProduto} - ${productData.produto}`;
    DOM.modalTipo.value = "";
    DOM.modalAutorizacao.value = "";
    DOM.modalMessage.classList.add('hidden');
    DOM.modal.classList.remove('hidden');
}

function closeModal() {
    DOM.modal.classList.add('hidden');
    AppState.currentProductToCluster = null;
}
