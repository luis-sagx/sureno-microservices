# Arquitectura hexagonal para ms-auth y ms-catalog

Repository task file: `odd/tasks/hexagonal-auth-catalog.md`

## Objetivo

Refactorizar internamente `ms-auth` y `ms-catalog` hacia arquitectura hexagonal para facilitar su extensión y mantenimiento, aplicando SOLID sin alterar los contratos ni el comportamiento observable de los servicios.

## Problema y motivo

La exploración con CodeGraph encontró que `IdentityService` y `SessionService` combinan casos de uso con SQL/TypeORM, seguridad y lógica de sesión. `CatalogService` mezcla reglas, validación, persistencia y formato de respuestas. Los controladores y módulos Nest dependen directamente de estos servicios concretos. Esto dificulta probar reglas de forma aislada y cambiar adaptadores.

## Diseño aprobado

- Mantener NestJS como adaptador de entrada HTTP y raíz de composición de dependencias.
- Separar reglas de negocio puras en `domain`, casos de uso en `application`, y adaptadores externos en `infrastructure`.
- Definir puertos pequeños en application para persistencia/transacciones y servicios externos (hash de contraseña, autenticación MS01); implementar adaptadores TypeORM/PostgreSQL, criptografía y HTTP en infrastructure.
- Evitar acoplar domain/application a NestJS, Express, TypeORM o SQL. Mapear errores de aplicación a los mismos códigos y mensajes HTTP actuales en el borde.
- Migrar por flujos y conservar las rutas, payloads, respuestas, cookies, roles, validaciones, reglas de negocio, transacciones, auditoría, entidades y migraciones actuales.
- No introducir capas o abstracciones genéricas si no aíslan un límite externo o una responsabilidad concreta.

## Alcance y restricciones

Incluye registro individual/comercial, revisión administrativa y sesiones/autorización en `ms-auth`; consultas, CRUD, disponibilidad e integración de autorización administrativa en `ms-catalog`; módulos Nest y pruebas necesarias.

No incluye cambios al frontend, a los contratos HTTP, a las migraciones/esquema, a la integración remota, ni a otros servicios. Hay modificaciones preexistentes en `frontend/` y archivos sin seguimiento; deben permanecer intactos.

## Criterios de aceptación

1. Domain y application no importan NestJS, Express ni TypeORM.
2. Los casos de uso dependen de puertos/interfaces y no de adaptadores concretos.
3. Los módulos Nest conectan explícitamente casos de uso con adaptadores.
4. Se conservan rutas, payloads, respuestas, errores, cookies, expiraciones, autorización y reglas de datos existentes.
5. Los casos de uso críticos tienen pruebas aisladas con adaptadores falsos y los tests de integración existentes siguen pasando.
6. Compilan y pasan los checks funcionales aplicables en ambos microservicios.

## Modo de pruebas

- Runner identificado: Vitest (`pnpm test`, `pnpm test:e2e` desde cada servicio); build: `pnpm build`.
- Modo TDD: habilitado explícitamente por el usuario el 2026-11-14; fuente: respuesta del usuario. Secuencia requerida: RED → GREEN → REFACTOR. Runner exacto: Vitest (`pnpm test` desde el directorio del servicio; prueba focalizada con `pnpm exec vitest run <archivo>`).
- Revisión por commit: `gentle-ai review mode status` no está disponible en el entorno (`gentle-ai: command not found`). RDD queda como estado no verificable; no iniciar revisión nativa sin confirmar el modo.

## Estrategia de entrega

