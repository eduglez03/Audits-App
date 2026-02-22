# Audits — Mini módulo de Auditorías

Aplicación web para gestión de auditorías y sus checklists, construida como prueba técnica. Interfaz de producto con diseño inspirado en Anthropic (paleta arena/coral, tipografía DM Serif + DM Sans).

## 🚀 Arranque rápido

```bash
# Instalar dependencias
npm install

# Arrancar en desarrollo
npm run dev

# Build de producción
npm run build
```

La app estará disponible en `http://localhost:5173`.

## 🗂️ Estructura del proyecto

```
src/
├── components/
│   ├── layout/       # AppLayout (sidebar + topbar)
│   └── ui/           # Componentes reutilizables (Badge, Button, Card, etc.)
├── data/
│   └── mockData.ts   # Dataset: 60 auditorías, 10 plantillas, 10 responsables
├── pages/
│   ├── AuditsPage.tsx       # Listado con filtros, búsqueda, paginación
│   ├── CreateAuditPage.tsx  # Wizard 2 pasos
│   └── AuditDetailPage.tsx  # Detalle + ejecución progresiva
├── services/
│   └── api.ts        # Capa de datos (mocks con latencia, errores, paginación)
└── types/
    └── index.ts      # Tipos TypeScript
```

## 🛠️ Decisiones técnicas

### Stack elegido: React 18 + Vite + TypeScript + Tailwind CSS

**React + Vite**: SPA sin SSR (no hace falta para este caso de uso). Vite por su velocidad de HMR y build, frente a CRA o Next.js que añadirían complejidad innecesaria.

**TypeScript**: Tipado estricto, especialmente útil para los contratos de la API simulada y los estados de los modelos.

**Tailwind CSS**: Permite iterar rápido en diseño sin salir del JSX. Tokens personalizados para replicar la estética Anthropic (paleta arena/coral, sombras suaves).

**Sin librería de estado global (Zustand/Redux)**: El estado es local a cada página + polling. Con más tiempo añadiría React Query o SWR para cache, deduplicación de requests y gestión de estado servidor.

**React Router v6**: Para mantener filtros en URL (query params), historial de navegación y navegación declarativa.

### API simulada

Estrategia: módulo TypeScript puro con estado en memoria (arrays mutables). Justificación:

- Sin servidor adicional (json-server, MSW) que requiera setup
- Control total sobre el comportamiento (latencias, errores, progreso de ejecución)
- Fácil de entender y testear

**Latencia variable**: `300–1200ms` por request.

**Errores aleatorios**: 12% de probabilidad (configurable en `api.ts` → `ERROR_RATE`).

**Paginación server-side**: El store filtra, ordena y pagina en memoria, devolviendo `{ items, total, page, pageSize }`.

**Ejecución progresiva**: `runAudit()` dispara `simulateExecution()` en background (loop async). El cliente hace polling cada 800ms con `getAuditFromStore()` (acceso directo al store, sin latencia/errores) para no saturar la UI con errores aleatorios durante la ejecución.

**Probabilidad de KO**: 15% por check en ejecución automática (configurable → `KO_PROBABILITY`).

### Ejecución de checks: flujo manual + automático

Dos modalidades coexisten:
1. **Automática**: al pulsar "Ejecutar auditoría", todos los checks pasan por `PENDING → QUEUED → RUNNING → OK/KO`.
2. **Manual**: cuando el status de la auditoría es `IN_PROGRESS` y el check está en `PENDING`, el evaluador puede marcarlo manualmente como OK/KO con **UI optimista** (el estado se actualiza inmediatamente, con rollback si falla).

### Estado final de auditoría

- Todos OK → `DONE`
- Algún KO → `BLOCKED` (en lugar de un estado nuevo `DONE_WITH_INCIDENTS`, preferí `BLOCKED` que ya está en el modelo y comunica mejor que hay algo que bloquea el cierre)

## 🎨 Diseño

Inspirado en la UI de Anthropic:
- **Paleta**: fondo arena (`#faf9f6`), superficies blancas, acento coral (`#cc4420`)
- **Tipografía**: DM Serif Display (headings) + DM Sans (cuerpo)
- **Sombras**: sutiles, tipo `box-shadow` suave en vez de bordes gruesos
- **Estados**: skeleton loaders, empty states con CTA, error states con reintento

## 📋 Funcionalidades implementadas

- [x] Listado de auditorías con tabla + búsqueda + filtros (estado, proceso, responsable)
- [x] Ordenación por múltiples criterios
- [x] Paginación server-side simulada
- [x] Filtros persistidos en URL (query params)
- [x] Estados de UI: skeleton loader, error con reintento, empty state con CTA
- [x] Wizard 2 pasos con validación (paso 2 bloqueado si paso 1 incompleto)
- [x] Detalle de auditoría con resumen, progreso y listado de checks
- [x] Ejecución progresiva con polling en tiempo real
- [x] Evaluación manual OK/KO con UI optimista + rollback
- [x] Evidencias expandibles por check
- [x] Toast notifications
- [x] Responsive (sidebar fijo en desktop)

## 🔜 Mejoras pendientes (con más tiempo)

1. **React Query / SWR**: cache de requests, background refetch, optimistic updates más robustas.
2. **Tests**: unit tests para la capa `api.ts` (jest), smoke test e2e del wizard (Playwright).
3. **Modo offline**: service worker + cache del último listado + banner de aviso.
4. **Accesibilidad**: aria-labels en iconos, gestión de foco en modal/wizard, anuncio de cambios de estado con `aria-live`.
5. **Dashboard**: métricas agregadas por proceso/estado.
6. **Exportación**: CSV del listado de checks de una auditoría.
7. **Docker**: `Dockerfile` con build multistage + nginx para servir el build.
8. **Búsqueda en checks**: filtrar por prioridad o estado dentro del detalle.
9. **Comentarios por check**: historial de notas con timestamp.
10. **Autenticación simulada**: cambiar de usuario responsable afecta los filtros de "mis auditorías".

## ⚙️ Variables de configuración (en `src/services/api.ts`)

```ts
const ERROR_RATE = 0.12      // Tasa de error (0-1)
const MIN_LATENCY = 300      // ms mínimo por request
const MAX_LATENCY = 1200     // ms máximo por request
const KO_PROBABILITY = 0.15  // Probabilidad de KO en ejecución automática
```
