# Zynutz 3D · Loja + Precificação MakerWorld

Plataforma de loja 3D para sua Shopee: catálogo público, catálogo por categorias, preços, estoque auditável, fotos e vídeos em R2, artigos de blog com páginas indexáveis, redes sociais, e uma calculadora que recebe um link do MakerWorld.

**Status:** MVP implementado e testado em código. Falta configurar Cloudflare Pages, D1, R2, Cloudflare Access, inserir suas fotos reais e confirmar a licença dos modelos comerciais. A loja **não** cria pagamentos, não recebe pedidos diretamente e não sincroniza pedidos da Shopee automaticamente. O painel permite cadastrar as vendas reais manualmente e desconta o estoque com trilha de auditoria.

## Segurança e direitos

O repositório é público: não coloque credenciais nele. As rotas `/api/admin/*` verificam JWT do Cloudflare Access (assinatura RS256/JWKS, audience, issuer, exp e e-mail autorizado). O dashboard `/admin/*` também deve ser protegido com política no Cloudflare Access. A verificação server-side permanece obrigatória mesmo com o painel protegido. Para testar localmente há um token separado, que só funciona em `localhost` e com `LOCAL_DEV=true`; jamais configure isso em produção.

Um link do MakerWorld **não concede licença comercial**. O importador tenta consultar metadados públicos; caso a API não responda, preenche o título pelo slug. Nunca inventa peso, tempo ou autorização. Produtos importados ficam em rascunho. A publicação exige fotos próprias e licença `approved` com comprovante (ou `own_design` sem modelo de terceiro). Decorações de LED são **somente para velas elétricas**; não use chama real com PETG/PLA.

## Testes sem dependências

```bash
npm test
npm run build
```

## Cloudflare Pages

1. Conecte `kardecallan566/KardecPrecificacao` via integração Git (não use Direct Upload para Pages Functions). Configure `npm run build` como comando e `dist` como diretório.
2. Crie o D1 `zynutz-3d-db` e o bucket R2 `zynutz-3d-media`. No painel Pages > Settings > Bindings, associe `DB` (D1) e `MEDIA` (R2). O exemplo `wrangler.toml.example` contém a estrutura caso prefira Wrangler. Não salve o ID real diretamente em arquivo público se não quiser expô-lo.
3. Instale Wrangler localmente (`npm install`) e execute `npx wrangler d1 migrations apply zynutz-3d-db --remote` usando sua configuração `wrangler.toml` já preenchida. **Aplique ambas as migrations 0001 e 0002**, para criar estoque, histórico de orçamentos e vendas. Para criar o banco local, use `--local`.
4. Crie um aplicativo **Cloudflare Access** (self-hosted) com política restrita ao seu e-mail para `/admin/*` e `/api/admin/*`; proteja a prévia também. No Pages > Variables and Secrets, configure `CF_ACCESS_TEAM_DOMAIN` (ex.: `minha-equipe.cloudflareaccess.com`), `CF_ACCESS_AUD` (AUD do app Access) e `ADMIN_EMAIL`.
5. Publique; depois acesse `/admin/` para configurar a marca, redes sociais, custos e cadastrar produtos. Imagens e vídeos são armazenados no R2 privado e disponibilizados por `/media/` somente via chave aleatória. Vídeos limitados a 20 MB nesta versão.
6. Verifique a autorização comercial, o custo da vela LED, o consumo real no Bambu Studio, fotografias próprias e o link específico da Shopee antes de publicar o fantasma de Halloween.

### Desenvolvimento local

```bash
npm install
cp wrangler.toml.example wrangler.toml
# Substitua os IDs pelo D1 e R2 reais (ou configure o desenvolvimento local pelo Wrangler).
npx wrangler d1 migrations apply zynutz-3d-db --local
# crie .dev.vars com LOCAL_DEV=true e LOCAL_DEV_TOKEN=<TOKEN_FORTE_LOCAL>
npm run dev
```

O frontend abrirá em `/` e o painel em `/admin/`. Ao testar localmente, digite o token no formulário de autenticação. Sem D1, a página pública exibe aviso de configuração em vez de dados inventados.

## Precificação

O importador lê ID e título pelo link e tenta consultar os metadados de peso e duração **do perfil selecionado**, quando acessíveis. A API do MakerWorld não é pública e estável; para o preço final, confirme os valores no Bambu Studio. O usuário informa peso e duração **reais do lote** (em horas decimais), unidades vendáveis, minutos de preparação, material, insumos extras (LED, parafuso, cola), desperdício, falhas, potência média, energia, desgaste da máquina, embalagem, mão de obra, publicidade por venda, comissão percentual, taxa fixa, impostos e margem-alvo.

