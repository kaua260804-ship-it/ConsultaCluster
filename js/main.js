// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    DOM.currentYear.textContent = new Date().getFullYear();

    // Eventos de Busca
    DOM.searchBtn.addEventListener('click', handleSearch);
    DOM.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
    DOM.retryBtn.addEventListener('click', loadDatabase);
    DOM.companyFilter.addEventListener('change', applyCompanyFilter);

    // Eventos do Modal
    DOM.addManualBtn.addEventListener('click', openModal); 
    DOM.closeModalBtn.addEventListener('click', closeModal);
    DOM.cancelModalBtn.addEventListener('click', closeModal);
    DOM.saveClusterBtn.addEventListener('click', sendDataToSheets);
    DOM.modalCodigoProduto.addEventListener('input', (e) => preencherDadosModal(e.target.value.trim()));

    // Inicialização
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
    if (!rawCode) { DOM.input.focus(); return; }

    const results = buscarProdutoPorCodigo(rawCode);
    saveHistory(rawCode);
    renderResults(results, rawCode);
}
