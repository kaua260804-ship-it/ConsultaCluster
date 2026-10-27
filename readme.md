# Consulta de Comprador | Cluster de Produtos

Site 100% client-side para consulta de compradores responsáveis por códigos de produto, com base em uma planilha Excel (`CLUSTER.xlsx`). Desenvolvido com HTML, CSS e JavaScript puro, pronto para ser hospedado no GitHub Pages.

## Funcionalidades

- **Busca por código de produto**: input principal com suporte a Enter e botão "Buscar".
- **Comparação inteligente**: ignora zeros à esquerda (ex: `24553` = `024553`) e diferenças de caixa/acentos.
- **Múltiplos resultados**: exibe todos os registros correspondentes (um produto pode ter compradores diferentes em empresas distintas).
- **Cards informativos**: comprador em destaque, tipo e categoria como badges, grupo, subgrupo, empresa (nome + código) e nome do produto.
- **Filtro por empresa**: após a busca, permite refinar os resultados por empresa.
- **Histórico de buscas**: salva as últimas 5 buscas no `localStorage` e exibe como chips clicáveis.
- **Feedback visual**: loading durante o carregamento do XLSX, mensagens de erro amigáveis e estado "nenhum resultado".
- **Design responsivo**: layout mobile-first, cores corporativas, sombras suaves e tipografia Inter.

## Estrutura de Arquivos
