import { FastifyInstance } from "fastify";
import { z } from 'zod';
import { knex } from '../database'
import { randomUUID } from 'node:crypto'
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";

//testes unitários: unidade da sua aplicação
//testes integração: comunicação entre duas ou mais unidades
// e2e - ponta a ponta: simulam um usuário operando na nossa aplicação

//front-end: abre o página de login, digite o texto fulano@fulano.com.br no campo com ID email. clique no botão
//back-end: chamadas HTTP, websockets

//Pirâmide de testes: E2E ( não dependem de nenhuma tecnologia, não dependem de arquitetura)

export async function transactionsRoutes(app: FastifyInstance) {

  app.get('/',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request) => {
      const { sessionId } = request.cookies

      const transactions = await knex('transactions')
        .where('session_id', sessionId)
        .select()



      return { transactions }
    })

  app.get('/:id', {
    preHandler: [checkSessionIdExists],
  },
    async (request) => {
      const getTransactionParamsSchema = z.object({
        id: z.string().uuid(),

      })

      const { id } = getTransactionParamsSchema.parse(request.params)

      const { sessionId } = request.cookies

      const transactions = await knex('transactions')
        .where({
          session_id: sessionId,
          id,
        })

        .first()

      return { transactions }

    })

  app.get('/summary', {
    preHandler: [checkSessionIdExists],
  }, async (request) => {
    const { sessionId } = request.cookies
    const summary = await knex('transactions')
      .where('session_id', sessionId)
      .sum('amount', { as: 'amount' })
      .first()

    return { summary }

  })

  app.post('/', async (request, reply) => {

    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit'])

    })

    const { title, amount, type } = createTransactionBodySchema.parse(
      request.body,
    )

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, //7 days
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId
    })


    return reply.status(201).send()

  })

}
