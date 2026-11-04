# Roadmap de evolução — Kardlottgeek (KLG)

Este documento é o plano vivo do projeto. Atualize o status conforme cada etapa for implementada, testada e validada visualmente. Não considerar um recurso concluído apenas porque o código foi publicado: revisar desktop, mobile, acessibilidade, dados reais e fluxo de compra.

## Direção de produto
A KLG deve ser uma loja de impressão 3D acolhedora, autoral e confiável. Produtos reais e suas fotografias são protagonistas; mascote, efeitos e temas são elementos de identidade, nunca substitutos da mercadoria. O site apresenta e encaminha a compra (Shopee/WhatsApp); não processa pagamentos próprios atualmente.

## Fases

### 1 — Fundação visual e experiência de compra (em andamento)
- [x] Nova direção de cores: creme, coral, verde-lima e grafite.
- [x] Hero comercial e coleções na home.
- [x] Cards de produto com preço, categoria e disponibilidade.
- [x] Página de produto com galeria e CTA.
- [x] Galeria selecionável por miniaturas.
- [ ] Revisar visual com catálogo real e fotografias em diferentes proporções.
- [ ] Definir fallback elegante para produto sem foto (sem sugerir que seja produto real).
- [ ] Ordenação: destaque, recentes, menor/maior preço; testar estados vazios e busca.
- [ ] Melhorar CTA: pronta-entrega → comprar; sob encomenda → WhatsApp com mensagem contextual.
- [ ] Adicionar produtos relacionados e continuar explorando.
- [ ] Revisar preço, estoque, disponibilidade e links quebrados em todos os estados.

### 2 — Página inicial (redesign completo)
- [ ] Vitrine de produtos reais em destaque (não mockups genéricos).
- [ ] Coleções filtram catálogo pela categoria correspondente.
- [ ] Bloco de confiança: processo, personalização, envio/retirada e canais reais.
- [ ] Banner sazonal configurável sem esconder produtos nem prejudicar legibilidade.
- [ ] CTA principal e secundário com destino funcional.
- [ ] Mobile-first: hero, filtros, cards e menu sem overflow.
- [ ] Revisar contraste, foco, estados hover e carregamento.

### 3 — Mascote e identidade da marca
- [ ] Usar arquivo oficial enviado pelo proprietário como referência principal.
- [ ] Não redesenhar por CSS nem substituir por personagem genérico.
- [ ] Criar assets/poses apenas quando houver arte aprovada (principal, pequena assinatura, campanha).
- [ ] Aplicar mascote com parcimônia: footer, campanhas, empty state e blog; não sobrepor produtos.
- [ ] Otimizar PNG/WebP/SVG, transparência, dimensões e acessibilidade.

### 4 — Design systems e calendário de campanhas
- [x] Cartoon, Tech, Space, Retrô Pop e Natural.
- [x] Eventos: Halloween, Natal, Valentine, Páscoa, Junina, Ano Novo, Carnaval, Mães/Pais, Crianças, Mulher, Pride, Primavera/Inverno, Black Friday, aniversário, Gamer, Anime e Maker.
- [ ] Auditar consistência de todos os temas (botões, cards, filtros, blog, detalhes e mobile).
- [ ] Criar presets de campanha com paleta, banner, texto e efeito específicos.
- [ ] Configurar datas de início/fim e agendamento automático no painel.
- [ ] Limitar efeitos a decoração discreta, respeitar reduced-motion e não bloquear interação.
- [ ] Preview do tema/evento no painel antes de publicar; botão de restaurar padrão.
- [ ] Validar que visitante não pode alterar tema global.

### 5 — Blog / Caderno KLG
- [x] Blog separado da loja e identidade editorial própria.
- [x] KLG Lab / manifesto editorial.
- [ ] Página inicial editorial com categorias, busca, destaque e artigos recentes.
- [ ] Artigo com hierarquia tipográfica, índice quando longo, leitura confortável e compartilhamento.
- [ ] Capas reais ou ilustrações autorais aprovadas; fallback por categoria.
- [ ] Tags e datas consistentes; relacionados e CTA contextual para produtos.
- [ ] SEO: title/description/canonical/OG, sitemap e dados estruturados.
- [ ] Mobile, acessibilidade e performance.

### 6 — Painel administrativo
- [x] Cadastro/edição de produtos, estoque, vendas, conteúdo e configurações.
- [x] Configuração de aparência e evento global.
- [ ] Preview de vitrine e página do produto.
- [ ] Validação clara de campos, erros e confirmação de publicação.
- [ ] Checklist editorial/comercial antes de publicar (foto, descrição, preço, licença, estoque, link).
- [ ] Gerenciamento de campanhas e calendário.
- [ ] Backup/exportação e rotina de recuperação.

### 7 — Conteúdo, SEO e conversão
- [ ] Revisar copy em português e eliminar termos inconsistentes (ex.: “sob consulta”).
- [ ] Open Graph, favicon, metadados, sitemap e robots.
- [ ] Analytics com privacidade e eventos essenciais (view item, CTA, outbound).
- [ ] Links sociais e Shopee configuráveis e verificados.
- [ ] FAQ sobre impressão 3D, materiais, personalização, prazo e cuidados (informações reais).
- [ ] Página Sobre com processo real e fotos do ateliê, se fornecidas.

### 8 — Qualidade técnica e publicação
- [x] Testes automatizados e build no CI.
- [ ] Testes de regressão visual desktop/mobile em páginas-chave.
- [ ] Lighthouse/performance: imagens responsivas, lazy loading, fontes e CSS.
- [ ] Acessibilidade: teclado, foco, alt, contraste, reduced-motion e semântica.
- [ ] Segurança: Access, API admin, CSP, links externos e uploads.
- [ ] Revisar Cloudflare Pages, D1/R2, domínio e variáveis de produção.
- [ ] Checklist final de publicação e smoke test pós-deploy.

## Critérios de conclusão
- Nenhum produto ou dado comercial fictício apresentado como real.
- Todas as ações visíveis funcionam e têm feedback.
- Visual revisado em desktop e celular.
- Sem falhas nos testes/build; rotas e links principais verificados.
- Loja, blog e painel possuem identidades coerentes e papéis distintos.
- Temas e campanhas são administráveis, acessíveis e reversíveis.

## Próxima prioridade
1. Testar a nova página de produto com dados reais e corrigir estados/CTA.
2. Tornar os cards da home e coleções realmente orientados ao catálogo.
3. Refinar mascote usando o asset oficial, sem inventar versão.
4. Construir preview/agendamento de temas no admin.
5. Fazer auditoria visual completa desktop/mobile e blog.
