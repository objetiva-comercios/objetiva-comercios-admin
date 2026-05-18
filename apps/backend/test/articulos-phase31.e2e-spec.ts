/**
 * E2E tests for Phase 31 — Articulos PK swap + webhook payload v2
 *
 * ESTADO: SKELETON RED — Phase 31 Wave 0 (Plan 31-01)
 *
 * Estos tests cubren SC#3 y SC#4 del plan de validacion Phase 31.
 * Todos los tests están marcados con it.skip() porque las rutas y el helper
 * que necesitan no existen aún:
 *
 * SC#3 (GET /api/articulos/by-codigo/:codigo) se crea en Plan 31-03.
 * SC#4 (webhook payload.articulo.sku) depende del overwrite D-02 de Plan 31-02.
 *
 * Instruccion para desbloquear tests:
 * - Remover it.skip() de SC#3a y SC#3b cuando Plan 31-03 cree la ruta /by-codigo/:codigo
 * - Remover it.skip() de SC#4 cuando Plan 31-02 aplique el overwrite sku = stripSep(codigo)
 *   y el webhook emita payload v2 con payload.articulo.sku
 */

// TODO(Plan-31-03): desbloquear imports cuando la app tenga la ruta /by-codigo
// import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'

// TODO(Plan-31-03): importar AppModule o un TestModule reducido
// import { AppModule } from '../src/app.module'

/**
 * Placeholder de app para el skeleton.
 * Se reemplaza con el bootstrap real en Plan 31-03.
 * Definite assignment assertion (!) — el bootstrap real se hace en beforeAll
 * cuando Plan 31-03 desbloquee los tests.
 */
let app!: INestApplication

describe('Phase 31 - Articulos rekey + webhook payload v2', () => {
  beforeAll(async () => {
    // TODO(Plan-31-03): crear TestingModule con AppModule o módulo reducido
    // const moduleFixture: TestingModule = await Test.createTestingModule({
    //   imports: [AppModule],
    // }).compile()
    // app = moduleFixture.createNestApplication()
    // await app.init()
    // Placeholder: app queda undefined hasta Plan 31-03
    // Los tests están skipped, por lo tanto beforeAll no falla.
  })

  afterAll(async () => {
    // TODO(Plan-31-03): await app.close()
    if (app) {
      await app.close()
    }
  })

  // ---------------------------------------------------------------------------
  // SC#3a — GET /api/articulos/:sku retorna 1 fila (ruta existente, post PK swap)
  // Depende de: Plan 31-02 (sku asignado) + Plan 31-03 (ruta refactorizada)
  // ---------------------------------------------------------------------------
  it.skip('SC#3a: GET /api/articulos/:sku retorna 1 fila con campo sku', //   request(app.getHttpServer()) // TODO(Plan-31-03): implementar con:
  //     .get('/api/articulos/ABC001')
  //     .set('Authorization', `Bearer ${testJwt}`)
  //     .expect(200)
  //     .then(res => { expect(res.body.sku).toBe('ABC001') })
  async () => {
    const response = await request(app.getHttpServer()).get('/api/articulos/ABC001').expect(200)

    expect(response.body).toHaveProperty('sku')
    expect(response.body.sku).toBe('ABC001')
  })

  // ---------------------------------------------------------------------------
  // SC#3b — GET /api/articulos/by-codigo/:codigo retorna array de hermanas
  // Depende de: Plan 31-03 (nueva ruta /by-codigo/:codigo)
  // ---------------------------------------------------------------------------
  it.skip('SC#3b: GET /api/articulos/by-codigo/:codigo retorna array de articulos con sku y codigo', //   request(app.getHttpServer()) // TODO(Plan-31-03): implementar con:
  //     .get('/api/articulos/by-codigo/ABC-001')
  //     .set('Authorization', `Bearer ${testJwt}`)
  //     .expect(200)
  //     .then(res => {
  //       expect(Array.isArray(res.body)).toBe(true)
  //       expect(res.body[0]).toHaveProperty('sku')
  //       expect(res.body[0]).toHaveProperty('codigo')
  //     })
  async () => {
    const response = await request(app.getHttpServer())
      .get('/api/articulos/by-codigo/ABC-001')
      .expect(200)

    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.length).toBeGreaterThan(0)
    expect(response.body[0]).toHaveProperty('sku')
    expect(response.body[0]).toHaveProperty('codigo')
  })

  // ---------------------------------------------------------------------------
  // SC#4 — POST /api/articulos emite webhook con payload.articulo.sku no-null
  // Depende de: Plan 31-02 (overwrite sku = stripSep(codigo) aplicado)
  //             y el webhook service emite payload v2 con campo sku
  // ---------------------------------------------------------------------------
  it.skip('SC#4: POST /api/articulos emite evento articulo.created con payload.articulo.sku no-null', //   1. POST /api/articulos con dto valido // TODO(Plan-31-02): implementar con:
  //   2. Esperar 1s para que el webhook dispatch procese
  //   3. Query directa a webhook_deliveries via DrizzleService
  //   4. Assert ultima fila donde event_type = 'articulo.created'
  //      tiene payload.articulo.sku !== null
  async () => {
    const createDto = {
      codigo: 'TEST-PHASE31-001',
      nombre: 'Articulo Test Phase 31',
      precio: 100,
      activo: true,
    }

    const createResponse = await request(app.getHttpServer())
      .post('/api/articulos')
      .set('Authorization', `Bearer ${process.env['TEST_ADMIN_JWT'] ?? ''}`)
      .send(createDto)
      .expect(201)

    const createdSku = createResponse.body.sku as string
    expect(createdSku).not.toBeNull()
    expect(typeof createdSku).toBe('string')

    // Esperar procesamiento asincrono del webhook
    await new Promise(resolve => setTimeout(resolve, 1000))

    // TODO(Plan-31-02): query directa a webhook_deliveries para verificar payload
    // const deliveries = await drizzleService.db
    //   .select()
    //   .from(webhookDeliveries)
    //   .where(eq(webhookDeliveries.eventType, 'articulo.created'))
    //   .orderBy(desc(webhookDeliveries.createdAt))
    //   .limit(1)
    // expect(deliveries[0].payload.articulo.sku).not.toBeNull()
  })
})
