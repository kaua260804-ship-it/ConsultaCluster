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
        const arvoreMap = new Map();
        
        arvoreData.forEach(row => {
            const cleanRow = trimObjKeys(row);
            const seqProd = normalizeCode(cleanRow['SEQ PROD']);
            if (seqProd) {
                arvoreMap.set(seqProd, {
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
            const infoArvore = arvoreMap.get(codProduto) || {};

            return {
                codigoProduto: cleanRow['Código Produto'] || '',
                produto: cleanRow['Produto'] || '',
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

function sendDataToSheets() {
    const codigo = DOM.modalCodigoProduto.value.trim();
    const produto = DOM.modalNomeProduto.value.trim();
    const empresa = DOM.modalEmpresa.value.trim();
    const tipo = DOM.modalTipo.value;
    const autorizacao = DOM.modalAutorizacao.value;

    if (!codigo || !produto || !empresa || !tipo || !autorizacao) {
        showModalMessage('Preencha todos os campos obrigatórios.', 'error');
        return;
    }

    const payload = {
        codigoProduto: codigo,
        produto: produto,
        empresa: empresa,
        tipo: tipo,
        categoria: '', 
        grupo: '',
        comprador: '',
        autorizacao: autorizacao
    };

    DOM.saveClusterBtn.disabled = true;
    DOM.saveClusterBtn.textContent = 'Enviando...';

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = APPS_SCRIPT_URL;
    form.target = 'hidden_iframe'; 
    form.style.display = 'none';

    for (const key in payload) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = payload[key];
        form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    setTimeout(() => {
        showModalMessage('Dados enviados com sucesso!', 'success');
        DOM.saveClusterBtn.disabled = false;
        DOM.saveClusterBtn.textContent = 'Salvar no Google Sheets';
        setTimeout(closeModal, 1500);
    }, 1000);
}
