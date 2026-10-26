/**
 * app.js - Consulta de Comprador
 * Lógica principal: carregamento do XLSX, busca, filtro e renderização.
 */

// ===== ESTADO GLOBAL =====
let database = [];           // Array com todos os registros parseados
let isDataLoaded = false;    // Flag de controle
let currentResults = [];     // Resultados da busca atual
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
    // Ícones
    if (window.lucide) lucide.createIcons();

    // Ano no footer
    els.currentYear.textContent = new Date().getFullYear();

    // Eventos
    els.searchBtn.addEventListener('click', handleSearch);
    els.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    els.retryBtn.addEventListener('click', loadDatabase);
    els.companyFilter.addEventListener('change', applyCompanyFilter);

    // Carrega histórico
    renderHistory();

    // Carrega base
    loadDatabase();
});

// ===== NORMALIZAÇÃO =====
/**
 * Normaliza strings para comparação:
 * - trim
 * - minúsculas
 * - remove acentos
 */
function normalize(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza código de produto removendo zeros à esquerda.
 * Ex: "024553" -> "24553"
 */
function normalizeCode(code) {
    if (code === null || code === undefined) return '';
    const s = String(code).trim();
    // Remove zeros à esquerda, mas mantém pelo menos um dígito
    return s.replace(/^0+/, '') || '0';
}

/**
 * Formata string para exibição (trim, sem alterar caixa).
 */
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
            throw new Error(`Arquivo CLUSTER.xlsx não encontrado (HTTP ${response.status}). Verifique se o arquivo está na raiz do repositório.`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // Pega a primeira aba
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];

        // Converte para JSON
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rawData || rawData.length === 0) {
            throw new Error('A planilha está vazia ou não contém dados válidos.');
        }

        // Mapeia colunas para chaves internas (com fallback para variações)
        database = rawData.map(row => ({
            codigoEmpresa: row['Código Empresa'] ?? row['Codigo Empresa'] ?? '',
            empresa: row['Empresa'] ?? '',
            produto: row['Produto'] ?? '',
            codigoProduto: row['Código Produto'] ?? row['Codigo Produto'] ?? '',
            preco: row['Preço Vda Unitário'] ?? row['Preco Vda Unitario'] ?? '',
            categoria: row['CATEGORIA'] ?? '',
            grupo: row['GRUPO'] ?? '',
            subgrupo: row['SUBGRUPO'] ?? '',
            cadGrupo: row['CAD GRUPO'] ?? '',
            statusVenda: row['STATUS DE VENDA'] ?? '',
            cadLojas: row['CAD LOJAS'] ?? '',
            tipo: row['TIPO'] ?? '',
            comprador: row['COMPRADOR'] ?? ''
        }));

        isDataLoaded = true;

        // Data de atualização (do arquivo)
        updateLastUpdateDate();

        hideLoading();
        els.input.focus();

    } catch (err) {
        console.error('Erro ao carregar base:', err);
        hideLoading();
        showError(err.message || 'Não foi possível carregar a base de dados. Verifique se o arquivo CLUSTER.xlsx está na raiz do repositório.');
    }
}

/**
 * Atualiza a data de última atualização no footer.
 * Usa a data atual do carregamento como referência.
 */
function updateLastUpdateDate() {
    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    els.lastUpdate.textContent = `Base carregada em: ${formatted}`;
}

// ===== BUSCA =====
function handleSearch() {
    if (!isDataLoaded) {
        showError('A base de dados ainda não foi carregada. Aguarde ou clique em "Tentar novamente".');
        return;
    }

    const rawCode = els.input.value.trim();

    if (!rawCode) {
        els.input.focus();
        return;
    }

    const searchCode = normalizeCode(rawCode);

    // Filtra todos os registros com código correspondente
    const results = database.filter(row => {
        return normalizeCode(row.codigoProduto) === searchCode;
    });

    // Salva no histórico
    saveHistory(rawCode);

    // Exibe resultados
    renderResults(results, rawCode);
}

