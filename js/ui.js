// js/ui.js

function showLoading() { 
    DOM.loading.classList.remove('hidden'); 
    DOM.resultsSection.classList.add('hidden'); 
    DOM.noResults.classList.add('hidden'); 
    DOM.filterSection.classList.add('hidden'); 
}

function hideLoading() { 
    DOM.loading.classList.add('hidden'); 
}

function showError(msg) { 
    DOM.errorMessage.textContent = msg; 
    DOM.error.classList.remove('hidden'); 
    DOM.loading.classList.add('hidden'); 
}

function hideError() { 
    DOM.error.classList.add('hidden'); 
}

function updateLastUpdateDate() { 
    DOM.lastUpdate.textContent = `Base carregada em: ${new Date().toLocaleDateString('pt-BR')}`; 
}

function showModalMessage(msg, type) {
    DOM.modalMessage.textContent = msg;
    DOM.modalMessage.className = `modal-message ${type}`;
    DOM.modalMessage.classList.remove('hidden');
}

// FUNÇÃO: Notificação flutuante (Toast)
function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-circle';

    toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    // Remove após 3.5 segundos
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

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
    
    // O contador agora reflete quantos CARDS (Tipos) foram encontrados
    DOM.resultsCount.textContent = `${results.length} tipo${results.length > 1 ? 's' : ''} de cluster encontrado${results.length > 1 ? 's' : ''}`;
    
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
        
        // Junta as empresas com uma vírgula para exibir na tela
        const empresasFormatadas = row.empresas.join(', ');

        card.innerHTML = `
            <div class="card-header">
                <div class="buyer-icon"><i data-lucide="user"></i></div>
                <div class="buyer-info">
                    <div class="label">Comprador Responsável</div>
                    <div class="buyer-name">${escapeHtml(displayStr(row.comprador))}</div>
                </div>
            </div>
            <div class="highlight-box">
                <div class="highlight-label"><i data-lucide="building-2"></i> Empresas (${row.empresas.length})</div>
                <div class="highlight-value" style="font-size: 1rem; line-height: 1.5;">${escapeHtml(empresasFormatadas)}</div>
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
    // Como agora o resultado é agrupado por TIPO, precisamos iterar sobre as empresas dentro de cada tipo
    results.forEach(r => {
        r.empresas.forEach(emp => {
            map.set(normalize(emp), emp);
        });
    });
    
    DOM.companyFilter.innerHTML = '<option value="">Todas as empresas</option>';
    Array.from(map.values()).sort().forEach(emp => {
        const opt = document.createElement('option'); 
        opt.value = normalize(emp); 
        opt.textContent = displayStr(emp);
        DOM.companyFilter.appendChild(opt);
    });
}

function applyCompanyFilter() {
    const val = DOM.companyFilter.value;
    
    if (!val) {
        renderCards(AppState.currentResults);
        DOM.resultsCount.textContent = `${AppState.currentResults.length} tipo${AppState.currentResults.length > 1 ? 's' : ''} de cluster encontrado${AppState.currentResults.length > 1 ? 's' : ''}`;
        return;
    }
    
    // Filtra os agrupamentos que contêm a empresa selecionada
    const filtered = AppState.currentResults.filter(r => 
        r.empresas.some(emp => normalize(emp) === val)
    );
    
    renderCards(filtered);
    DOM.resultsCount.textContent = `${filtered.length} tipo${filtered.length > 1 ? 's' : ''} de cluster encontrado${filtered.length > 1 ? 's' : ''}`;
}

function saveHistory(code) {
    let h = getHistory();
    h = h.filter(i => normalizeCode(i) !== normalizeCode(code));
    h.unshift(code);
    h = h.slice(0, AppState.MAX_HISTORY);
    try { localStorage.setItem(AppState.STORAGE_KEY, JSON.stringify(h)); } catch(e) {}
    renderHistory();
}

function getHistory() { 
    try { 
        return JSON.parse(localStorage.getItem(AppState.STORAGE_KEY)) || []; 
    } catch(e) { 
        return []; 
    } 
}

function renderHistory() {
    const h = getHistory();
    if (!h.length) { 
        DOM.historyContainer.classList.add('hidden'); 
        return; 
    }
    
    DOM.historyChips.innerHTML = '';
    h.forEach(code => {
        const chip = document.createElement('button'); 
        chip.className = 'chip'; 
        chip.type = 'button';
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

function openModal() {
    DOM.modalCodigoProduto.value = "";
    DOM.modalNomeProduto.value = "";
    DOM.modalTipoOriginal.value = "";
    DOM.modalTipo.value = "";
    DOM.modalAutorizacao.value = "";
    DOM.modalMessage.classList.add('hidden');
    DOM.modal.classList.remove('hidden');
    DOM.modalCodigoProduto.focus();
}

function closeModal() { 
    DOM.modal.classList.add('hidden'); 
}

function preencherDadosModal(codigo) {
    const { nomeProduto, tipoOriginal } = obterDetalhesProdutoModal(codigo);
    DOM.modalNomeProduto.value = nomeProduto;
    DOM.modalTipoOriginal.value = tipoOriginal;
}
