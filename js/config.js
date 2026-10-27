// js/config.js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzHGiTKqODW3L4IUeRr4Re-CRwA0uohhseMfYYS41POLMxS4eBz_x2gTiXf2hSRd87O/exec';

const TIPOS_DISPONIVEIS = ["EMPORIO G", "EMPORIO M", "EMPORIO P", "MERCEARIA M", "MERCEARIA P"];
const AUTORIZACOES_DISPONIVEIS = ["CRISTIANE", "COMPRADOR", "RENATO", "PHILLIPP", "LOJA"];

const AppState = {
    database: [],
    isDataLoaded: false,
    currentResults: [],
    STORAGE_KEY: 'cluster_search_history',
    MAX_HISTORY: 5
};

const DOM = {
    input: document.getElementById('productCodeInput'),
    searchBtn: document.getElementById('searchButton'),
    addManualBtn: document.getElementById('addManualBtn'), 
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
    currentYear: document.getElementById('currentYear'),
    modal: document.getElementById('clusterModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    saveClusterBtn: document.getElementById('saveClusterBtn'),
    modalCodigoProduto: document.getElementById('modalCodigoProduto'), 
    modalNomeProduto: document.getElementById('modalNomeProduto'),     
    modalEmpresa: document.getElementById('modalEmpresa'),             
    modalTipo: document.getElementById('modalTipo'),
    modalAutorizacao: document.getElementById('modalAutorizacao'),
    modalMessage: document.getElementById('modalMessage')
};

function normalize(str) { if (!str) return ''; return String(str).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function normalizeCode(code) { if (!code) return ''; const s = String(code).trim(); return s.replace(/^0+/, '') || '0'; }
function displayStr(val) { if (val === null || val === undefined) return '—'; const s = String(val).trim(); return s === '' ? '—' : s; }
function escapeHtml(str) { if (!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function trimObjKeys(obj) { const newObj = {}; for (const key in obj) { if (obj.hasOwnProperty(key)) newObj[key.trim()] = obj[key]; } return newObj; }
