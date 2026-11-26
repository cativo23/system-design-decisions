# Topics

Master list of every card in the guide. Update the checkbox when a card changes state.

**Legend:** `[ ]` pending · `[~]` drafting · `[x]` published · **MVP** = part of the first release

Each slug is the card's permanent `id`. If a card is renamed, keep its slug.

---

## 01 · Foundations
- [ ] `quality-attributes-tradeoffs`: Quality attributes & trade-off analysis · **MVP**
- [ ] `consistency-pacelc`: Consistency models & PACELC (CAP covered inside) · **MVP**
- [ ] `back-of-envelope`: Back-of-envelope estimation (latency, throughput, cost, LLM timings) · **MVP**
- [ ] `slo-error-budgets`: SLI / SLO / SLA & error budgets · **MVP**

## 02 · Architecture styles
- [ ] `monolith`: Monolith
- [ ] `modular-monolith`: Modular monolith · **MVP**
- [ ] `microservices`: Microservices (extract on evidence) · **MVP**
- [ ] `event-driven-architecture`: Event-driven architecture · **MVP**
- [ ] `cell-based-architecture`: Cell-based architecture

## 03 · Compute & runtime
- [ ] `vms-containers-kubernetes`: VMs vs containers vs Kubernetes
- [ ] `serverless`: Serverless
- [ ] `edge-compute`: Edge compute

## 04 · Communication & APIs
- [ ] `api-styles`: Choosing an API style (REST / gRPC / GraphQL) · **MVP**
- [ ] `api-evolution`: API evolution & versioning · **MVP**
- [ ] `sync-vs-async`: Sync vs async communication · **MVP**
- [ ] `queues-vs-logs`: Queues vs logs · **MVP**
- [ ] `api-gateway-bff`: API gateway & BFF · **MVP**
- [ ] `real-time`: Real-time delivery (WebSockets, SSE, push)
- [ ] `service-mesh`: Service mesh (do you need one?)

## 05 · Distributed data & workflows
- [ ] `idempotency`: Idempotency · **MVP**
- [ ] `outbox-cdc`: Transactional outbox & CDC · **MVP**
- [~] `saga`: Saga (2PC covered inside) · **MVP**. Live as the walking-skeleton sample; `[x]` after the Phase 6 review
- [ ] `durable-execution`: Durable execution · **MVP**
- [ ] `cqrs`: CQRS
- [ ] `event-sourcing`: Event sourcing

## 06 · Storage
- [ ] `choosing-a-datastore`: Choosing a datastore · **MVP**
- [ ] `indexing`: Indexing · **MVP**
- [ ] `replication`: Replication · **MVP**
- [ ] `sharding-hot-keys`: Partitioning, sharding & hot keys · **MVP**
- [ ] `caching-invalidation`: Caching strategies & invalidation · **MVP**
- [ ] `search`: Search (inverted index, hybrid search)
- [ ] `cdn`: CDN

## 07 · Traffic
- [ ] `load-balancing`: Load balancing · **MVP**
- [ ] `rate-limiting-backpressure`: Rate limiting & backpressure · **MVP**
- [ ] `autoscaling`: Autoscaling

## 08 · Data platforms
- [ ] `batch-streaming-lakehouse`: Batch vs streaming → lakehouse (Lambda/Kappa as history) · **MVP**
- [ ] `data-contracts`: Data contracts
- [ ] `data-products`: Data products (data mesh, reframed)

## 09 · Reliability & operations
- [ ] `timeouts-retries-jitter`: Timeouts, retries & jitter · **MVP**
- [ ] `circuit-breaker-load-shedding`: Circuit breaker & load shedding · **MVP**
- [ ] `bulkhead`: Bulkhead
- [ ] `multi-region-dr`: Multi-region & disaster recovery (RPO/RTO, control vs data plane) · **MVP**
- [ ] `progressive-delivery`: Progressive delivery & safe config rollout · **MVP**
- [ ] `opentelemetry`: Observability with OpenTelemetry · **MVP**
- [ ] `chaos-engineering`: Chaos engineering
- [ ] `platform-engineering`: Platform engineering & internal developer platforms

## 10 · Security, privacy & compliance
- [ ] `oidc-authentication`: Authentication with OAuth2 / OIDC · **MVP**
- [ ] `authorization-models`: Authorization models (RBAC / ABAC / ReBAC) · **MVP**
- [ ] `multi-tenancy-isolation`: Multi-tenancy isolation · **MVP**
- [ ] `secrets-management`: Secrets management
- [ ] `zero-trust`: Zero trust
- [ ] `threat-modeling`: Threat modeling
- [ ] `privacy-data-residency`: Privacy engineering & data residency
- [ ] `crypto-agility`: Crypto agility & post-quantum readiness

## 11 · AI systems
- [ ] `when-not-to-use-llm`: When (not) to use an LLM
- [ ] `model-choice-routing`: Model choice & routing
- [ ] `ai-gateway`: LLM app anatomy & AI gateway · **MVP**
- [ ] `context-engineering`: Context engineering · **MVP**
- [ ] `rag-retrieval`: RAG & retrieval (vector DBs covered inside) · **MVP**
- [ ] `workflows-vs-agents`: Workflows vs agents · **MVP**
- [ ] `agent-runtime`: Agent runtime & durability
- [ ] `mcp-a2a`: Agent protocols: MCP & A2A · **MVP**
- [ ] `agent-security`: Agent security (lethal trifecta, sandboxing) · **MVP**
- [ ] `evals-ai-observability`: Evals & AI observability · **MVP**
- [ ] `guardrails-oversight`: Guardrails & human oversight · **MVP**
- [ ] `inference-serving`: Inference serving (when to self-host)
- [ ] `ai-cost-latency`: AI cost & latency
- [ ] `ai-governance`: AI governance (EU AI Act)

## 12 · Architect's craft
- [ ] `adrs`: Architecture Decision Records · **MVP**
- [ ] `c4-model`: C4 model
- [ ] `fitness-functions`: Fitness functions
- [ ] `conway-team-topologies`: Conway's law & team topologies
- [ ] `strangler-fig`: Strangler fig & incremental migrations
- [ ] `tech-debt`: Technical debt
- [ ] `hexagonal-clean`: Hexagonal / clean architecture
- [ ] `finops`: FinOps & cost-aware architecture
- [ ] `sustainability`: Sustainable architecture
- [ ] `coding-agents`: Architecture with coding agents

## 13 · Reference architectures
- [ ] `ref-news-feed`: News feed
- [ ] `ref-chat`: Chat / messaging
- [ ] `ref-payments`: Payments
- [ ] `ref-search`: Search
- [ ] `ref-rag-assistant`: RAG assistant

---

**Totals:** 83 cards · 41 MVP · 0 published · 1 drafting

The MVP is the research agent's 35-card cut, with the cards it had merged split back into separate decision cards.
