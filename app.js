/**
 * app.js - Consulta de Comprador
 * Adaptado para a nova estrutura da planilha.
 */

// ===== ESTADO GLOBAL =====
let database = [];           
let isDataLoaded = false;    
let currentResults = [];     
const STORAGE_KEY = 'cluster_search_history';
const MAX_HISTORY = 5;

// ===== ELEMENTOS DO DOM =====
const els = {
    input: document.getElementById('productCodeInput'),
    searchBtn: document.getElementById('searchButton'),
    loading: document.getElementById('loadingState'),
    error: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryButton'),
    resultsSection: document.getElementById('resultsSection'),
    resultsGrid: document.getElementById('resultsGrid'),
    resultsCount: document.getElementById('resultsCount'),
    noResults: document.getElementById('noResults'),
    noResultsMessage: document.getElementById('noResultsMessage'),
    filterSection: document.getElementById('filterSection'),
    companyFilter: document.getElementById('companyFilter'),
    historyContainer: document.getElementById('historyContainer'),
    historyChips: document.getElementById('historyChips'),
    lastUpdate: document.getElementById('lastUpdate'),
    currentYear: document.getElementById('currentYear')
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    els.currentYear.textContent = new Date().getFullYear();

    els.searchBtn.addEventListener('click', handleSearch);
    els.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    els.retryBtn.addEventListener('click', loadDatabase);
    els.companyFilter.addEventListener('change', applyCompanyFilter);

    renderHistory();
    loadDatabase();
});

