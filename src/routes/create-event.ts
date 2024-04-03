import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { prisma } from "../lib/prisma";

import { generateSlug } from "../utils/generate-slug";

import { BadRequest } from "./_errors/bad-request";

export async function createEvent(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/events",
    {
      schema: {
        summary: "Create an event",
        tags: ["events"],
        body: z.object({
          title: z
            .string({
              required_error: "O título é obrigatório.",
              invalid_type_error: "O título precisa ser um texto.",
            })
            .min(4, {
              message: "O título precisa ter no mínimo 4 caracteres.",
            }),
          details: z
            .string({
              invalid_type_error: "O detalhes precisa ser um texto.",
            })
            .nullable(),
          maximumAttendees: z
            .number({
              invalid_type_error:
                "O máximo de participantes precisa ser um número.",
            })
            .int({
              message:
                "O máximo de participantes precisa ser um número inteiro.",
            })
            .positive()
            .nullable(),
        }),
        response: {
          201: z.object({
            eventId: z.string().uuid(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { title, details, maximumAttendees } = request.body;

      const slug = generateSlug(title);

      const eventWithSameSlug = await prisma.event.findUnique({
        where: {
          slug,
        },
      });

      if (eventWithSameSlug !== null) {
        throw new BadRequest("Another event with same title already exists.");
      }

      const event = await prisma.event.create({
        data: {
          title,
          details,
          maximumAttendees,
          slug,
        },
      });

      return reply.status(201).send({ eventId: event.id });
    }
  );
}
