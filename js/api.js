// js/api.js

async function loadDatabase() {
    showLoading();
    hideError();

    try {
        const response = await fetch('CLUSTER.xlsx', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Arquivo CLUSTER.xlsx não encontrado.`);

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetNames = workbook.SheetNames;
        const abaBaseNome = sheetNames.find(n => normalize(n) === 'base');
        const abaArvoreNome = sheetNames.find(n => normalize(n) === 'arvore');

        if (!abaBaseNome || !abaArvoreNome) throw new Error('O arquivo deve conter as abas "BASE" e "ARVORE".');

        const arvoreData = XLSX.utils.sheet_to_json(workbook.Sheets[abaArvoreNome], { defval: '' });
        const baseData = XLSX.utils.sheet_to_json(workbook.Sheets[abaBaseNome], { defval: '' });

        processarDadosExcel(baseData, arvoreData);
        
        updateLastUpdateDate();
        hideLoading();
        DOM.input.focus();

    } catch (err) {
        console.error(err);
        hideLoading();
        showError(err.message || 'Erro ao carregar base.');
    }
}

function enviarParaSheetsBypassCORS(payload, callback) {
    const params = new URLSearchParams();
    for (const key in payload) {
        if (payload.hasOwnProperty(key)) {
            params.append(key, payload[key] !== null ? payload[key] : '');
        }
    }

    const img = new Image();
    img.src = APPS_SCRIPT_URL + '?' + params.toString();
    
    img.onload = function() { if (callback) callback(true); };
    img.onerror = function() { if (callback) callback(true); }; 
    setTimeout(() => { if (callback) callback(true); }, 1000);
}

function sendDataToSheets() {
    const codigo = DOM.modalCodigoProduto.value.trim();
    const autorizacao = DOM.modalAutorizacao.value;

    const checkboxesMarcados = Array.from(document.querySelectorAll('input[name="modalTipoCheckbox"]:checked'));
    const tiposSelecionados = checkboxesMarcados.map(cb => cb.value);

    if (!codigo || tiposSelecionados.length === 0 || !autorizacao) {
        showModalMessage('Preencha o código, selecione pelo menos um TIPO e a AUTORIZAÇÃO.', 'error');
        return;
    }

    const infoArvore = AppState.arvore.get(normalizeCode(codigo));
    if (!infoArvore) {
        showModalMessage('Produto não encontrado na Árvore.', 'error');
        return;
    }

    let todasAsEmpresasParaEnviar = [];
    tiposSelecionados.forEach(tipo => {
        const empresasDoTipo = MAPA_EMPRESAS[tipo] || [];
        empresasDoTipo.forEach(empresa => {
            todasAsEmpresasParaEnviar.push({ empresa, tipo });
        });
    });

    if (todasAsEmpresasParaEnviar.length === 0) {
        showModalMessage('Nenhuma empresa configurada para os Tipos selecionados.', 'error');
        return;
    }

    const originalText = DOM.saveClusterBtn.innerHTML;
    DOM.saveClusterBtn.disabled = true;
    DOM.saveClusterBtn.innerHTML = `<span class="spinner-btn"></span> Enviando...`;
    
    showModalMessage(`Iniciando envio para ${todasAsEmpresasParaEnviar.length} empresas...`, 'info');

    let enviados = 0;

    todasAsEmpresasParaEnviar.forEach((item, index) => {
        const payload = {
            codigoProduto: infoArvore.codigo,
            produto: infoArvore.produto,
            empresa: item.empresa,
            tipo: item.tipo,
            categoria: infoArvore.categoria,
            grupo: infoArvore.grupo,
            comprador: infoArvore.comprador,
            autorizacao: autorizacao
        };

        setTimeout(() => {
            enviarParaSheetsBypassCORS(payload, () => {
                enviados++;
                showModalMessage(`Enviado para ${item.empresa} (${enviados}/${todasAsEmpresasParaEnviar.length})...`, 'info');
                
                if (enviados === todasAsEmpresasParaEnviar.length) {
                    showModalMessage('Todos os dados foram enviados!', 'success');
                    showToast('Dados enviados para o Google Sheets!', 'success');
                    DOM.saveClusterBtn.disabled = false;
                    DOM.saveClusterBtn.innerHTML = originalText;
                    setTimeout(closeModal, 2000);
                }
            });
        }, index * 400);
    });
}
