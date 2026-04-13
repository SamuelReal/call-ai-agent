# Call AI Agent (Node.js)

Backend inicial para agente IA de llamadas con arquitectura preparada para:
- Proveedor de telefonía: Zadarma (Telefonía)
- Proveedor de inteligencia artificial: DeepSeek (Inteligencia Artificial)
- Proveedor de transcripción voz a texto (STT): Aún sin definir
- Proveedor de transcripción texto a voz (TTS): Aún sin definir
- Caso principal: Agendamiento de citas (inbound y outbound)

## Requisitos
- Node.js 20+
- MySQL 8+ (Si se utiliza STORAGE_PROVIDER=mysql)

## Instalación
1. Obtener el repositorio:
   - git clone URL
2. Copiar y rellenar variables de entorno:
   - cp .env.example .env
3. Instalar dependencias:
   - npm install
4. Ejecutar:
   - npm run dev

## Persistencia de datos
- Por defecto: STORAGE_PROVIDER=memory.
- Para persistir clientes, estados de llamada y citas en MySQL:
  - STORAGE_PROVIDER=mysql
  - APPOINTMENTS_PROVIDER=mysql (opcional; si no se define y STORAGE_PROVIDER=mysql, usara MySQL para citas)
- El backend ejecuta las migraciones automáticamente en el primer acceso a MySQL.

Servidor por defecto:
- http://localhost:3000

## Endpoints disponibles
- GET /health
- GET /version
- POST /api/v1/telephony/zadarma/webhook
- POST /api/v1/calls/outbound
- GET /api/v1/calls/:callId
- POST /api/v1/appointments/availability
- POST /api/v1/appointments
- GET /api/v1/customers
- GET /api/v1/customers/lookup?phone=+34...
- POST /api/v1/customers
- PATCH /api/v1/customers/:phone

Nota de seguridad:
- Si INTERNAL_API_KEY esta definido, endpoints de customers y appointments requieren header x-internal-api-key.
- El webhook de Zadarma tiene rate limit en memoria configurable.

## Pruebas rápidas
### 1) Crear llamada outbound
curl -X POST http://localhost:3000/api/v1/calls/outbound \
  -H "Content-Type: application/json" \
  -d '{"phone":"+34123456789","campaign":"agendamiento"}'

### 2) Consultar disponibilidad
curl -X POST http://localhost:3000/api/v1/appointments/availability \
  -H "Content-Type: application/json" \
  -d '{"dateFrom":"2026-04-16","dateTo":"2026-04-20","timezone":"Europe/Madrid"}'

### 3) Crear cita
curl -X POST http://localhost:3000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{"name":"Cliente Demo","phone":"+34123456789","slot":"2026-04-16T09:30:00+02:00","source":"voice_bot"}'

### 4) Simular webhook de Zadarma
curl -X POST http://localhost:3000/api/v1/telephony/zadarma/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"call.started","callId":"zd_123","direction":"inbound","from":"+34","to":"+34"}'

### 5) Ejecutar flujo E2E inbound completo
npm run e2e:inbound

Opcional: definir callId personalizado
npm run e2e:inbound -- zd_prueba_99

Comportamiento actual del flujo inbound:
- Si el usuario menciona un horario reconocible (09:30, 11:00 o 16:00), el sistema intenta crear la cita automaticamente.
- Si la reserva se confirma, el estado de llamada pasa a BOOKING y guarda appointmentId.
- Si no se detecta horario, el flujo sigue por respuesta IA para recolectar preferencia.

### 6) CRUD básico de clientes
Si INTERNAL_API_KEY esta definido en entorno, estos endpoints requieren header:
-H "x-internal-api-key: <internal_api_key>"

Listar clientes:
curl -X GET "http://localhost:3000/api/v1/customers"

Consultar por teléfono:
curl -X GET "http://localhost:3000/api/v1/customers/lookup?phone=%2B34111111111"

Crear cliente:
curl -X POST "http://localhost:3000/api/v1/customers" \
  -H "x-internal-api-key: <internal_api_key>" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+34999999999","name":"Cliente Demo"}'

Actualizar nombre:
curl -X PATCH "http://localhost:3000/api/v1/customers/%2B34999999999" \
  -H "x-internal-api-key: <internal_api_key>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cliente Demo"}'

### 7) Agenda interna (con INTERNAL_API_KEY)
Consultar disponibilidad:
curl -X POST "http://localhost:3000/api/v1/appointments/availability" \
  -H "x-internal-api-key: <internal_api_key>" \
  -H "Content-Type: application/json" \
  -d '{"dateFrom":"2026-04-16","dateTo":"2026-04-20","timezone":"Europe/Madrid"}'

## Rate limits configurables
- WEBHOOK_RATE_LIMIT_MAX
- WEBHOOK_RATE_LIMIT_WINDOW_MS
- INTERNAL_RATE_LIMIT_MAX
- INTERNAL_RATE_LIMIT_WINDOW_MS

## Estado actual
Este proyecto se encuentra aún en desarrollo y no está listo para pasar a producción.