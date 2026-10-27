// js/api.js

// ===== CARREGAMENTO DO XLSX =====
async function loadDatabase() {
    showLoading();
    hideError();

    try {
        const response = await fetch('CLUSTER.xlsx', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Arquivo CLUSTER.xlsx não encontrado (HTTP ${response.status}).`);

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        // 1. Encontra as abas
        const sheetNames = workbook.SheetNames;
        const abaBaseNome = sheetNames.find(n => normalize(n) === 'base');
        const abaArvoreNome = sheetNames.find(n => normalize(n) === 'arvore');

        if (!abaBaseNome || !abaArvoreNome) {
            throw new Error('O arquivo Excel deve conter as abas "BASE" e "ARVORE".');
        }

        // 2. Lê a aba ARVORE e cria um dicionário
        const arvoreData = XLSX.utils.sheet_to_json(workbook.Sheets[abaArvoreNome], { defval: '' });
        const arvoreMap = new Map();
        
        arvoreData.forEach(row => {
            const cleanRow = trimObjKeys(row);
            const seqProd = normalizeCode(cleanRow['SEQ PROD'] || cleanRow['Código Produto']);
            if (seqProd) {
                arvoreMap.set(seqProd, {
                    embalagem: cleanRow['EMBALAGEM'] || '',
                    categoria: cleanRow['CATEGORIA'] || '',
                    grupo: cleanRow['GRUPO'] || '',
                    subgrupo: cleanRow['SUBGRUPO'] || '',
                    comprador: cleanRow['COMPRADOR'] || ''
                });
            }
        });

        // 3. Lê a aba BASE e cruza com a ARVORE
        const baseData = XLSX.utils.sheet_to_json(workbook.Sheets[abaBaseNome], { defval: '' });
        
        AppState.database = baseData.map(row => {
            const cleanRow = trimObjKeys(row);
            const codProduto = normalizeCode(cleanRow['Código Produto'] || cleanRow['Codigo Produto']);
            const infoArvore = arvoreMap.get(codProduto) || {};

            return {
                codigoProduto: cleanRow['Código Produto'] || cleanRow['Codigo Produto'] || '',
                produto: cleanRow['Produto'] || '',
                empresa: cleanRow['EMPRESA'] || cleanRow['Empresa'] || '',
                tipo: cleanRow['TIPO'] || cleanRow['Tipo'] || '',
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
        console.error('Erro ao carregar base:', err);
        hideLoading();
        showError(err.message || 'Não foi possível carregar a base de dados.');
    }
}

// ===== ENVIO PARA O GOOGLE SHEETS =====
async function sendDataToSheets() {
    if (!AppState.currentProductToCluster) return;

    const tipoSelecionado = DOM.modalTipo.value;
    const autorizacaoSelecionada = DOM.modalAutorizacao.value;

    if (!tipoSelecionado || !autorizacaoSelecionada) {
        showModalMessage('Por favor, selecione o TIPO e a AUTORIZAÇÃO.', 'error');
        return;
    }

    const payload = {
        codigoProduto: AppState.currentProductToCluster.codigoProduto,
        produto: AppState.currentProductToCluster.produto,
        empresa: AppState.currentProductToCluster.empresa,
        tipo: tipoSelecionado,
        categoria: AppState.currentProductToCluster.categoria,
        grupo: AppState.currentProductToCluster.grupo,
        comprador: AppState.currentProductToCluster.comprador,
        autorizacao: autorizacaoSelecionada
    };

    DOM.saveClusterBtn.disabled = true;
    DOM.saveClusterBtn.textContent = 'Enviando...';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        const result = await response.json();

        if (result.status === 'success') {
            showModalMessage('Dados enviados com sucesso!', 'success');
            setTimeout(closeModal, 2000);
        } else {
            throw new Error(result.message);
        }

    } catch (err) {
        console.error(err);
        showModalMessage('Erro ao enviar. Verifique sua conexão ou a URL do Script.', 'error');
    } finally {
        DOM.saveClusterBtn.disabled = false;
        DOM.saveClusterBtn.textContent = 'Salvar no Google Sheets';
    }
}