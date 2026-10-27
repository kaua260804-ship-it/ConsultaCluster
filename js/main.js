// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa Ícones
    if (window.lucide) lucide.createIcons();
    
    // Define o ano no footer
    DOM.currentYear.textContent = new Date().getFullYear();

    // ===== EVENTOS DE BUSCA =====
    DOM.searchBtn.addEventListener('click', handleSearch);
    DOM.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    DOM.retryBtn.addEventListener('click', loadDatabase);
    DOM.companyFilter.addEventListener('change', applyCompanyFilter);

    // ===== EVENTOS DO MODAL =====
    DOM.closeModalBtn.addEventListener('click', closeModal);
    DOM.cancelModalBtn.addEventListener('click', closeModal);
    DOM.saveClusterBtn.addEventListener('click', sendDataToSheets);

    // ===== INICIALIZAÇÃO =====
    populateModalSelects();
    renderHistory();
    loadDatabase();
});

// Lógica principal da busca
function handleSearch() {
    if (!AppState.isDataLoaded) {
        showError('A base de dados ainda não foi carregada. Aguarde ou clique em "Tentar novamente".');
        return;
    }

    const rawCode = DOM.input.value.trim();
    if (!rawCode) {
        DOM.input.focus();
        return;
    }

    const searchCode = normalizeCode(rawCode);
    const results = AppState.database.filter(row => normalizeCode(row.codigoProduto) === searchCode);

    saveHistory(rawCode);
    renderResults(results, rawCode);
}