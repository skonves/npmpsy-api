import express from 'express';

import services from './services';

const app = express();

app.get('/', (req, res) => {

	const { q, offset, limit } = req.gangplank.params;

	services.searchService.findPackages(
		q, offset, limit,
		(err, result) => {
			if (err) {
				res.status(503).send({ err });
			} else if (result && result.packages && result.packages.length > 0) {
				res.send(result);
			} else {
				res.send({ message: 'No packages found', packages: [] });
			}
		});
});

app.get('/:packageId', (req, res) => {
	res.status(501).send(req.gangplank);
});

app.get('/:packageId/versions', (req, res) => {
	const { packageId, offset, limit } = req.gangplank.params;

	services.searchService.getVersions(
		packageId, offset, limit,
		(err, result) => {
			if (err) {
				res.status(503).send({ err });
			} else if (result && result.versions && result.versions.length > 0) {
				res.send({ packageId: req.gangplank.packageId, versions: result.versions });
			} else {
				res.send({ packageId: req.gangplank.packageId, message: 'No packages found', versions: [] });
			}
		});
});

app.get('/:packageId/versions/:version', (req, res) => {
	services.treeService.getTree(
		req.gangplank.packageId + '@' + req.gangplank.version, {
			ts: req.gangplank.ts
		}, (err, response) => {

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

app.get('/:packageId/versions/:version/diff', (req, res, next) => {
	req.gangplank.rhsversion = req.gangplank.rhsversion || req.gangplank.version;
	req.gangplank.rhsts = req.gangplank.rhsts;

	services.treeService.getTreeDiff(
		req.gangplank.packageId + '@' + req.gangplank.version,
		req.gangplank.ts,
		req.gangplank.packageId + '@' + req.gangplank.rhsversion,
		req.gangplank.rhsts,
		(err, result) => {
			if (err) {
				next(err);
			} else {
				res.json(result);
			}
		}
	);
});

app.get('/:packageId/versions/:version/history', (req, res, next) => {
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
