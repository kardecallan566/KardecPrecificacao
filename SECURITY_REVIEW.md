# Revisão de segurança — Zynutz 3D / KardecPrecificacao

**Data:** 02/10/2026 · **Escopo:** código da branch `main` a partir do commit `7cbbe1f`; Cloudflare Pages Functions, frontend público/admin, Access, D1 e R2. **Método:** leitura de código, testes automatizados com JWT assinado em chave de teste, SQLite em memória, simulação de concorrência e de upload. **Não foi realizado teste de invasão em ambiente hospedado.** As credenciais, políticas Access, regras WAF, dados D1 e objetos R2 reais não foram acessados.

## Resultado por área

| Área | Constatação | Tratamento no código |
|---|---|---|
| Autenticação (`/api/admin/*`) | JWT RS256 validava assinatura, issuer, AUD, expiração e e-mail. Não validava `nbf`/`type` nem limitava o tamanho do token. | Validação estendida; tokens enormes ou não vigentes são rejeitados. JWKS remoto de domínio configurado, com cache de 5 min. |
| Alterações administrativas | POST/PUT/DELETE não exigiam defesa de CSRF além de Access; JSON poderia vir com tipo inesperado. | Cabeçalho obrigatório `X-Zynutz-Admin: 1`, checagem de `Origin`/`Sec-Fetch-Site`, tipos de conteúdo explícitos. Todas as alterações do painel já enviam o novo cabeçalho. |
| Corpo JSON | `request.text()` armazenava o corpo inteiro antes de conferir o comprimento real. | Leitura incremental limitada a 64 KB, inclusive quando Content-Length estiver ausente ou incorreto. JSON precisa ser um objeto. |
| Upload R2 | `request.formData()` era chamado antes de limitar o tamanho efetivamente lido. | Leitura limitada antes de interpretar o multipart: máximo de 20 MiB por arquivo e até 128 KiB de envelope. Mantidas verificação de MIME/assinatura, nomes UUID e extensões permitidas. |
| Páginas dinâmicas | `_headers` de Pages protege apenas recursos estáticos, não respostas geradas por Functions. | CSP, `nosniff`, antienquadramento, Referrer-Policy e Permissions-Policy adicionados diretamente às respostas de produtos e blog. |
| SQL injection | Consultas usam `prepare().bind()`; nomes de colunas dinâmicos vêm de um objeto normalizado de campos fixos. | Sem SQL injection demonstrada no escopo analisado. Mantidas consultas parametrizadas, com teste de slug malicioso. |
| Integridade do D1 | Restrições existentes de estoque/sales eram boas; publicação inválida e contribuição adulterada ainda não eram protegidas no banco. | Migration `0003_security.sql` cria gatilhos de publicação/custos não negativos e consistência do total financeiro. |
| Concorrência de estoque | Edição e ajuste de estoque calculavam diferença após leitura, sem verificar se o saldo mudou no intervalo. | Atualização condicional `WHERE stock=?` e escrita transacional do registro de estoque; conflito retorna 409. Inserção inicial de produto e lançamento de estoque passam a ser uma transação. |
| Configuração de custos | Objeto de custos não era limitado a chaves conhecidas. | Lista branca dos parâmetros numéricos e rejeição de chaves herdadas ou parâmetros inconsistentes. |
| Frontend e blog | Templates HTML escapam textos e atributos, e o corpo do blog não interpreta HTML arbitrário. | Complementados por CSP nas páginas dinâmicas. Ainda é importante não inserir scripts externos manualmente. |
| MakerWorld | O link é interpretado, mas o fetch utiliza host fixo `api.bambulab.com` e ID numérico. | Sem SSRF de URL arbitrária identificada. A licença comercial continua precisando de conferência humana. |

## Inventário de endpoints auditados

### Públicos

| Método e rota | Dados expostos ou comportamento | Observação |
|---|---|---|
| `GET /api/products` | Somente produtos publicados, até 100 | Serializer público não inclui custos nem dados de administração. |
| `GET /api/products?slug=...` | Um produto publicado | Valor do slug é vinculado como parâmetro SQL. |
| `GET /api/blog` e `?slug=` | Posts publicados | Corpo é texto escapado na página HTML. |
| `GET /api/settings` | Nome da loja e redes sociais | `default_costs` não é retornado. |
| `GET /produto/:slug` | Página pública e botão de compra | CSP e escapes HTML. |
| `GET /blog/:slug` | Artigo público | CSP e escapes HTML. |
| `GET /media/products/:uuid.ext` | Objeto do R2 por chave aleatória | Qualquer pessoa com o URL consegue acessar a mídia, publicada ou não. |
| `GET /sitemap.xml` | URLs públicas | Somente slugs publicados; XML escapado. |

### Administração: todas exigem validação do JWT no backend

