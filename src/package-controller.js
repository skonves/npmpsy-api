import express from 'express';
import { register } from 'swagger-ops';

import services from './services';
import spec from '../swagger.json';

import SearchService from './services/search-service';
import TreeService from './services/tree-service';
import PackageRepository from './package-repository';
import PackageService from './package-service';

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
		const packageRepository = new PackageRepository(neo4jClient);
		const packageService = new PackageService(packageRepository);

		const result = await packageService.findPackages(q, offset, limit);
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
		const packageRepository = new PackageRepository(neo4jClient);
		const packageService = new PackageService(packageRepository);

		const result = await packageService.getVersions(packageId, offset, limit);

		if (result && result.versions && result.versions.length) {
			res.send(result);
		} else {
			res.send({ packageId, message: 'No packages found', versions: [] });
		}
	} catch (ex) {
		next(ex);
	}
});

app.op('getPackageVersionDependencies', async (req, res, next) => {
	try {
		const { packageId, version, ts } = req.gangplank.params;

		// TODO: move to DI module
		const { NEO4J_HOST, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
		const neo4jClient = new Neo4jClient(NEO4J_HOST, NEO4J_USERNAME, NEO4J_PASSWORD);
		const packageRepository = new PackageRepository(neo4jClient);
		const packageService = new PackageService(packageRepository);

		const result = await packageService.getTree(packageId, version, ts);

		// TODO: figure out how to 404 when packageId@version does not exist
		res.send({
			packageId,
			version,
			ts,
			dependencies: result.dependencies
		});

	} catch (ex) {
		next(ex);
	}
});

app.op('getPackageVersionDiff', async (req, res, next) => {
	try {
		const { packageId, version, ts, rhsversion, rhsts } = req.gangplank.params;

		// TODO: move to DI module
		const { NEO4J_HOST, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env;
		const neo4jClient = new Neo4jClient(NEO4J_HOST, NEO4J_USERNAME, NEO4J_PASSWORD);
		const packageRepository = new PackageRepository(neo4jClient);
		const packageService = new PackageService(packageRepository);

		const lhs = {
			packageId,
			version,
			ts
		};

		const rhs = {
			packageId,
			version: rhsversion,
			ts: rhsts
		};

		const result = await packageService.getTreeDiff(lhs, rhs);

		res.json(result);
	} catch (ex) {
		next(ex);
	}
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
