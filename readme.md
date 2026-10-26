# Consulta de Comprador | Cluster de Produtos

Site 100% client-side para consulta de compradores responsáveis por códigos de produto, com base em uma planilha Excel (`CLUSTER.xlsx`). Desenvolvido com HTML, CSS e JavaScript puro, pronto para ser hospedado no GitHub Pages.

## Funcionalidades

- **Busca por código de produto**: input principal com suporte a Enter e botão "Buscar".
- **Comparação inteligente**: ignora zeros à esquerda (ex: `24553` = `024553`) e diferenças de caixa/acentos.
- **Múltiplos resultados**: exibe todos os registros correspondentes (um produto pode ter compradores diferentes em empresas distintas).
- **Cards informativos**: comprador em destaque, empresa e produto com destaque visual, tipo e categoria como badges, e grupo.
- **Filtro por empresa**: após a busca, permite refinar os resultados por empresa.
- **Histórico de buscas**: salva as últimas 5 buscas no `localStorage` e exibe como chips clicáveis.
- **Feedback visual**: loading durante o carregamento do XLSX, mensagens de erro amigáveis e estado "nenhum resultado".
- **Design responsivo**: layout mobile-first, cores corporativas, sombras suaves e tipografia Inter.

## Estrutura de Arquivos
/index.html -> Página principal
/style.css -> Estilos
/app.js -> Lógica de busca e carregamento
/CLUSTER.xlsx -> Base de dados (planilha)
/README.md -> Este arquivo

text

## Como Fazer Upload do CLUSTER.xlsx

1. Acesse o repositório no GitHub.
2. Clique em **"Add file"** → **"Upload files"**.
3. Arraste o arquivo `CLUSTER.xlsx` ou selecione-o do computador.
4. **Importante**: o arquivo deve ficar **na raiz do repositório** (mesmo nível de `index.html`).
5. Clique em **"Commit changes"**.

> ⚠️ A planilha deve conter exatamente as colunas especificadas na seção "Estrutura Esperada das Colunas".

## Como Ativar o GitHub Pages

1. No repositório, vá em **Settings** (Configurações).
2. No menu lateral, clique em **Pages**.
3. Em **"Build and deployment"** → **"Source"**, selecione **"Deploy from a branch"**.
4. Em **"Branch"**, escolha `main` (ou `master`) e a pasta `/ (root)`.
5. Clique em **"Save"**.
6. Aguarde alguns minutos. O GitHub exibirá o link do site (ex: `https://seu-usuario.github.io/nome-do-repositorio/`).

## Como Atualizar a Planilha no Futuro

1. Acesse o repositório no GitHub.
2. Clique no arquivo `CLUSTER.xlsx`.
3. Clique no ícone de **lápis** (Edit) ou no botão **"Upload files"** para substituir.
4. Se estiver substituindo via upload, selecione o novo arquivo com o mesmo nome `CLUSTER.xlsx`.
5. Faça o commit. O site passará a usar a nova base automaticamente (pode ser necessário recarregar a página).

> 💡 **Dica**: O site faz cache do arquivo no navegador. Para forçar a atualização, os usuários podem recarregar com `Ctrl + Shift + R` (Windows/Linux) ou `Cmd + Shift + R` (Mac).

## Estrutura Esperada das Colunas

A planilha `CLUSTER.xlsx` deve ter a primeira linha (cabeçalho) com os seguintes nomes exatos:

| Coluna               | Descrição                          | Exemplo                     |
|----------------------|------------------------------------|-----------------------------|
| `Código Produto`     | Código do produto (chave de busca) | `1`                         |
| `Produto`            | Nome do produto                    | `CHOC MILKA CHIPS AHOY BR 100G` |
| `EMPRESA`            | Nome legível da empresa            | `R001-EMP.CALHAU`           |
| `TIPO`               | Tipo do comprador                  | `EMPORIO G`                 |
| `CATEGORIA`          | Categoria do produto               | `MERCEARIA`                 |
| `GRUPO`              | Grupo do produto                   | `MERCEARIA DOCE`            |
| `COMPRADOR`          | Nome do comprador responsável      | `JOSEANE BARROS`            |

> 📌 A ordem das colunas não importa, mas os nomes devem ser idênticos (incluindo acentos e maiúsculas). O script também aceita variações sem acento e com letras minúsculas (ex: `Empresa`, `Codigo Produto`).

## Observações Técnicas

- **SheetJS (xlsx)** é carregado via CDN (`v0.18.5`) para parsear o arquivo no navegador.
- **Lucide Icons** é usado para os ícones (via CDN).
- **Fonte Inter** é carregada do Google Fonts.
- Nenhum dado é enviado a servidores; todo o processamento ocorre no navegador do usuário.
- O código está comentado em português para facilitar manutenção.

## Licença

Este projeto é de uso interno. Sinta-se livre para adaptar conforme necessário.