// ===== NORMALIZAÇÃO =====
function normalize(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function normalizeCode(code) {
    if (code === null || code === undefined) return '';
    const s = String(code).trim();
    return s.replace(/^0+/, '') || '0';
}

function displayStr(val) {
    if (val === null || val === undefined) return '—';
    const s = String(val).trim();
    return s === '' ? '—' : s;
}

// ===== CARREGAMENTO DO XLSX =====
async function loadDatabase() {
    showLoading();
    hideError();

    try {
        const response = await fetch('CLUSTER.xlsx', { cache: 'no-store' });

        if (!response.ok) {
            throw new Error(`Arquivo CLUSTER.xlsx não encontrado (HTTP ${response.status}).`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];

        let rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        
        // Limpa espaços extras nos nomes das colunas
        rawData = rawData.map(row => {
            const newRow = {};
            for (const key in row) {
                if (row.hasOwnProperty(key)) {
                    newRow[key.trim()] = row[key];
                }
            }
            return newRow;
        });

        if (!rawData || rawData.length === 0) {
            throw new Error('A planilha está vazia.');
        }

        // Mapeamento EXATO para as novas colunas
        database = rawData.map(row => ({
            codigoProduto: row['Código Produto'] ?? row['Codigo Produto'] ?? '',
            produto: row['Produto'] ?? '',
            empresa: row['EMPRESA'] ?? row['Empresa'] ?? '', // Aceita maiúsculo ou minúsculo
            tipo: row['TIPO'] ?? row['Tipo'] ?? '',
            categoria: row['CATEGORIA'] ?? row['Categoria'] ?? '',
            grupo: row['GRUPO'] ?? row['Grupo'] ?? '',
            comprador: row['COMPRADOR'] ?? row['Comprador'] ?? ''
        }));

        isDataLoaded = true;
        updateLastUpdateDate();
        hideLoading();
        els.input.focus();

    } catch (err) {
        console.error('Erro ao carregar base:', err);
        hideLoading();
        showError(err.message || 'Não foi possível carregar a base de dados.');
    }
}

function updateLastUpdateDate() {
    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    els.lastUpdate.textContent = `Base carregada em: ${formatted}`;
}

// ===== BUSCA =====
function handleSearch() {
    if (!isDataLoaded) {
        showError('A base de dados ainda não foi carregada.');
        return;
    }

    const rawCode = els.input.value.trim();
    if (!rawCode) {
        els.input.focus();
        return;
    }

    const searchCode = normalizeCode(rawCode);

    const results = database.filter(row => {
        return normalizeCode(row.codigoProduto) === searchCode;
    });

    saveHistory(rawCode);
    renderResults(results, rawCode);
}

// ===== RENDERIZAÇÃO DE RESULTADOS =====
function renderResults(results, searchedCode) {
    els.noResults.classList.add('hidden');
    els.resultsSection.classList.add('hidden');
    els.filterSection.classList.add('hidden');
    hideError();

    if (results.length === 0) {
        els.noResultsMessage.textContent = `Nenhum resultado encontrado para o código "${searchedCode}".`;
        els.noResults.classList.remove('hidden');
        currentResults = [];
        return;
    }

    currentResults = results;
    populateCompanyFilter(results);
    
    const count = results.length;
    els.resultsCount.textContent = `${count} resultado${count > 1 ? 's' : ''} encontrado${count > 1 ? 's' : ''}`;

    renderCards(results);

    els.resultsSection.classList.remove('hidden');
    els.filterSection.classList.remove('hidden');
    els.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCards(results) {
    els.resultsGrid.innerHTML = '';

    results.forEach(row => {
        const card = document.createElement('div');
        card.className = 'result-card';

        const empresaDisplay = displayStr(row.empresa);
        const codigoEmpresaDisplay = displayStr(row.codigoProduto);
        const produtoDisplay = displayStr(row.produto);
        const grupoDisplay = displayStr(row.grupo);
        const categoriaDisplay = displayStr(row.categoria);
        const tipoDisplay = displayStr(row.tipo);
        const compradorDisplay = displayStr(row.comprador);

        // Layout atualizado para a nova estrutura de dados
        card.innerHTML = `
            <div class="card-header">
                <div class="buyer-icon">
                    <i data-lucide="user"></i>
                </div>
                <div class="buyer-info">
                    <div class="label">Comprador Responsável</div>
                    <div class="buyer-name">${escapeHtml(compradorDisplay)}</div>
                </div>
            </div>

            <div class="highlight-box">
                <div class="highlight-label">
                    <i data-lucide="building-2"></i> Empresa
                </div>
                <div class="highlight-value">${escapeHtml(empresaDisplay)}</div>
            </div>

            <div class="highlight-box" style="border-left-color: #10b981;">
                <div class="highlight-label" style="color: #047857;">
                    <i data-lucide="package"></i> Produto (Cód: ${escapeHtml(codigoEmpresaDisplay)})
                </div>
                <div class="highlight-value">${escapeHtml(produtoDisplay)}</div>
            </div>

            <div class="badges-row">
                <span class="badge badge-tipo">${escapeHtml(tipoDisplay)}</span>
                <span class="badge badge-categoria">${escapeHtml(categoriaDisplay)}</span>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Grupo</span>
                    <span class="info-value">${escapeHtml(grupoDisplay)}</span>
                </div>
            </div>
        `;

        els.resultsGrid.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}

// ===== FILTRO POR EMPRESA =====
function populateCompanyFilter(results) {
    const empresasMap = new Map();

    results.forEach(row => {
        const key = normalize(row.empresa);
        if (!empresasMap.has(key)) {
            empresasMap.set(key, row.empresa);
        }
    });

    els.companyFilter.innerHTML = '<option value="">Todas as empresas</option>';

    const sorted = Array.from(empresasMap.values()).sort((a, b) =>
        String(a).localeCompare(String(b), 'pt-BR')
    );

    sorted.forEach(empresa => {
        const opt = document.createElement('option');
        opt.value = normalize(empresa);
        opt.textContent = displayStr(empresa);
        els.companyFilter.appendChild(opt);
    });
}

function applyCompanyFilter() {
    const filterVal = els.companyFilter.value;

    if (!filterVal) {
        renderCards(currentResults);
        updateCount(currentResults.length);
        return;
    }

    const filtered = currentResults.filter(row => {
        return normalize(row.empresa) === filterVal;
    });

    renderCards(filtered);
    updateCount(filtered.length);
}

function updateCount(n) {
    els.resultsCount.textContent = `${n} resultado${n > 1 ? 's' : ''} encontrado${n > 1 ? 's' : ''}`;
}

// ===== HISTÓRICO =====
function saveHistory(code) {
    let history = getHistory();
    history = history.filter(item => normalizeCode(item) !== normalizeCode(code));
    history.unshift(code);
    history = history.slice(0, MAX_HISTORY);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {}
    renderHistory();
}

function getHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function renderHistory() {
    const history = getHistory();
    if (history.length === 0) {
        els.historyContainer.classList.add('hidden');
        return;
    }

    els.historyChips.innerHTML = '';

    history.forEach(code => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.type = 'button';
        chip.innerHTML = `<i data-lucide="clock"></i> ${escapeHtml(code)}`;
        chip.addEventListener('click', () => {
            els.input.value = code;
            handleSearch();
        });
        els.historyChips.appendChild(chip);
    });

    els.historyContainer.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

// ===== ESTADOS DE UI =====
function showLoading() {
    els.loading.classList.remove('hidden');
    els.resultsSection.classList.add('hidden');
    els.noResults.classList.add('hidden');
    els.filterSection.classList.add('hidden');
}

function hideLoading() {
    els.loading.classList.add('hidden');
}

function showError(msg) {
    els.errorMessage.textContent = msg;
    els.error.classList.remove('hidden');
    els.loading.classList.add('hidden');
}

function hideError() {
    els.error.classList.add('hidden');
}

// ===== SEGURANÇA =====
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