- Ruta ODD: delegated direct para las tareas que abarcan varios archivos. Evidencia: el mapeo requerido cubrió más de cuatro archivos en dos servicios; la implementación necesaria modifica múltiples archivos no triviales. No se seleccionó SDD.
- Delegar mapeo read-only completado antes de la escritura; sus hallazgos se reconciliaron con CodeGraph.
- Estrategia de entrega: `ask-on-risk` (predeterminada). Pronóstico inicial: más de 400 líneas modificadas (aprox. 900–1400). Estrategia de cadena fijada en `feature-branch-chain` por la instrucción explícita del usuario de hacer todo en `feat/sureno-microservices-foundation`. Conteo acumulado observado: HAC-1 = 1.295 líneas añadidas + eliminadas (archivos generados excluidos). Límite alcanzado dentro de un work unit coherente de registro/revisión; mantener este commit como primer slice, sin PR remoto.
- El branch actual es `feat/sureno-microservices-foundation`. No hacer push, PR ni merge.

## Tareas

- [ ] **HAC-1 — Identidad y registro en ms-auth.** Separar validación/reglas y casos de uso de TypeORM; crear puertos de identidad/transacción y adaptadores de persistencia/password hashing; cablear el módulo. Mantener registros B2C/B2B, revisión, errores y respuestas. Ruta: delegated direct; disparadores: lectura preparatoria de más de 4 archivos y escritura de múltiples archivos no triviales.
- [ ] **HAC-2 — Sesiones y autorización en ms-auth.** Separar casos de uso de sesión y verificación/token de persistencia SQL; introducir puertos y adaptadores de sesión/credenciales; dejar cookies y HTTP como adaptadores de borde. Preservar login/logout/me, cookies, expiraciones, revocación, bearer/cookie y roles. Ruta: delegated direct; disparadores: múltiples archivos no triviales y límites de seguridad/persistencia. Implementación revisada por el padre; integración API pendiente de PostgreSQL.
- [ ] **HAC-3 — Catálogo en ms-catalog.** Extraer reglas/casos de uso, puerto de catálogo, adaptador TypeORM y puerto/adaptador HTTP de MS01 para autorización; mantener Nest como borde. Preservar búsquedas, filtros, páginas, CRUD, presentaciones, auditoría y errores. Ruta: delegated direct; disparadores: preparación de varios archivos y escritura de múltiples archivos no triviales.
- [ ] **HAC-4 — Verificación integral y documentación interna.** Ejecutar suites aplicables y builds de ambos servicios, corregir regresiones dentro del alcance y dejar documentada la estructura final de capas/puertos. Ruta: delegated direct para revisión/verificación si se requieren cambios multiarchivo; no alterar contratos externos.

## Progreso y evidencia

