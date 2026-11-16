# Modern Web Guidance — Auditoria e plano de evolução

**Data:** 15/11/2026  
**Base analisada:** `main`  
**Objetivo:** modernizar a experiência pública e administrativa sem trocar a arquitetura Cloudflare Pages + Functions + D1 + R2.

## Resumo executivo

O projeto já possui uma base sólida: páginas públicas renderizadas no servidor, CSP, validação de autenticação administrativa, consultas SQL parametrizadas, controle de concorrência de estoque e testes automatizados. A evolução deve ser incremental, mensurável e protegida por testes.

## Achados confirmados na leitura do código

### Loja e catálogo
- `assets/store.js` monta cards via `innerHTML`. Os campos textuais passam por `escape`, mas toda nova interpolação deve manter esse padrão; conteúdo externo/importado nunca deve ser tratado como HTML confiável.
- As imagens do catálogo usam `loading="lazy"` uniformemente. Isso é bom para imagens fora da tela, mas o recurso visual principal/LCP deve receber prioridade adequada; imagens de cards abaixo da dobra devem continuar lazy.
- O catálogo usa uma imagem por produto (`images[0]`) sem `srcset`/`sizes`; versões responsivas e formatos modernos podem reduzir bytes transferidos em celulares.
- A vitrine mostra um preço único (`p.price`) e o detalhe apresenta uma única ação de compra. Isso deverá evoluir com o catálogo unificado e múltiplas ofertas de marketplaces, exibindo faixa de preço e escolha explícita de destino.
- Busca, filtros e ordenação são implementados no cliente e atualizam a vitrine. Precisamos preservar teclado, foco visível, estados vazios e anúncio acessível da quantidade de resultados.

### Layout e acessibilidade
- `assets/style.css` possui estilos extensos e regras responsivas; a revisão deve testar larguras pequenas, zoom, textos longos, foco por teclado e preferências de movimento/contraste.
- Navegação, filtros, botões e formulários devem manter semântica nativa e alvos de toque confortáveis; evitar ARIA desnecessário.
- Mensagens de validação e notificações devem ser associadas aos campos e anunciadas por leitores de tela quando aplicável.

### Administração e formulários
- `assets/admin.js` centraliza renderização e fluxos administrativos. Novas funcionalidades (importação por URL, edição de ofertas e marketplace) devem ser divididas em etapas pequenas, com validação, feedback, prevenção de perda de dados e estados de carregamento/erro.
- A importação de URL deve ser protegida contra SSRF no servidor, limitar hosts suportados, validar redirecionamentos e tamanho/tempo de resposta, e nunca confiar nos dados extraídos. O usuário deve revisar antes de salvar.

### Segurança e entrega
- `_headers` aplica CSP e cabeçalhos em recursos estáticos. Respostas geradas por Pages Functions devem continuar emitindo seus próprios cabeçalhos de segurança.
- O CSP atual é restritivo, mas deve ser testado em produção antes de qualquer ajuste; não adicionar `unsafe-inline` como solução rápida.
- `.github/workflows/ci.yml` executa testes e build. O CI deve continuar sendo a barreira obrigatória para cada etapa.

## Plano de implementação priorizado

### Fase 0 — Baseline e proteção
1. Confirmar build e todos os testes atuais.
2. Registrar comportamento atual e métricas (Lighthouse/PageSpeed em mobile e desktop; Core Web Vitals quando disponíveis).
3. Manter branch de trabalho e checkpoints por etapa.

### Fase 1 — UX, responsividade e acessibilidade
1. Corrigir foco visível, estados hover/pressed e navegação por teclado.
2. Revisar filtros e busca: semântica, contagem acessível e estados vazios.
3. Validar layout em 320 px, 375 px, tablet, desktop, zoom 200% e redução de movimento.
4. Melhorar formulários administrativos: autocomplete adequado, validação após interação, erros ligados aos campos e feedback com `aria-live` quando necessário.

### Fase 2 — Performance e imagens
1. Priorizar somente a imagem LCP; manter lazy-loading para imagens fora da primeira tela.
2. Adotar imagens responsivas (`srcset`/`sizes`) e formatos eficientes quando disponíveis no R2.
3. Definir dimensões/aspect-ratio para evitar CLS.
4. Adiar inicialização do visualizador 3D até a intenção do usuário ou proximidade da viewport.
5. Medir antes/depois com Lighthouse e DevTools, evitando otimização por suposição.

### Fase 3 — Catálogo e conversão
1. Finalizar catálogo de produto único com várias ofertas (Shopee, Mercado Livre e outros).
2. Exibir faixa de preços quando houver ofertas comparáveis.
3. Permitir seleção explícita de marketplace e redirecionamento à oferta escolhida.
4. Importar dados por URL com revisão humana e fallback manual.
5. Adicionar SEO por produto: canonical, Open Graph, sitemap e dados estruturados coerentes com o que está realmente disponível.

### Fase 4 — Segurança e robustez
1. Revisar todos os pontos de renderização dinâmica e manter escape/sanitização.
2. Fortalecer importação externa (allowlist, SSRF, redirect, limites e timeout).
3. Testar CSP e cabeçalhos nas páginas estáticas e dinâmicas.
4. Expandir testes de integração para catálogo multi-oferta, importação e autenticação.

### Fase 5 — PWA e qualidade contínua
1. Avaliar instalação PWA, manifest e cache seguro de recursos estáticos.
2. Não armazenar dados administrativos ou conteúdo sensível em cache offline.
3. Monitorar regressões de build, acessibilidade, performance e segurança.

## Critérios de aceite por etapa
- Testes existentes e novos passam.
- `npm run build` passa.
- Sem regressão visual ou funcional nos fluxos de loja/admin.
- Teclado e foco verificáveis.
- Dados importados são tratados como não confiáveis.
- Métricas e limitações da validação ficam documentadas.

## Referências
- [Modern Web Guidance — guias](https://developer.chrome.com/docs/modern-web-guidance/guides)
- [Modern Web Guidance — disciplinas](https://developer.chrome.com/docs/modern-web-guidance/disciplines)
- [Modern Web Guidance — repositório](https://github.com/GoogleChrome/modern-web-guidance)
