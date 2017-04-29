import express from 'express';
import { register } from 'swagger-ops';

import services from './services';
import spec from '../swagger.json';

import SearchService from './services/search-service';

import Neo4jClient from './neo4j-client';
const endpoint = process.env.NEO4J_HOST;
const authorization = `Basic ${process.env.NEO4J_AUTH}`;

const app = express();
register(app, spec, true);

app.op('searchPackages', async (req, res, next) => {
	try {
		const { q, offset, limit } = req.gangplank.params;

		// TODO: move to DI module
		const { NEO4J_HOST, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
		const neo4jClient = new Neo4jClient(NEO4J_HOST, NEO4J_USERNAME, NEO4J_PASSWORD);
		const searchService = new SearchService(neo4jClient);

		const result = await searchService.findPackages(q, offset, limit);
		res.send(result);
	} catch (ex) {
		next(ex);
	}
});

app.op('getPackage', (req, res) => {
	res.status(501).send(req.gangplank);
});

app.op('getPackageVersions', async (req, res, next) => {
	try {
		const { packageId, offset, limit } = req.gangplank.params;

		// TODO: move to DI module
		const { NEO4J_HOST, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
		const neo4jClient = new Neo4jClient(NEO4J_HOST, NEO4J_USERNAME, NEO4J_PASSWORD);
		const searchService = new SearchService(neo4jClient);

		const result = await searchService.getVersions(packageId, offset, limit);

		if (result && result.versions && result.versions.length > 0) {
			res.send({ packageId, versions: result.versions });
		} else {
			res.send({ packageId, message: 'No packages found', versions: [] });
		}
	} catch (ex) {
		next(ex);
	}
});

app.op('getPackageVersionDependencies', (req, res) => {
	const { packageId, version, ts } = req.gangplank.params;
	services.treeService.getTree(
		packageId + '@' + version, { ts }, (err, response) => {

			let responseObj = {
				packageId: req.gangplank.packageId,
				version: req.gangplank.version
			};

			if (err) {
				res.status(503).send({ err });
			} else if (response) {
				responseObj.ts = response.ts;
				responseObj.dependencies = response.tree.dependencies;
				res.send(responseObj);
			} else {
				responseObj.message = 'Dependency tree not found';
				res.send(responseObj);
			}
		});
});

app.op('getPackageVersionDiff', (req, res, next) => {
	const { packageId, version, ts, rhsversion, rhsts } = req.gangplank.params;

	services.treeService.getTreeDiff(
		packageId + '@' + version, ts, packageId + '@' + (rhsversion || version), rhsts,
		(err, result) => {
			if (err) {
				next(err);
			} else {
				res.json(result);
			}
		}
	);
});

app.op('getPackageVersionHistory', (req, res, next) => {
	res.status(501).json({ message: 'This route has been turned off while we sort out some performance issues.' });
	// services.diffService.getDiffs(
	// 	req.swagger.packageId,
	// 	req.swagger.version, {
	// 		before: req.swagger.ending,
	// 		after: req.swagger.after,
	// 		count: req.swagger.limit
	// 	}, (err, response) => {
	// 		try {
	// 			if (err) {
	// 				next(err);
	// 			} else if (response) {
	// 				res.send(response);
	// 			} else {
	// 				res.status(404).send({ message: 'No diffs found' });
	// 			}
	// 		} catch (ex) {
	// 			next(ex);
	// 		}
	// 	});
});

export default app;
