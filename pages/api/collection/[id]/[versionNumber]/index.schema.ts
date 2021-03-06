import type { NextApiRequest, NextApiResponse } from "next";
import { StatusCodes } from "http-status-codes";

import * as t from "io-ts";

import { prisma, selectResourceProps } from "utils/server/prisma";
import { getResourcePagePermissions } from "utils/server/permissions";

const params = t.type({ id: t.string, versionNumber: t.string });

export default async function (req: NextApiRequest, res: NextApiResponse) {
	if (!params.is(req.query)) {
		return res.status(StatusCodes.BAD_REQUEST).end();
	}

	const { id, versionNumber } = req.query;

	const collectionVersion = await prisma.collectionVersion.findUnique({
		where: { collectionId_versionNumber: { collectionId: id, versionNumber } },
		select: {
			collection: { select: selectResourceProps },
			schemaInstance: true,
		},
	});

	if (collectionVersion === null) {
		return res.status(StatusCodes.NOT_FOUND).end();
	} else if (!getResourcePagePermissions({ req }, collectionVersion.collection, false)) {
		return res.status(StatusCodes.NOT_FOUND).end();
	} else {
		const filename = `${collectionVersion.collection.slug}-${versionNumber}.schema`;
		res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
		res.setHeader("Content-Type", "application/x-apg-schema");
		res.status(200).send(collectionVersion.schemaInstance);
		return res.end();
	}
}
