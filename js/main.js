// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    DOM.currentYear.textContent = new Date().getFullYear();

    DOM.searchBtn.addEventListener('click', handleSearch);
    DOM.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    DOM.retryBtn.addEventListener('click', loadDatabase);
    DOM.companyFilter.addEventListener('change', applyCompanyFilter);

    // Eventos do Modal
    DOM.addManualBtn.addEventListener('click', openModal); 
    DOM.closeModalBtn.addEventListener('click', closeModal);
    DOM.cancelModalBtn.addEventListener('click', closeModal);
    DOM.saveClusterBtn.addEventListener('click', sendDataToSheets);

    populateModalSelects();
    renderHistory();
    loadDatabase();
});

function handleSearch() {
    if (!AppState.isDataLoaded) {
        showError('A base de dados ainda não foi carregada. Aguarde.');
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
