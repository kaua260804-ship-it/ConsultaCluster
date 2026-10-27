// js/api.js

// Carregamento do Excel
async function loadDatabase() {
    showLoading();
    hideError();

    try {
        const response = await fetch('CLUSTER.xlsx', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Arquivo CLUSTER.xlsx não encontrado (HTTP ${response.status}).`);

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const sheetNames = workbook.SheetNames;
        const abaBaseNome = sheetNames.find(n => normalize(n) === 'base');
        const abaArvoreNome = sheetNames.find(n => normalize(n) === 'arvore');

        if (!abaBaseNome || !abaArvoreNome) {
            throw new Error('O arquivo Excel deve conter as abas "BASE" e "ARVORE".');
        }

        // Lê ARVORE
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

        // Lê BASE e cruza
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

// Envio para o Google Sheets (Solução via Iframe para CORS)
function sendDataToSheets() {
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

    // Cria um formulário invisível e envia para o iframe oculto
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = APPS_SCRIPT_URL;
    form.target = 'hidden_iframe'; // O target é o iframe que criamos no HTML
    form.style.display = 'none';

    // Adiciona os dados como campos ocultos
    for (const key in payload) {
        if (payload.hasOwnProperty(key)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = payload[key] !== null ? payload[key] : '';
            form.appendChild(input);
        }
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form); // Limpa o form do DOM

    // Simula um tempo de resposta e fecha o modal
    setTimeout(() => {
        showModalMessage('Dados enviados com sucesso!', 'success');
        DOM.saveClusterBtn.disabled = false;
        DOM.saveClusterBtn.textContent = 'Salvar no Google Sheets';
        setTimeout(closeModal, 2000);
    }, 1500); // 1.5 segundos é suficiente para o envio ocorrer
}
