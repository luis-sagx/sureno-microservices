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
- Estrategia de entrega: `ask-on-risk` (predeterminada). Pronóstico inicial: más de 400 líneas modificadas (aprox. 900–1400; quedó corto frente al conteo real). Estrategia de cadena fijada en `feature-branch-chain` por la instrucción explícita del usuario de hacer todo en `feat/sureno-microservices-foundation`. Conteo acumulado observado: HAC-1 = 1.295, HAC-2 = 845 y HAC-3 = 1.636 líneas añadidas + eliminadas (archivos generados excluidos), 3.776 en total. Los límites alcanzados corresponden a work units coherentes por servicio/flujo; los tres commits quedan como slices separados, sin PR remoto.
- El branch actual es `feat/sureno-microservices-foundation`. No hacer push, PR ni merge.

## Tareas

- [x] **HAC-1 — Identidad y registro en ms-auth.** Separar validación/reglas y casos de uso de TypeORM; crear puertos de identidad/transacción y adaptadores de persistencia/password hashing; cablear el módulo. Mantener registros B2C/B2B, revisión, errores y respuestas. Ruta: delegated direct; disparadores: lectura preparatoria de más de 4 archivos y escritura de múltiples archivos no triviales. Implementación comprometida como `2163f0f`; pruebas focalizadas/build/lint pasan. Suite API pendiente de base de prueba configurada.
- [x] **HAC-2 — Sesiones y autorización en ms-auth.** Separar casos de uso de sesión y verificación/token de persistencia SQL; introducir puertos y adaptadores de sesión/credenciales; dejar cookies y HTTP como adaptadores de borde. Preservar login/logout/me, cookies, expiraciones, revocación, bearer/cookie y roles. Ruta: delegated direct; disparadores: múltiples archivos no triviales y límites de seguridad/persistencia. Implementación comprometida como `021f685`; pruebas focalizadas/build/lint pasan. Suite API pendiente de base de prueba configurada.
- [x] **HAC-3 — Catálogo en ms-catalog.** Extraer reglas/casos de uso, puerto de catálogo, adaptador TypeORM y puerto/adaptador HTTP de MS01 para autorización; mantener Nest como borde. Preservar búsquedas, filtros, páginas, CRUD, presentaciones, auditoría y errores. Ruta: delegated direct; disparadores: preparación de varios archivos y escritura de múltiples archivos no triviales. Comprometida como `12d0b66`; pruebas focalizadas/build/lint pasan. La integración PostgreSQL queda pendiente por falta de contraseña válida para la base de prueba.
- [x] **HAC-4 — Verificación integral y documentación interna.** Documentar la estructura final de capas/puertos y ejecutar pruebas focalizadas, suites, builds, lint y revisión de diff. Ruta: delegated direct para revisión/verificación; revisión final cubrió ambos servicios. Guía agregada en `docs/architecture/hexagonal-auth-catalog.md`, enlazada desde `README.md`. Builds, lint y pruebas focalizadas pasan en ambos servicios; suites completas intentadas y bloqueadas en `beforeAll` por la configuración PostgreSQL ausente. El criterio de aceptación 5 para integración permanece pendiente; no se considera verificado.

## Progreso y evidencia

