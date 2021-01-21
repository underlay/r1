import { StatusCodes } from "http-status-codes";

import * as t from "io-ts";

import { getSession } from "next-auth/client";

import { makeHandler } from "next-rest/server";
import { catchPrismaError } from "utils/server/catchPrismaError";

import { prisma } from "utils/server/prisma";

const validateParams = t.type({});
const requestHeaders = t.type({ "content-type": t.literal("application/json") });

const requestBody = t.type({
	slug: t.string,
	description: t.string,
	isPublic: t.boolean,
});

declare module "next-rest" {
	interface API {
		"/api/collection": Route<{
			params: {};
			methods: {
				POST: {
					request: {
						headers: t.TypeOf<typeof requestHeaders>;
						body: t.TypeOf<typeof requestBody>;
					};
					response: {
						headers: { etag: string };
						body: void;
					};
				};
			};
		}>;
	}
}

export default makeHandler<"/api/collection">({
	params: validateParams.is,
	methods: {
		POST: {
			headers: requestHeaders.is,
			body: requestBody.is,
			exec: async (req, {}, {}, body) => {
				const session = await getSession({ req });
				console.log("EXECUTING POST /API/COLLECTION", session);
				if (session === null) {
					throw StatusCodes.UNAUTHORIZED;
				}

				const { slug, description, isPublic } = body;

				const schemaCount = await prisma.schema.count({
					where: { agent: { userId: session.user.id }, slug },
				});

				if (schemaCount > 0) {
					throw StatusCodes.CONFLICT;
				}

				// For now, we just create a collection that is linked to
				// the session user as the agent.
				const collection = await prisma.collection
					.create({
						data: {
							agent: { connect: { userId: session.user.id } },
							slug,
							description,
							isPublic,
						},
					})
					.catch(catchPrismaError);

				if (collection === null) {
					throw StatusCodes.INTERNAL_SERVER_ERROR;
				}

				return [{ etag: collection.id }, undefined];
			},
		},
	},
});