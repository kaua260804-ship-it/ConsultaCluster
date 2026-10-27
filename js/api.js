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

    // Efeito visual de Loading no botão
    const originalText = DOM.saveClusterBtn.innerHTML;
    DOM.saveClusterBtn.disabled = true;
    DOM.saveClusterBtn.innerHTML = `<span class="spinner-btn"></span> Enviando...`;
    
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
                
                // Atualiza a mensagem no modal
                showModalMessage(`Enviado para ${empresa} (${enviados}/${empresasDestino.length})...`, 'info');
                
                // Se finalizou todos
                if (enviados === empresasDestino.length) {
                    showModalMessage('Todos os dados foram enviados!', 'success');
                    
                    // Dispara Toast notification bonitinha
                    showToast('Dados enviados para o Google Sheets com sucesso!', 'success');

                    // Restaura o botão e fecha o modal após 2s
                    DOM.saveClusterBtn.disabled = false;
                    DOM.saveClusterBtn.innerHTML = originalText;
                    setTimeout(closeModal, 2000);
                }
            });
        }, index * 400);
    });
}
