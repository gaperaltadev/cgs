# Sistema Digital CGS Paraguay
## Propuesta Ejecutiva — Transformación Digital en 3 Etapas

**Preparado por:** Gabriel Peralta  
**Fecha:** Mayo 2026  
**Versión:** 1.0

---

## Resumen Ejecutivo

CGS Paraguay cuenta hoy con una landing page profesional que presenta los productos YPF al mercado. El siguiente paso natural es convertir esa presencia digital en un **sistema operativo que trabaje para el negocio 24/7**: catálogo gestionable sin depender del equipo técnico, bot de WhatsApp para los vendedores y automatización de redes sociales.

Esta propuesta describe un plan de 3 etapas que puede ejecutarse en 6 meses, con inversión mensual menor a USD 150, y que generará ahorros de tiempo y captación de clientes medibles desde el primer mes.

---

## Diagnóstico: Dónde Estamos Hoy

| Capacidad | Estado actual | Impacto del problema |
|---|---|---|
| Sitio web | Operativo ✓ | — |
| Actualizar catálogo de productos | Requiere programador | Dependencia técnica, demoras de 1-5 días |
| Atención de consultas WhatsApp | Manual, fuera de hora | Pérdida de leads nocturnos y de fin de semana |
| Publicación en redes sociales | Manual, irregular | Baja frecuencia = menor alcance orgánico |
| Seguimiento de clientes | Sin sistema | Oportunidades perdidas, sin historial |

**El problema central:** el equipo de ventas pierde tiempo en tareas repetitivas que pueden automatizarse, y los clientes esperan respuestas que no llegan fuera del horario laboral.

---

## Propuesta: Sistema Digital CGS en 3 Etapas

### Etapa 1 — Catálogo en la Nube (4 semanas)

**¿Qué resuelve?** Cualquier persona del equipo CGS puede agregar, editar o eliminar productos del catálogo directamente desde el navegador, sin tocar código, sin llamar al desarrollador.

**¿Cómo funciona?**
- El catálogo deja de guardarse "en el sitio web" y pasa a una base de datos en la nube
- El Panel de Administración (ya existente) se conecta a esa base de datos
- Cualquier cambio que el administrador haga se refleja en el sitio público **en segundos**
- El acceso está protegido por usuario y contraseña propios de cada administrador

**Beneficios concretos:**
- Lanzar un producto nuevo el mismo día que llega al depósito
- Actualizar precios o disponibilidad sin intermediarios
- El equipo de CGS tiene el control total de su catálogo

**Inversión:** USD 0/mes (Supabase plan gratuito cubre el volumen de CGS)  
**Tiempo de implementación:** 2-3 días (el código ya está preparado)

---

### Etapa 2 — Bot de WhatsApp para Vendedores (6 semanas desde Etapa 1)

**¿Qué resuelve?** Los vendedores de CGS y los clientes pueden consultar el catálogo, precios y disponibilidad por WhatsApp con respuestas automáticas e instantáneas, 24 horas al día.

**¿Cómo funciona?**
Un número de WhatsApp Business recibe mensajes y responde automáticamente:

| El cliente escribe... | El bot responde con... |
|---|---|
| `precio 10w40` | Lista de aceites 10W-40 con nombre, tecnología y link al sitio |
| `catalogo motos` | Lista completa de línea RÖD |
| `cotizar 20 litros elaion` | Mensaje listo para que un vendedor confirme |
| Cualquier mensaje de bienvenida | Menú de opciones disponibles |

**Beneficios concretos:**
- Atención automática fuera del horario laboral (fines de semana, noche)
- Vendedores consultan el catálogo actualizado desde WhatsApp, sin buscar catálogos físicos
- Leads captados automáticamente con nombre y número para seguimiento

**Inversión:** USD 10-30/mes (servidor VPS) + USD 0 para WhatsApp Business básico  
**Opción premium:** WhatsApp Business Cloud API (oficial Meta) a USD 15-50/mes según volumen

---

### Etapa 3 — Automatización de Redes Sociales (8 semanas desde Etapa 1)

**¿Qué resuelve?** Facebook e Instagram de CGS se actualizan automáticamente cuando el equipo agrega un producto nuevo o programa una publicación desde el panel de administración, sin que nadie tenga que hacerlo manualmente.

**¿Cómo funciona?**
- Cuando se agrega un producto al catálogo → se genera automáticamente una publicación en Instagram y Facebook
- El administrador puede programar publicaciones temáticas (promociones, consejos de lubricación) desde el panel
- Las estadísticas de engagement se consolidan en un reporte semanal

**Beneficios concretos:**
- Presencia consistente en redes sin tiempo extra del equipo
- Cada producto nuevo tiene su publicación inmediata
- Mayor alcance orgánico = más leads = más ventas

**Inversión:** USD 20/mes (n8n.cloud) o USD 0 si se auto-hospeda en el servidor de la Etapa 2

---

## Inversión Total por Etapa

| Etapa | Inversión inicial | Costo mensual | Tiempo estimado |
|---|---|---|---|
| 1 — Catálogo en la nube | USD 0 | USD 0 | 1 semana |
| 2 — Bot WhatsApp | USD 0 | USD 10-30 | 3-4 semanas |
| 3 — Automatización redes | USD 0 | USD 0-20 | 2-3 semanas |
| **Total** | **USD 0** | **USD 10-50/mes** | **~2 meses** |

*La inversión de implementación está incluida en el costo del equipo de desarrollo actual.*

---

## ROI Estimado

| Beneficio | Estimación conservadora |
|---|---|
| Tiempo del equipo ahorrado en actualizaciones de catálogo | 4 horas/semana → USD 100/mes |
| Leads capturados fuera de horario laboral | 2-5 consultas adicionales/semana |
| Mayor frecuencia en redes sociales | +30% alcance orgánico estimado |
| Reducción de consultas repetitivas por teléfono | -40% llamadas de "¿tienen X producto?" |

**Punto de equilibrio:** El sistema se paga solo con capturar 1-2 ventas adicionales por mes generadas por la atención automática fuera de horario.

---

## Roadmap Visual

```
Mes 1          Mes 2          Mes 3          Mes 4-6
───────────    ───────────    ───────────    ───────────
[ETAPA 1  ]   [ETAPA 2  ]   [ETAPA 3  ]   [MEJORAS  ]
Catálogo  →   Bot WhatsApp → Auto-redes  → CRM + Analytics
en la nube    para ventas    sociales       (Etapa 4)
```

---

## Próximos Pasos

1. **Esta semana:** Configurar cuenta Supabase (15 minutos) → catálogo en la nube listo
2. **Mes 1:** Definir número de WhatsApp Business para el bot
3. **Mes 2:** Configurar cuentas de Facebook/Instagram Business para automatización
4. **Mes 3:** Revisar métricas y ajustar workflows según uso real

---

*Para la documentación técnica detallada, ver `docs/PROPUESTA_TECNICA.md`*
