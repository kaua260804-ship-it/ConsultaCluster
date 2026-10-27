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
    const resultadosBrutos = AppState.database.filter(row => normalizeCode(row.codigoProduto) === searchCode);

    if (resultadosBrutos.length === 0) return [];

    // AGRUPAMENTO POR TIPO
    const agrupado = new Map();

    resultadosBrutos.forEach(row => {
        // Se não tiver tipo, joga em uma categoria genérica
        const tipoKey = row.tipo ? row.tipo.trim() : 'SEM TIPO DEFINIDO';

        if (!agrupado.has(tipoKey)) {
            // Cria o "esqueleto" do card baseado no primeiro registro
            agrupado.set(tipoKey, {
                tipo: tipoKey,
                comprador: row.comprador,
                categoria: row.categoria,
                grupo: row.grupo,
                subgrupo: row.subgrupo,
                produto: row.produto,
                codigoProduto: row.codigoProduto,
                empresas: new Set() // Usamos Set para não duplicar empresas
            });
        }

        // Adiciona a empresa na lista daquele tipo
        const cardAtual = agrupado.get(tipoKey);
        if (row.empresa) {
            cardAtual.empresas.add(row.empresa.trim());
        }
    });

    // Transforma o Map em um Array para a tela conseguir desenhar
    return Array.from(agrupado.values()).map(item => ({
        ...item,
        empresas: Array.from(item.empresas) // Converte o Set de volta para Array
    }));
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