// ===== RENDERIZAÇÃO DE RESULTADOS =====
function renderResults(results, searchedCode) {
    // Esconde estados anteriores
    els.noResults.classList.add('hidden');
    els.resultsSection.classList.add('hidden');
    els.filterSection.classList.add('hidden');

    // Remove erro de busca anterior, se houver
    hideError();

    if (results.length === 0) {
        els.noResultsMessage.textContent = `Nenhum resultado encontrado para o código "${searchedCode}". Verifique se o código está correto.`;
        els.noResults.classList.remove('hidden');
        currentResults = [];
        return;
    }

    // Armazena resultados atuais
    currentResults = results;

    // Popula filtro de empresa
    populateCompanyFilter(results);

    // Atualiza contador
    const count = results.length;
    els.resultsCount.textContent = `${count} resultado${count > 1 ? 's' : ''} encontrado${count > 1 ? 's' : ''}`;

    // Renderiza cards
    renderCards(results);

    // Mostra seção
    els.resultsSection.classList.remove('hidden');
    els.filterSection.classList.remove('hidden');

    // Scroll suave para resultados
    els.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCards(results) {
    els.resultsGrid.innerHTML = '';

    results.forEach(row => {
        const card = document.createElement('div');
        card.className = 'result-card';

        const tipoBadgeClass = 'badge badge-tipo';
        const categoriaBadgeClass = 'badge badge-categoria';

        const empresaDisplay = displayStr(row.empresa);
        const codigoEmpresaDisplay = displayStr(row.codigoEmpresa);
        const produtoDisplay = displayStr(row.produto);
        const subgrupoDisplay = displayStr(row.subgrupo);
        const grupoDisplay = displayStr(row.grupo);
        const categoriaDisplay = displayStr(row.categoria);
        const tipoDisplay = displayStr(row.tipo);
        const compradorDisplay = displayStr(row.comprador);

        card.innerHTML = `
            <div class="card-header">
                <div class="buyer-icon">
                    <i data-lucide="user"></i>
                </div>
                <div class="buyer-info">
                    <div class="label">Comprador</div>
                    <div class="buyer-name">${escapeHtml(compradorDisplay)}</div>
                </div>
            </div>

            <div class="badges-row">
                <span class="${tipoBadgeClass}">${escapeHtml(tipoDisplay)}</span>
                <span class="${categoriaBadgeClass}">${escapeHtml(categoriaDisplay)}</span>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Grupo</span>
                    <span class="info-value">${escapeHtml(grupoDisplay)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Subgrupo</span>
                    <span class="info-value ${subgrupoDisplay === '—' ? 'muted' : ''}">${escapeHtml(subgrupoDisplay)}</span>
                </div>
                <div class="info-item full-width">
                    <span class="info-label">Empresa</span>
                    <span class="company-tag">
                        <i data-lucide="building-2"></i>
                        ${escapeHtml(empresaDisplay)}
                        <span class="company-code">#${escapeHtml(codigoEmpresaDisplay)}</span>
                    </span>
                </div>
            </div>

            <div class="product-box">
                <div class="product-label">Produto</div>
                <div class="product-name">${escapeHtml(produtoDisplay)}</div>
            </div>
        `;

        els.resultsGrid.appendChild(card);
    });

    // Recria ícones
    if (window.lucide) lucide.createIcons();
}

// ===== FILTRO POR EMPRESA =====
function populateCompanyFilter(results) {
    // Coleta empresas únicas
    const empresasMap = new Map();

    results.forEach(row => {
        const key = normalize(row.empresa) + '|' + normalize(row.codigoEmpresa);
        if (!empresasMap.has(key)) {
            empresasMap.set(key, {
                empresa: row.empresa,
                codigo: row.codigoEmpresa
            });
        }
    });

    // Limpa select
    els.companyFilter.innerHTML = '<option value="">Todas as empresas</option>';

    // Ordena alfabeticamente
    const sorted = Array.from(empresasMap.values()).sort((a, b) =>
        String(a.empresa).localeCompare(String(b.empresa), 'pt-BR')
    );

    sorted.forEach(item => {
        const opt = document.createElement('option');
        opt.value = `${normalize(item.empresa)}|${normalize(item.codigo)}`;
        opt.textContent = `${displayStr(item.empresa)} (#${displayStr(item.codigo)})`;
        els.companyFilter.appendChild(opt);
    });
}

function applyCompanyFilter() {
    const filterVal = els.companyFilter.value;

    if (!filterVal) {
        // Mostra todos
        renderCards(currentResults);
        updateCount(currentResults.length);
        return;
    }

    const [empresaNorm, codigoNorm] = filterVal.split('|');

    const filtered = currentResults.filter(row => {
        return normalize(row.empresa) === empresaNorm &&
               normalize(row.codigoEmpresa) === codigoNorm;
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

    // Remove duplicatas (case-insensitive)
    history = history.filter(item => normalizeCode(item) !== normalizeCode(code));

    // Adiciona no início
    history.unshift(code);

    // Limita
    history = history.slice(0, MAX_HISTORY);

    // Salva
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        // localStorage indisponível (modo privado)
    }

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

    // Recria ícones
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
/**
 * Escapa HTML para evitar injeção.
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}