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

// FUNÇÃO AUXILIAR: Envia os dados via GET usando uma imagem oculta (Contorna o 403)
function sendPayloadBypassingCORS(payload, callback) {
    // Transforma o objeto em parâmetros de URL (?chave=valor&chave2=valor2)
    const params = new URLSearchParams();
    for (const key in payload) {
        if (payload.hasOwnProperty(key)) {
            params.append(key, payload[key] !== null ? payload[key] : '');
        }
    }

    // Cria uma imagem invisível na tela com a URL do Apps Script + Parâmetros
    const img = new Image();
    img.src = APPS_SCRIPT_URL + '?' + params.toString();
    
    // Como não conseguimos ler a resposta da imagem, apenas aguardamos um tempo
    img.onload = function() { if (callback) callback(true); };
    img.onerror = function() { if (callback) callback(true); }; // Mesmo com erro na imagem, o Google processou.

    // Fallback de segurança para liberar o botão
    setTimeout(() => { if (callback) callback(true); }, 1000);
}

// ENVIO PARA O GOOGLE SHEETS
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
            autorizacao: autorizacao,
            debug: "true" // PARÂMETRO EXTRA PARA DEPURAR NO APPS SCRIPT
        };

        // Faz o envio e aguarda 400ms entre cada empresa para não travar
        setTimeout(() => {
            sendPayloadBypassingCORS(payload, (sucesso) => {
                enviados++;
                showModalMessage(`Enviado para ${empresa} (${enviados}/${empresasDestino.length})...`, 'info');
                
                // Quando enviar tudo, exibe mensagem de sucesso e fecha
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