| Rota | Métodos | Proteção complementar |
|---|---|---|
| `/api/admin/me` | GET | Devolve e-mail do usuário autorizado. |
| `/api/admin/lookup` | POST | Guarda de alteração; origem externa fixa no provedor MakerWorld. |
| `/api/admin/quote` | POST | Guarda de alteração; parâmetros numéricos validados. |
| `/api/admin/settings` | GET, PUT | Configuração de custos validada; consulta somente autenticada. |
| `/api/admin/products`, `/api/admin/products/:id` | GET, POST, PUT, DELETE | Normalização de campos, licença para publicar, edição de estoque com controle de concorrência. DELETE apenas arquiva. |
| `/api/admin/quotes` | GET, POST | Cálculo no servidor e limite de payload. |
| `/api/admin/sales` | GET, POST | Registro financeiro parametrizado; trigger antiestoque negativo e validação adicional de contribuição no D1. |
| `/api/admin/analytics` | GET | Agregados privados de vendas. |
| `/api/admin/inventory` | GET, POST | Ajuste inteiro validado, saldo não negativo, conflito 409 se saldo mudou. |
| `/api/admin/blog`, `/api/admin/blog/:id` | GET, POST, PUT, DELETE | Texto limitado, links da capa validados e publicação restrita. |
| `/api/admin/media` | POST | Multipart autenticado, limite incremental, whitelist de tipos, assinatura e chave UUID. |

## Limitações e riscos residuais

1. **Deploy ainda não validado:** a segurança depende de uma política Cloudflare Access restrita ao seu e-mail cobrindo `/admin/*` e `/api/admin/*` no domínio definitivo **e nas URLs de prévia**. Configure `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `ADMIN_EMAIL` como secrets/variáveis no Pages. A API nega acesso quando faltam; o HTML estático do painel só ficará protegido pela política da Cloudflare.
2. **Migration 0003 não foi executada no seu D1 remoto:** aplique após fazer backup e consultar os dados antigos. A nova validação pode rejeitar alterações em produtos publicados anteriormente com informações incompletas até que sejam corrigidos.
3. **R2 funciona como mídia por URL não enumerável, não como armazenamento confidencial:** um arquivo carregado, inclusive de produto em rascunho, é acessível por qualquer pessoa que conheça seu endereço `/media/...`. Evite subir imagens privadas ou dados de compradores; futuro checkpoint: referenciar mídia publicada no banco, permitir exclusão e separar rascunhos privados.
4. **Ausência de limitador de requisições por IP em código:** habilite regras WAF/rate limiting no Cloudflare para `/api/*`, especialmente upload e importação MakerWorld. O Access restringe uso administrativo, mas não substitui cotas de requisições.
5. **Vendas sem número externo:** a restrição `UNIQUE(channel,external_order,product_id)` evita duplicações quando o código do pedido é informado; no SQLite, `NULL` permite duplicações. Para vendas Shopee, registre sempre o ID do pedido e confira duplicações antes de importar relatórios em lote.
6. **Backups e auditoria de produção:** faça backup do D1 antes de cada migração, limite quem pode alterar bindings D1/R2 e acompanhe erros e mudanças de estoque. Os testes locais não comprovam configuração real nem resistência a ataque de rede.
7. **Aprovação comercial:** o status `approved` e a referência documental são preenchidos pelo administrador; o sistema não comprova automaticamente o direito de comercializar modelos de terceiros.

## Consultas de verificação antes de aplicar a migration

Execute somente em uma **cópia** ou via consulta somente leitura no D1. Não apagam nem modificam dados.

```sql
-- Produtos publicados antigos que podem falhar no gatilho da migration 0003.
SELECT id,name,status,price_cents,license_status FROM products
WHERE status='published' AND (price_cents<=0 OR (CASE WHEN json_valid(images_json) THEN json_array_length(images_json) ELSE 0 END)=0
 OR NOT ((license_status='own_design' AND source_url='')
 OR (license_status='approved' AND length(trim(license_reference))>=8)));

-- Saldo que não coincide com o histórico; pode indicar perda de registros antigos.
SELECT p.id,p.name,p.stock,COALESCE(SUM(l.delta),0) AS saldo_pelo_log
FROM products p LEFT JOIN inventory_log l ON l.product_id=p.id
GROUP BY p.id HAVING p.stock<>COALESCE(SUM(l.delta),0);

-- Pedidos antigos cujo total armazenado difere dos componentes.
SELECT COUNT(*) AS divergencias FROM sales WHERE contribution_cents<>
 (gross_cents-fee_cents-seller_shipping_cents-other_cents-unit_cost_cents*quantity);

-- Pedidos Shopee sem identificação externa: risco de entrada repetida.
SELECT COUNT(*) AS sem_codigo FROM sales WHERE channel='shopee' AND
 (external_order IS NULL OR trim(external_order)='');
```

## Validação e implantação

1. Confira os testes no GitHub Actions (`npm test`, `npm run build`) e repita localmente com Node 22.
2. Exporte um backup do banco **antes** de aplicar `0003_security.sql`. Mantenha `0001` e `0002` aplicadas. Em um ambiente não produtivo, rode o conjunto completo de migrações e os testes de publicação, vendas e uploads.
3. Habilite Cloudflare Access nos ambientes de produção e preview, depois teste `/api/admin/me` com sessão válida e sem sessão. Requisições POST sem `X-Zynutz-Admin: 1` devem retornar 403.
4. Confira CSP e demais cabeçalhos numa página `/produto/...` e num artigo `/blog/...` efetivamente servidos pelo Pages, não só nos recursos estáticos.
5. Desabilite `LOCAL_DEV` e remova `LOCAL_DEV_TOKEN` do ambiente de produção. Mantenha o bucket R2 sem acesso público direto; use apenas a rota `/media/` do aplicativo.

**Critério de conclusão:** correções de código auditáveis e testes locais aprovados; configurações Cloudflare, execução da migration no D1 remoto e testes de produção ficam pendentes até serem efetivamente executados na conta do proprietário.
