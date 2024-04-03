import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { prisma } from "../lib/prisma";

import { BadRequest } from "./_errors/bad-request";

export async function registerForEvent(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/events/:eventId/attendee",
    {
      schema: {
        summary: "Register an attendee",
        tags: ["attendees"],
        body: z.object({
          name: z
            .string({
              required_error: "O nome é obrigatório.",
              invalid_type_error: "O nome precisa ser um texto.",
            })
            .min(4, {
              message: "O nome precisa ter no mínimo 4 caracteres.",
            }),
          email: z
            .string({
              required_error: "O email é obrigatório.",
              invalid_type_error: "O email precisa ser um texto.",
            })
            .email({ message: "Precisa ser do tipo email." }),
        }),
        params: z.object({
          eventId: z.string().uuid(),
        }),
        response: {
          201: z.object({
            attendeeId: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { eventId } = request.params;
      const { name, email } = request.body;

      const attendeeFromEmail = await prisma.attendee.findUnique({
        where: {
          eventId_email: {
            email,
            eventId,
          },
        },
      });

      if (attendeeFromEmail !== null) {
        throw new BadRequest(
          "This e-mail is already registered for this event."
        );
      }

      const [event, amountOfAttendeesForEvent] = await Promise.all([
        prisma.event.findUnique({
          where: {
            id: eventId,
          },
        }),

        prisma.attendee.count({
          where: {
            eventId,
          },
        }),
      ]);

      if (
        event?.maximumAttendees &&
        amountOfAttendeesForEvent >= event.maximumAttendees
      ) {
        throw new BadRequest(
          "The maximum number of attendees for this event has been reached."
        );
      }

      const attendee = await prisma.attendee.create({
        data: {
          name,
          email,
          eventId,
        },
      });

      return reply.status(201).send({ attendeeId: attendee.id });
    }
  );
}