- Custo unitário: filamento + energia + reserva de falha + depreciação/hora + trabalho/hora + embalagem + extras + publicidade.
- Preço de equilíbrio = `(custos + tarifa fixa) / (1 - comissão - impostos)`.
- Preço-alvo = `(custos + tarifa fixa) / (1 - comissão - impostos - margem desejada)`.
- Os campos são editáveis: comissão e taxa fixa **são hipóteses**, não uma garantia de regras atuais da Shopee. Confira a tabela aplicável a cada faixa de preço e condição da sua conta.

## Estrutura

- `index.html`, `assets/`: vitrine responsiva sazonal e cliente JS sem dependências de build.
- `admin/`: cadastro, edição, publicação e arquivamento de produtos; estoque, mídia, blog, redes, histórico de orçamentos e painel de vendas.
- `functions/api/`: endpoints públicos e CRUD autenticado.
- `functions/produto/[slug].js`, `functions/blog/[slug].js`: renderização HTML no servidor para SEO.
- `server/`: motor de precificação compartilhado, autorização JWT e importação segura de links.
- `migrations/`: tabelas de produtos, estoque, artigos, configurações, pedidos registrados e orçamentos.
- `tests/`: validação do preço, lotes, links, autorização comercial e teste de integração SQL completo (D1 compatível com SQLite).

## Próximos checkpoints

- CP01: testar integração real MakerWorld em ambiente Cloudflare e substituir automação por importação manual quando bloqueada.
- CP02: cadastrar produtos e fotografias reais da loja e validar o estoque inicial.
- CP03: **Concluído em MVP:** registro manual de vendas, custo unitário congelado, baixa automática de estoque, receita, taxas, custos e contribuição, exportação CSV. **Pendente:** importação automática de relatórios antigos da Shopee, devoluções e conciliação bancária.
- CP04: integração autenticada com a Shopee somente se houver API e permissões disponíveis; reconciliar pedidos idempotentes. O lançamento manual usa o nº do pedido + produto para bloquear duplicações.
- CP05: posts programados em redes, cupons e campanhas; nunca fazer post sem conexão autorizada.

## Como usar o painel no dia a dia

1. Acesse `/admin/` com o Cloudflare Access. Em **Redes sociais & custos**, confirme o custo atual do PETG, energia, reserva da máquina, mão de obra, comissão, taxa fixa e margem. As taxas são premissas configuráveis e podem mudar conforme o programa Shopee e a faixa de preço.
2. Em **Precificação**, cole o link MakerWorld. O importador pode sugerir título, autor e, quando disponíveis para o perfil indicado, peso e duração. **Não baixe nem publique a arte do criador sem permissão.** Confira os números no Bambu Studio, acrescente componentes de LED, embalagens, perdas e frete sob responsabilidade da loja, e calcule.
3. Clique em **Salvar orçamento** para preservar premissas e custos ou em **Cadastrar com este preço**. O formulário do produto recebe os dados da impressão convertidos para **por unidade vendável**, a origem, preço e as premissas. Informe a licença comercial documentada e faça upload das suas fotos ao R2 antes de publicar.
4. Em **Produtos**, edite descrição, imagens, vídeos, categoria, destaque, URL do anúncio Shopee, preço, estoque e status. Em **Estoque**, registre produção e ajustes manuais; movimentações permanecem no histórico.
5. Em **Vendas e lucro**, registre apenas pedidos confirmados. Para pedidos com vários produtos, crie uma linha por produto, repetindo o número do pedido. Informe receita *dessa linha*, taxas e frete distribuídos por linha; o custo de produção é congelado na transação, e o estoque é atualizado. Os lançamentos aparecem no painel e podem ser exportados em CSV.
6. Em **Blog**, publique artigos originais, com uma foto própria de capa enviada ao R2. Em **Configurações**, cadastre links de redes sociais e WhatsApp; não há publicação automática nesses serviços.

### Limites operacionais e próximos passos

- O site funciona em código e em testes com SQLite de memória. Para operar online ainda é necessário conectar **seus** D1/R2 e Cloudflare Access, aplicar as migrações, informar suas fotos e conferir permissões de comercialização. Não há checkout nem pagamentos no site: os botões de compra encaminham à Shopee.
- A área de vendas é um controle gerencial de contribuição, **não** substitui o extrato da Shopee ou a contabilidade; pedidos devolvidos/cancelados devem ser conciliados antes de lançar como pedidos concluídos. A importação automática de relatórios, edição/estorno de pedidos e sincronização via API dependem de checkpoints futuros.
- Não cole tokens, cookies, senhas da Shopee, credenciais do MakerWorld ou imagens não autorizadas nos campos públicos.
