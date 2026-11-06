# KLG Commerce & Analytics — arquitetura e plano incremental

**Status:** planejamento técnico ativo · **Atualizado:** 06/11/2026

Este documento complementa `ROADMAP_DESIGN_E_COMERCIAL.md`. A prioridade é evoluir a loja e o painel sem interromper o catálogo, o admin ou o ambiente Cloudflare atual.

## Decisões de arquitetura

- **Shopee como canal logístico/marketplace:** investigar integração oficial para publicar produtos e consultar pedidos/frete elegível. Não prometer que o checkout externo consegue herdar automaticamente o frete Shopee. O fluxo deve respeitar as regras e APIs aprovadas da plataforma.
- **Checkout próprio não é prioridade imediata:** primeiro catálogo, produto, conversão, segurança e métricas.
- **Hospedagem:** Cloudflare Pages + Pages Functions + D1/R2 continuam sendo o ambiente funcional atual. GitHub Pages é hosting estático e não executa as Functions nem fornece bindings D1/R2; só será opção para frontend desacoplado, mantendo API/backend em outro serviço. Não migrar até desenhar e testar a arquitetura.
- **Analytics próprio:** dados agregados e eventos first-party, sem fingerprinting, gravação de sessão, captura de texto digitado, dados pessoais ou rastreamento invasivo.
- **Admin:** métricas privadas, API autenticada no servidor e dados agregados; nenhum endpoint administrativo deve ser liberado no frontend público.

## Analytics — visão proposta

### Indicadores principais
- Visitantes únicos aproximados por dia (identificador aleatório first-party com expiração curta; explicar limitações e evitar fingerprinting).
- Sessões, pageviews, páginas de entrada e saída.
- Produtos mais visualizados, categorias mais acessadas e busca interna (registrar apenas termos saneados/limitados, nunca campos pessoais).
- Cliques em CTA: Shopee, WhatsApp, explorar catálogo, galeria e produtos relacionados.
- Origem/referrer e campanha UTM normalizadas; remover parâmetros sensíveis.
- Funil: home → catálogo → produto → CTA externo. **Não chamar clique de compra ou conversão de venda** sem confirmação real do canal.
- Erros de navegação (404), desempenho básico e dispositivos/tamanhos em categorias amplas.
- Comparação diária/semanal/mensal, séries temporais e exportação CSV.

### Heatmap de navegação (sem replay)
- Mapa de cliques agregado por coordenadas relativas/elemento identificado e viewport em faixas, separado por página e dispositivo.
- Scroll depth em marcos (25/50/75/100%) e áreas de interação.
- Agregação por página/template, limiar mínimo de sessões e retenção limitada para evitar reidentificação.
- Não coletar teclas, conteúdo de formulários, endereço completo, mouse path contínuo ou replay de sessão.
- Aviso de privacidade, política de retenção e opção de desligar analytics não essencial; revisar LGPD antes de produção.

### Implementação por etapas
1. **Fundação e privacidade:** migration de eventos/sessões agregáveis, endpoint público de ingestão com schema allowlist, limites por tamanho/frequência, validação de origem e proteção contra abuso.
2. **Instrumentação:** pageview, view_product, search, click_cta, outbound_shopee, outbound_whatsapp, related_product e scroll milestones. IDs de evento idempotentes e payload pequeno.
3. **API admin:** endpoint protegido que retorna totais e séries agrupadas por dia, páginas, produto, canal/origem e funil. Nunca aceitar SQL ou filtros arbitrários do cliente.
4. **Dashboard v2:** cards KPI, gráficos temporais, funil, top páginas/produtos, fontes de tráfego, dispositivo e filtros por período.
5. **Heatmap v1:** overlay por página com cliques agregados, seleção desktop/mobile e legenda; depois scroll heatmap.
6. **Operação:** retenção/limpeza automática, exportação, auditoria de acessos, testes de carga e validação de dados.

## Segurança — próximos checkpoints
- Rate limit/WAF no Cloudflare para APIs públicas e admin; quotas específicas para analytics/upload/importação.
- Verificar política Cloudflare Access no domínio de produção e preview, inclusive HTML estático do painel.
- Reforçar CSP, validação de origem, JWT, payloads, erros sem stack trace e logs sem tokens.
- Testes automatizados para autorização, CSRF, abuso de ingestão, SQL parametrizado e payload inválido.
- Backup D1 antes de migrations; testar restauração e documentar rollback.
- Analytics: endpoint público não pode consultar dados privados; admin analytics sempre exige autenticação no servidor.
- Minimização e retenção de dados; não armazenar IP bruto nem identificadores persistentes sem necessidade e avaliação legal.

## Página de produto — prioridade UX
- Galeria com imagem principal, thumbnails acessíveis e zoom opcional.
- Nome, preço, categoria, status real de disponibilidade e descrição em hierarquia clara.
- CTA contextual: Shopee quando link válido; WhatsApp com mensagem do produto para sob consulta; fallback sem link quebrado.
- Informações de material/produção somente quando cadastradas; nunca inventar prazo, frete, garantia ou estoque.
- Produtos relacionados com imagem, preço e navegação.
- SEO (canonical, Open Graph, schema Product sem inventar avaliações/availability), acessibilidade, performance e mobile.
- Estados: sem foto, imagem quebrada, estoque zero, link externo ausente, descrição longa e erro de API.

## Critérios para avançar
- Testes/build verdes e revisão desktop/mobile.
- Métricas explicáveis, agregadas e consistentes com dados reais.
- Nenhuma informação de cliente exposta no dashboard público.
- Não alterar o canal de compra/frete sem decisão e teste da integração.
