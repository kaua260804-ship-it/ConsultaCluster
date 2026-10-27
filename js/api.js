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
        
        arvoreData.forEach(row => {
            const cleanRow = trimObjKeys(row);
            const seqProd = normalizeCode(cleanRow['SEQ PROD']);
            if (seqProd) {
                AppState.arvore.set(seqProd, {
                    codigo: cleanRow['SEQ PROD'],
                    produto: cleanRow['DESC'] || '',
                    categoria: cleanRow['CATEGORIA'] || '',
                    grupo: cleanRow['GRUPO'] || '',
                    subgrupo: cleanRow['SUBGRUPO'] || '',
                    comprador: cleanRow['COMPRADOR'] || ''
                });
            }
        });

        const baseData = XLSX.utils.sheet_to_json(workbook.Sheets[abaBaseNome], { defval: '' });
        AppState.database = baseData.map(row => {
            const cleanRow = trimObjKeys(row);
            const codProduto = normalizeCode(cleanRow['Código Produto'] || cleanRow['Codigo Produto']);
            const infoArvore = AppState.arvore.get(codProduto) || {};

            return {
                codigoProduto: cleanRow['Código Produto'] || '',
                produto: cleanRow['Produto'] || infoArvore.produto || '',
                empresa: cleanRow['EMPRESA'] || '',
                tipo: cleanRow['TIPO'] || '',
                categoria: infoArvore.categoria,
                grupo: infoArvore.grupo,
                subgrupo: infoArvore.subgrupo,
                comprador: infoArvore.comprador
            };
        });

        AppState.isDataLoaded = true;
        updateLastUpdateDate();
        hideLoading();
        DOM.input.focus();

    } catch (err) {
        console.error(err);
        hideLoading();
        showError(err.message || 'Erro ao carregar base.');
    }
}

// ENVIO PARA O GOOGLE SHEETS (MODO NO-CORS PARA EVITAR ERRO 403)
async function sendDataToSheets() {
    const codigo = DOM.modalCodigoProduto.value.trim();
    const tipoSelecionado = DOM.modalTipo.value;
    const autorizacao = DOM.modalAutorizacao.value;

    if (!codigo || !tipoSelecionado || !autorizacao) {
        showModalMessage('Selecione o TIPO e a AUTORIZAÇÃO.', 'error');
        return;
    }

    const infoArvore = AppState.arvore.get(normalizeCode(codigo));
    if (!infoArvore) {
        showModalMessage('Produto não encontrado na Árvore. Verifique o código.', 'error');
        return;
    }

    const empresasDestino = MAPA_EMPRESAS[tipoSelecionado];
    if (!empresasDestino || empresasDestino.length === 0) {
        showModalMessage('Nenhuma empresa configurada para este Tipo.', 'error');
        return;
    }

    DOM.saveClusterBtn.disabled = true;
    DOM.saveClusterBtn.textContent = 'Enviando...';

    // O Apps Script vai receber 1 requisição para cada empresa
    for (const empresa of empresasDestino) {
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

        try {
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // BLINDAGEM CONTRA O ERRO 403 DO GOOGLE
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error("Falha ao enviar para: " + empresa, e);
        }
        
        // Pequeno delay para não sobrecarregar o Google Sheets
        await new Promise(r => setTimeout(r, 300));
    }

    showModalMessage('Dados enviados para as empresas do cluster!', 'success');
    DOM.saveClusterBtn.disabled = false;
    DOM.saveClusterBtn.textContent = 'Salvar no Google Sheets';
    setTimeout(closeModal, 2000);
}