- Exploración: CodeGraph inicializado con `codegraph init`; consultas cubrieron controladores, módulos, servicios, entidades, validación y pruebas de ambos servicios.
- Contratos/riesgos observados: tests de integración de `ms-auth/src/identity-registration.spec.ts`, `ms-auth/src/identity-session.spec.ts` y `ms-catalog/src/catalog.spec.ts`; esquemas se cargan con migraciones y `synchronize:false`. Mantener esas pruebas como control de compatibilidad.
- Mapeo delegado read-only completado. No se editaron fuentes ni se ejecutaron pruebas.
- Diseño documentado en commit `d78c856` y aprobado por el usuario. La mirror Engram sigue pendiente: `engram save` no pudo abrir `/home/luissagnay/.engram/.instance-id.lock` porque la ruta es de solo lectura en este entorno.
- **HAC-1 implementada y comprometida** como `2163f0f` (`refactor(ms-auth): isolate identity and persistence`); la implementación y verificaciones disponibles están completadas. Las pruebas de integración siguen pendientes de PostgreSQL de prueba.
- RED observado para `registration-validation.spec.ts`: la aserción esperaba `IdentityValidationError` (código `bad_request`) y obtuvo `BadRequestException`.
- RED observado para el límite de `IdentityService`: tests ejecutaron y fallaron porque el servicio aún no delegaba al puerto y el UUID inválido emitía `BadRequestException`.
- GREEN/foco actual: `pnpm exec vitest run src/identity/registration-validation.spec.ts src/identity/identity.service.spec.ts` — 4/4 pruebas pasan; el test verifica que la contraseña original llega al hasher y que el puerto de persistencia solo recibe datos normalizados más el hash.
- Checks actuales: `pnpm build` y `pnpm lint` en `ms-auth` pasan; `git diff --check` pasa. `pnpm test` resulta en 3 archivos aprobados y 2 suites de integración fallidas antes de ejecutar casos: `identity-registration.spec.ts` e `identity-session.spec.ts` no conectan porque PostgreSQL recibe una contraseña no-string (`SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`), seguido de timeout del `beforeAll` a 10 s.
- HAC-1 quedó comprometida en `2163f0f` con cambios en `ms-auth/src/identity/` (controller, module, application/domain/infrastructure, exception filter, servicio barrel, hashing, validación y pruebas). Las modificaciones previas de `frontend/`, `odd/tasks/sureno-storefront-visual-refresh.md` y assets continúan fuera de alcance.
- Revisión del padre vía CodeGraph: domain/application no importan Nest, Express, TypeORM ni SQL; Nest conecta puertos a adaptadores; el controlador aplica el mapeo de errores y el adaptador conserva transacciones/consultas de registro y revisión. No se encontró una regresión observable en los límites revisados.
- La mirror Engram sigue pendiente por falta de escritura en `/home/luissagnay/.engram/.instance-id.lock`; tampoco hay comando `gentle-ai` para evaluar RDD en este entorno.
- Tras el commit `2163f0f`, el assessment y preflight RDD quedaron no disponibles porque el binario `gentle-ai` no existe en el entorno. No se infirió nivel de riesgo ni se cambió consentimiento/autoridad.
- HAC-2 está comprometida como `021f685` (`refactor(ms-auth): isolate session ports and adapters`). Su assessment y preflight RDD también quedaron no disponibles porque `gentle-ai` no está instalado; no se infirió nivel de riesgo ni se cambió consentimiento/autoridad.
- **HAC-2 RED/GREEN**: cuatro pruebas de aplicación ejecutaron y fallaron por aserción antes de implementar los puertos (login no delegaba credenciales normalizadas, timeout admin no se devolvía, authenticate no consultaba/refrescaba por puerto, logout no delegaba revocación); luego `pnpm exec vitest run src/sessions/session.service.spec.ts` pasó 4/4. El test de logout verifica delegación de revocación con el payload del token.
- El spec inicial de `HmacSessionTokenAdapter` solo detectaba export ausente y fue retirado tras revisión; no se reporta como RED. El adaptador HMAC preserva mecánicamente el formato y verificación previos (claims sid/sub, JSON base64url, HMAC-SHA256, secreto mínimo de 32 caracteres, comparación timingSafeEqual y validación UUID). La cobertura de protocolo mediante API permanece sin observar porque la integración no conecta a PostgreSQL.
- HAC-2 checks: `pnpm build`, `pnpm lint` y `git diff --check` en `ms-auth` pasan. Con secreto de prueba temporal, `pnpm test` ejecuta 9 pruebas exitosas y omite 10; `identity-registration.spec.ts` e `identity-session.spec.ts` fallan en `beforeAll` por timeout de 10 s al no conectar la base de datos. Sin la variable temporal, se observa `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`; AppModule lee `AUTH_DB_PASSWORD` del entorno.
- HAC-2 toca solo `ms-auth/src/sessions/` y este documento: nuevos puertos/casos de uso en `application`, error propio en `domain`, repositorio TypeORM y adaptadores de token HMAC/verificación scrypt en `infrastructure`, cableado del módulo y mapeo HTTP en controller/guard. No se cambió la cookie ni la extracción Bearer/cookie.
- Revisión del padre vía CodeGraph confirmó que domain/application de sesiones no importan NestJS, Express, TypeORM ni SQL, y que la query de sesión, respuesta de usuario, idle timeout, renovación, revocación, cookies y mapeo HTTP conservan el flujo existente. Revisión final terminada; HAC-2 está lista para commit.
- **HAC-3 RED/GREEN**: ocho pruebas focalizadas ejecutaron y fallaron por aserción antes de implementar los casos de uso/puertos; luego `pnpm exec vitest run src/catalog/catalog.service.spec.ts` pasó 8/8. Cubren listado de categorías/productos y delegación de filtros/paginación, normalización de CRUD de categoría/producto y presentaciones, actor de disponibilidad, prohibición de cambiar `disponible` por CRUD y traducción del error de autorización.
- HAC-3 checks: `pnpm build`, `pnpm lint` y `git diff --check` en `ms-catalog` pasan. `pnpm test` termina con 9 pruebas aprobadas y 4 omitidas, pero `src/catalog.spec.ts` no puede completar su `beforeAll` (timeout de 10 s): TypeORM reporta `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`. No se cambiaron credenciales ni configuración; la integración queda pendiente de PostgreSQL de prueba configurado.
- HAC-3 arquitectura revisada con CodeGraph: domain/application contienen modelos, errores, validaciones puras y puertos sin imports de NestJS, Express, TypeORM ni SQL; el controlador/guard y filtro son el borde Nest; `TypeOrmCatalogRepository` y `Ms01AuthClient` son adaptadores de salida cableados por tokens en `CatalogModule`. Se preservaron rutas/controlador, filtros, orden y paginación; transacciones de producto, cascada de presentaciones, lock y auditoría de disponibilidad permanecen en el adaptador TypeORM. No se modificaron entidades ni migraciones.
- HAC-3 archivos modificados/agregados dentro de `ms-catalog`: `src/auth/catalog-admin.guard.ts`, `src/auth/ms01-auth-client.ts`, `src/catalog/catalog.controller.ts`, `src/catalog/catalog.module.ts`, `src/catalog/catalog.service.ts`, `src/catalog/catalog-exception.filter.ts`, `src/catalog/catalog.service.spec.ts`, `src/catalog/application/catalog-auth.port.ts`, `src/catalog/application/catalog.repository.ts`, `src/catalog/application/catalog.service.ts`, `src/catalog/application/catalog.tokens.ts`, `src/catalog/domain/catalog-auth-error.ts`, `src/catalog/domain/catalog-error.ts`, `src/catalog/domain/catalog-model.ts`, `src/catalog/domain/catalog-validation.ts`, `src/catalog/infrastructure/persistence/typeorm-catalog.repository.ts`.
- Revisión del padre vía CodeGraph confirmó el cableado de auth, el mapeo de error y el filtro HTTP; no encontró cambios en esquema ni migraciones.
- HAC-3 está comprometida como `12d0b66` (`refactor(ms-catalog): isolate catalog domain and adapters`). El assessment y preflight RDD no estuvieron disponibles porque `gentle-ai` no está instalado; no se infirió nivel de riesgo ni se cambió consentimiento/autoridad.
- HAC-4 verificación: `ms-auth` y `ms-catalog` pasan `pnpm build` y `pnpm lint`; las pruebas focalizadas pasan (`ms-auth`: 8/8 entre tres archivos; `ms-catalog`: 8/8). `git diff --check` pasa. Suites completas intentadas: `ms-auth` 9 aprobadas/10 omitidas y suites de integración sin inicializar por timeout al no contar con `AUTH_DB_PASSWORD` válido; `ms-catalog` 9 aprobadas/4 omitidas y `src/catalog.spec.ts` sin inicializar por timeout al no contar con `CATALOG_DB_PASSWORD` válido. No se usó una base de datos real no aislada. El criterio de aceptación 5 queda pendiente hasta ejecutar esas suites con una base de prueba configurada.
- La guía `docs/architecture/hexagonal-auth-catalog.md` describe el flujo de dependencias, ubicación por capa, puertos, aplicación de SOLID y comandos de verificación; `README.md` enlaza la guía.
- El diff de HAC-4 contiene únicamente `README.md`, `docs/architecture/hexagonal-auth-catalog.md` y este documento. Se preservan sin stage los cambios preexistentes de frontend y otros archivos fuera de alcance.
- La mirror Engram sigue pendiente por el bloqueo de escritura ya registrado.

## Próximo paso

Configurar credenciales de PostgreSQL de prueba aislada en el entorno y volver a ejecutar las suites de integración de ambos servicios para cerrar el criterio de aceptación 5. Hasta entonces, los cambios están implementados y las verificaciones locales disponibles pasan, pero la compatibilidad de integración permanece pendiente. No hacer push, PR ni merge. Mantener las modificaciones previas ajenas a este alcance intactas.
