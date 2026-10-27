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

// FUNÇÃO AUXILIAR: Contorna o erro 403 do Google Apps Script usando Imagem GET
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
    const tipoSelecionado = DOM.modalTipo.value;
    const autorizacao = DOM.modalAutorizacao.value;

    if (!codigo || !tipoSelecionado || !autorizacao) {
        showModalMessage('Preencha o código, o TIPO e a AUTORIZAÇÃO.', 'error');
        return;
    }

    const infoArvore = AppState.arvore.get(normalizeCode(codigo));
    if (!infoArvore) {
        showModalMessage('Produto não encontrado na Árvore.', 'error');
        return;
    }

    const empresasDestino = MAPA_EMPRESAS[tipoSelecionado];
    if (!empresasDestino || empresasDestino.length === 0) {
        showModalMessage('Nenhuma empresa configurada para este Tipo.', 'error');
        return;
    }

    DOM.saveClusterBtn.disabled = true;
    DOM.saveClusterBtn.textContent = 'Enviando...';
    showModalMessage(`Iniciando envio para ${empresasDestino.length} empresas...`, 'info');

    let enviados = 0;

    empresasDestino.forEach((empresa, index) => {
        const payload = {
            codigoProduto: infoArvore.codigo,
            produto: infoArvore.produto,
            empresa: empresa,
            tipo: tipoSelecionado,
            categoria: infoArvore.categoria,
            grupo: infoArvore.grupo,
            comprador: infoArvore.comprador,
            autorizacao: autorizacao
        };

        setTimeout(() => {
            enviarParaSheetsBypassCORS(payload, () => {
                enviados++;
                showModalMessage(`Enviado para ${empresa} (${enviados}/${empresasDestino.length})...`, 'info');
                
                if (enviados === empresasDestino.length) {
                    showModalMessage('Todos os dados foram enviados! Verifique a planilha.', 'success');
                    DOM.saveClusterBtn.disabled = false;
                    DOM.saveClusterBtn.textContent = 'Salvar no Google Sheets';
                    setTimeout(closeModal, 2500);
                }
            });
        }, index * 400);
    });
}