- Exploración: CodeGraph inicializado con `codegraph init`; consultas cubrieron controladores, módulos, servicios, entidades, validación y pruebas de ambos servicios.
- Contratos/riesgos observados: tests de integración de `ms-auth/src/identity-registration.spec.ts`, `ms-auth/src/identity-session.spec.ts` y `ms-catalog/src/catalog.spec.ts`; esquemas se cargan con migraciones y `synchronize:false`. Mantener esas pruebas como control de compatibilidad.
- Mapeo delegado read-only completado. No se editaron fuentes ni se ejecutaron pruebas.
- Diseño documentado en commit `d78c856` y aprobado por el usuario. La mirror Engram sigue pendiente: `engram save` no pudo abrir `/home/luissagnay/.engram/.instance-id.lock` porque la ruta es de solo lectura en este entorno.
- **HAC-1 implementada y comprometida** como `2163f0f` (`refactor(ms-auth): isolate identity and persistence`); su checkbox permanece abierto hasta reintentar las suites de integración porque no pudieron iniciar la base de datos.
- RED observado para `registration-validation.spec.ts`: la aserción esperaba `IdentityValidationError` (código `bad_request`) y obtuvo `BadRequestException`.
- RED observado para el límite de `IdentityService`: tests ejecutaron y fallaron porque el servicio aún no delegaba al puerto y el UUID inválido emitía `BadRequestException`.
- GREEN/foco actual: `pnpm exec vitest run src/identity/registration-validation.spec.ts src/identity/identity.service.spec.ts` — 4/4 pruebas pasan; el test verifica que la contraseña original llega al hasher y que el puerto de persistencia solo recibe datos normalizados más el hash.
- Checks actuales: `pnpm build` y `pnpm lint` en `ms-auth` pasan; `git diff --check` pasa. `pnpm test` resulta en 3 archivos aprobados y 2 suites de integración fallidas antes de ejecutar casos: `identity-registration.spec.ts` e `identity-session.spec.ts` no conectan porque PostgreSQL recibe una contraseña no-string (`SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`), seguido de timeout del `beforeAll` a 10 s.
- HAC-1 deja en el árbol de trabajo cambios en `ms-auth/src/identity/` (controller, module, application/domain/infrastructure, exception filter, servicio barrel, hashing, validación y pruebas). Solo se tocaron archivos de identidad dentro de `ms-auth`; modificaciones previas de `frontend/`, `odd/tasks/sureno-storefront-visual-refresh.md` y assets continúan fuera de alcance.
- Revisión del padre vía CodeGraph: domain/application no importan Nest, Express, TypeORM ni SQL; Nest conecta puertos a adaptadores; el controlador aplica el mapeo de errores y el adaptador conserva transacciones/consultas de registro y revisión. No se encontró una regresión observable en los límites revisados.
- La mirror Engram sigue pendiente por falta de escritura en `/home/luissagnay/.engram/.instance-id.lock`; tampoco hay comando `gentle-ai` para evaluar RDD en este entorno.
- Tras el commit `2163f0f`, el assessment y preflight RDD quedaron no disponibles porque el binario `gentle-ai` no existe en el entorno. No se infirió nivel de riesgo ni se cambió consentimiento/autoridad.
- **HAC-2 RED/GREEN**: cuatro pruebas de aplicación ejecutaron y fallaron por aserción antes de implementar los puertos (login no delegaba credenciales normalizadas, timeout admin no se devolvía, authenticate no consultaba/refrescaba por puerto, logout no delegaba revocación); luego `pnpm exec vitest run src/sessions/session.service.spec.ts` pasó 4/4. El test de logout verifica delegación de revocación con el payload del token.
- El spec inicial de `HmacSessionTokenAdapter` solo detectaba export ausente y fue retirado tras revisión; no se reporta como RED. El adaptador HMAC preserva mecánicamente el formato y verificación previos (claims sid/sub, JSON base64url, HMAC-SHA256, secreto mínimo de 32 caracteres, comparación timingSafeEqual y validación UUID). La cobertura de protocolo mediante API permanece sin observar porque la integración no conecta a PostgreSQL.
- HAC-2 checks: `pnpm build`, `pnpm lint` y `git diff --check` en `ms-auth` pasan. Con secreto de prueba temporal, `pnpm test` ejecuta 9 pruebas exitosas y omite 10; `identity-registration.spec.ts` e `identity-session.spec.ts` fallan en `beforeAll` por timeout de 10 s al no conectar la base de datos. Sin la variable temporal, se observa `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`; AppModule lee `AUTH_DB_PASSWORD` del entorno.
- HAC-2 toca solo `ms-auth/src/sessions/` y este documento: nuevos puertos/casos de uso en `application`, error propio en `domain`, repositorio TypeORM y adaptadores de token HMAC/verificación scrypt en `infrastructure`, cableado del módulo y mapeo HTTP en controller/guard. No se cambió la cookie ni la extracción Bearer/cookie.
- Revisión del padre vía CodeGraph confirmó que domain/application de sesiones no importan NestJS, Express, TypeORM ni SQL, y que la query de sesión, respuesta de usuario, idle timeout, renovación, revocación, cookies y mapeo HTTP conservan el flujo existente. Revisión final terminada; HAC-2 está lista para commit.

## Próximo paso

Cometer HAC-2 como unidad en esta misma rama y guardar su hash en el documento después del commit. Luego iniciar HAC-3; reintentar las suites de integración al completar los microservicios con una conexión PostgreSQL de prueba configurada. Mantener las modificaciones previas ajenas a este alcance intactas.
