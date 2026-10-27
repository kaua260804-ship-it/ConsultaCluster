// js/data.js

function processarDadosExcel(baseData, arvoreData) {
    AppState.arvore.clear();
    
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
}

function buscarProdutoPorCodigo(codigo) {
    const searchCode = normalizeCode(codigo);
    return AppState.database.filter(row => normalizeCode(row.codigoProduto) === searchCode);
}

function obterDetalhesProdutoModal(codigo) {
    const normalizedCode = normalizeCode(codigo);
    const infoArvore = AppState.arvore.get(normalizedCode);
    const registrosBase = AppState.database.filter(r => normalizeCode(r.codigoProduto) === normalizedCode);
    
    let nomeProduto = infoArvore ? infoArvore.produto : "Código não encontrado na Árvore";
    let tipoOriginal = "Produto não cadastrado na Base";

    if (registrosBase.length > 0) {
        const tiposUnicos = [...new Set(registrosBase.map(r => r.tipo))].filter(Boolean);
        tipoOriginal = tiposUnicos.length > 0 ? tiposUnicos.join(", ") : "Produto na base, mas sem TIPO definido";
    }

    return { nomeProduto, tipoOriginal };
}
