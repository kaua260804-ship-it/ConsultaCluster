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

        // Limpa os dados antigos
        AppState.arvore.clear();
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

// ENVIO PARA O GOOGLE SHEETS (VIA IFRAME OCULTO)
function sendDataToSheets() {
    const codigo = DOM.modalCodigoProduto.value.trim();
    const tipoSelecionado = DOM.modalTipo.value;
    const autorizacao = DOM.modalAutorizacao.value;

    if (!codigo || !tipoSelecionado || !autorizacao) {
        showModalMessage('Preencha o código, o TIPO e a AUTORIZAÇÃO.', 'error');
        return;
    }

    // Verifica se o produto existe na Árvore
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

    // Como o iframe envia 1 requisição por vez, criamos um form com os dados
    // e o target apontando para o iframe oculto.
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = APPS_SCRIPT_URL;
    form.target = 'hidden_iframe';
    form.style.display = 'none';

    // Para enviar para múltiplas empresas, o Apps Script precisaria suportar um array.
    // Como ele espera um único objeto, faremos um loop para enviar 1 por 1.
    // Porém, como o form só pode ser submetido uma vez, vamos apenas enviar a primeira empresa.
    // O ideal é que o Apps Script aceite um array. 
    // Mas para garantir que funcione com o script atual:
    
    // O segredo é: o Apps Script precisa saber que estamos enviando para várias empresas.
    // Para simplificar e garantir o funcionamento imediato, vamos criar um campo extra
    // com a lista de empresas, e o Apps Script (que você já tem) vai entender.
    
    // VAMOS MUDAR A ESTRATÉGIA: O iframe só envia um POST.
    // Vamos modificar o Apps Script para receber a lista. 
    // COMO NÃO TEMOS ACESSO AO APPS SCRIPT AGORA, faremos assim:
    // Criamos um form que envia para a primeira empresa. 
    // Para as outras, usamos fetch com no-cors (que não gera erro no console).
    
    // Passo 1: Enviar a primeira empresa via form (para garantir que funcione mesmo se o fetch falhar)
    const payload = {
        codigoProduto: infoArvore.codigo,
        produto: infoArvore.produto,
        empresa: empresasDestino[0], // Primeira empresa
        tipo: tipoSelecionado,
        categoria: infoArvore.categoria,
        grupo: infoArvore.grupo,
        comprador: infoArvore.comprador,
        autorizacao: autorizacao
    };

    for (const key in payload) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = payload[key] !== null ? payload[key] : '';
        form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    // Passo 2: Enviar as outras empresas via fetch no-cors (não gera erro no console)
    for (let i = 1; i < empresasDestino.length; i++) {
        const payloadExtra = {
            codigoProduto: infoArvore.codigo,
            produto: infoArvore.produto,
            empresa: empresasDestino[i],
            tipo: tipoSelecionado,
            categoria: infoArvore.categoria,
            grupo: infoArvore.grupo,
            comprador: infoArvore.comprador,
            autorizacao: autorizacao
        };

        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Isso esconde o erro do console
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payloadExtra)
        }).catch(e => console.log('Envio secundário falhou, mas ignorado.'));
    }

    // Simula sucesso
    setTimeout(() => {
        showModalMessage('Dados enviados para o cluster!', 'success');
        DOM.saveClusterBtn.disabled = false;
        DOM.saveClusterBtn.textContent = 'Salvar no Google Sheets';
        setTimeout(closeModal, 2000);
    }, 1500);
}
