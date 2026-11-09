# Hotel — Desafio FullStack

Sistema de gestão de hóspedes, reservas, check-in e check-out para um hotel.

**Backend:** Python 3.12 · Django · DRF · PostgreSQL 16 · Redis 7
**Frontend:** React · TypeScript · Vite · TanStack Query
**Qualidade:** 100% de cobertura no backend · E2E com Playwright (Chromium e Firefox) · varredura de acessibilidade · CI no GitHub Actions

Especificação funcional: [`desafio.md`](./desafio.md).

---

## Como rodar

**Pré-requisitos:** Docker (com Compose V2), Node.js 22 (`nvm use` lê o `.nvmrc`) e `make`.

> **Windows:** o `make` não vem instalado. Instale com o [Chocolatey](https://community.chocolatey.org/packages/make)
> (`choco install make`, num PowerShell como administrador) e rode os comandos pelo Git Bash, ou use o [WSL](https://learn.microsoft.com/windows/wsl/install).
> Se preferir não instalar nada, use o passo a passo [sem `make`](#sem-make) logo abaixo.

```bash
make setup   # cria os .env, sobe Postgres/Redis/backend, migra, popula dados de demo e instala o frontend
make dev     # sobe a stack e o Vite
```

<details id="sem-make">
<summary>Rodar sem <code>make</code></summary>

Os mesmos passos do `make setup` e do `make dev`:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose build backend
docker compose run --rm backend sh -c "python manage.py migrate && python manage.py seed_demo"
docker compose up -d
cd frontend && npm install && npm run dev
```

Testes do backend: `docker compose run --rm -e CACHE_ENABLED=False backend pytest --cov`.

</details>

| Endereço | O quê |
|---|---|
| http://localhost:5173 | Frontend |
| http://localhost:8000/api/docs/ | Swagger (OpenAPI) |
| http://localhost:8000/admin/ | Django admin |
| http://localhost:8000/api/health/ | Health check |

**Login de demonstração:** `atendente@hotel.com` / `senha123`. Para entrar no admin, crie um superusuário com
`docker compose exec backend python manage.py createsuperuser`.

O backend roda no Docker com autoreload: o código de `backend/` é montado no container, então editar um `.py`
reinicia o servidor. O frontend roda local pelo Vite, para manter o hot reload rápido.

<details>
<summary>Rodar o backend sem Docker</summary>

Postgres e Redis continuam no Docker (`docker compose up -d db redis`). Requer Python 3.12.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
python manage.py migrate && python manage.py seed_demo
python manage.py runserver
```

</details>

## Comandos

| Comando | O que faz |
|---|---|
| `make setup` | Prepara o ambiente do zero |
| `make dev` | Sobe a stack no Docker e o frontend |
| `make down` | Derruba os containers |
| `make seed` | Popula os dados de demonstração (idempotente) |
| `make lint` | ruff, mypy, eslint, prettier e tsc |
| `make test-back` | pytest com gate de 100% de linhas e branches |
| `make test-front` | Vitest com gate de cobertura (`vite.config.ts`) |
| `make test-e2e` | Build de produção do frontend, backend E2E no Docker e Playwright |
| `make check` | Tudo o que o CI roda: `lint` + todos os testes |

## Testes

- **Backend:** pytest em ordem aleatória (`pytest-randomly`), com factories e relógio congelado (`freezegun`).
  O gate de cobertura é de 100% de linhas e branches.
- **Frontend:** Vitest, Testing Library e MSW.
- **E2E:** Playwright cobre a jornada completa do desafio (`e2e/specs/full-journey.spec.ts`) e cenários dedicados de
  autenticação, hóspedes, reservas, check-in, check-out, dashboard e configurações. As regras das 14h00 e 12h00
  são testadas com o relógio congelado no navegador e no backend (header `X-E2E-Now`).
- **Acessibilidade:** todas as telas passam sem violações críticas ou sérias (axe), com contraste WCAG AA.

O E2E roda contra o build de produção e um backend em `E2E_MODE` (`config/settings/e2e.py`), que usa banco
(`hotel_e2e`) e Redis próprios. Os endpoints `/api/_test/reset/` e `/api/_test/seed/` isolam cada teste com um
cenário nomeado e só existem nesse modo; fora dele, retornam 404.

## Regras de negócio e interpretações

Além do que está em `desafio.md`:

- **Diária:** a noite de sexta é dia útil, porque a noite pertence à data em que começa. Sábado e domingo são fim de semana.
- **Late check-out:** multa de 50% da diária do dia da saída, cobrada só quando a data prevista chegou e já passou das 12h00.
- **Saída antecipada** não reduz o total, porque o período reservado é o mínimo cobrado. Ficar além da data prevista cobra as noites extras.
- **Check-in** só é aceito dentro do período da reserva; fora dele, a API responde 409. Antes das 14h00 do dia certo, exige autorização explícita do atendente.
- **Check-out confere o total:** o front envia o total exibido no preview. Se o valor mudou antes da confirmação (por exemplo, passou das 12h00), o backend recusa com 409 e a tela mostra o novo total.
- **Quarto:** duas reservas ativas não se sobrepõem. O service checa, e uma exclusion constraint no PostgreSQL garante.
- **Estadia máxima** de 365 noites.
- **Conta:** trocar senha ou e-mail exige a senha atual.

## Arquitetura e decisões

- **Backend no padrão Django Styleguide (HackSoft):** apps por contexto de negócio (`accounts`, `guests`,
  `reservations`, `pricing`), com escrita em `services.py` e leitura em `selectors.py`.
- **Frontend organizado por feature:** cada pasta em `features/` é uma fatia vertical, e o `index.ts` dela é o contrato público.
- **Autenticação:** JWT em cookies `httpOnly`, nunca em `localStorage`, com proteção CSRF double-submit. O login é
  limitado a 5 tentativas a cada 5 minutos por IP e e-mail, e a 20 por IP.
- **Domínio:** a reserva é uma máquina de estados. Status, totais e horários mudam só por check-in, check-out ou
  cancelamento, inclusive no admin. O catálogo de quartos é fixo e versionado no código
  (`apps/reservations/rooms.py`).
- **Cache:** o Redis guarda só agregações caras (resumo do dashboard, 60s), nunca dados de uma reserva ou hóspede.
  Toda mutação invalida o cache no commit (`transaction.on_commit`). Se o Redis cair, o sistema perde latência, não
  corretude: o rate limit do login também libera as tentativas.
- **Dados no frontend:** o TanStack Query usa `staleTime` por tipo de dado (operacional 30s, cadastro 2min, sessão
  5min). O preview de check-out nunca é reaproveitado, porque depende do relógio. Mutações de reserva invalidam
  todas as visões afetadas.
