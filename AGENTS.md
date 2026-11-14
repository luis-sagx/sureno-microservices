# Repository-wide development rules

## Test-driven development

- Use TDD for every behavior change in this repository, including new features and bug fixes: write or update a focused test first, run it and confirm it fails for the expected reason (RED), make the smallest change that passes it (GREEN), then refactor while keeping the test green (REFACTOR).
- Do not implement behavior before observing the relevant failing test. If a change cannot be meaningfully covered by an automated test, explain why and use the closest practical verification; do not invent RED evidence.
- Follow the affected app's existing test framework and commands. Keep tests alongside the behavior they cover.

## Hexagonal architecture for microservices

- Structure every microservice around ports and adapters, with dependencies pointing inward: domain rules remain independent of frameworks and infrastructure; application use cases coordinate domain behavior through ports; infrastructure implements outbound ports; inbound adapters (such as HTTP controllers or message handlers) translate external requests into application calls.
- Keep persistence, network clients, framework decorators, and transport-specific details out of the domain and application core. Define interfaces at the boundary and provide implementations through the microservice's dependency-injection wiring.
- Keep inbound adapters focused on transport concerns such as mapping, validation, and response formatting. Put business decisions in the domain or application layer, and persistence logic in outbound adapters.
- Preserve these boundaries when extending an existing service. When a change would cross them, explain the reason and keep the coupling at the narrowest boundary possible.
