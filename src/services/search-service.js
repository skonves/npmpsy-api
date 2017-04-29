import request from 'superagent';
import Neo4jClient from '../neo4j-client';

const endpoint = `http://${process.env.NEO4J_HOST}:7474/db/data/transaction/commit`;
const authorization = `Basic ${process.env.NEO4J_AUTH}`;

const client = new Neo4jClient(endpoint, authorization);

export function findPackages(q, offset, limit, callback) {
	const statement = `
		MATCH (p:Package)-[:RELEASED_AS]->(v:Version) WHERE p.id STARTS WITH {q}
		RETURN DISTINCT p.id AS packageId, collect({name: v.name, ts: v.ts}) AS versions
		ORDER BY packageId SKIP {offset} LIMIT {limit}`;

	client.query(statement, { q, offset, limit })
		.then(result => {
			if (result) {
				callback(null, {
					packages: result.map(d => {
						return {
							id: d.packageId,
							versions: d.versions ? d.versions.sort((a, b) => b.ts - a.ts) : []
						};
					})
				});
			} else {
				callback();
			}
		})
		.catch(ex => callback(ex));
}

export function getVersions(packageId, offset, limit, callback) {
	const statement = `
		MATCH (n:Package)-[r:RELEASED_AS]->(v:Version) where n.id = {packageId}
		RETURN v.name AS name, v.ts AS ts
		ORDER BY ts DESC SKIP {offset} LIMIT {limit}`;

	client.query(statement, { packageId, offset, limit })
		.then(result => {
			if (result) {
				callback(null, {
					packageId,
					versions: result.map(d => {
						return { version: d.name, ts: d.ts };
					})
				});
			} else {
				callback();
			}
		})
		.catch(ex => callback(ex));

	// request
	// 	.post(endpoint)
	// 	.send(body)
	// 	.set('Authorization', authorization)
	// 	.set('Content-Type', 'application/json')
	// 	.end((err, result) => {
	// 		if (err) {
	// 			callback(err);
	// 		} else if (result.body.results[0] && result.body.results[0].data) {
	// 			callback(null, {
	// 				packageId,
	// 				versions: result.body.results[0].data.map(d => {
	// 					return { version: d.row[0], ts: d.row[1] };
	// 				})
	// 			});
	// 		} else {
	// 			callback();
	// 		}
	// 	});
}
