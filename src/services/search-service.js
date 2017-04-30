import request from 'superagent';
import Neo4jClient from '../neo4j-client';

export default class SearchService {
	/** @param {Neo4jClient} neo4jClient */
	constructor(neo4jClient) {
		this.client = neo4jClient;
	}

	async findPackages(q, offset, limit) {
		const statement = `
		MATCH (p:Package)-[:RELEASED_AS]->(v:Version) WHERE p.id STARTS WITH {q}
		RETURN DISTINCT p.id AS packageId, collect({name: v.name, ts: v.ts}) AS versions
		ORDER BY packageId SKIP {offset} LIMIT {limit}`;

		const results = await this.client.query(statement, { q, offset, limit });

		return {
			packages: results.map(d => {
				return {
					id: d.packageId,
					versions: d.versions ? d.versions.sort((a, b) => b.ts - a.ts) : []
				};
			})
		};
	}

	async getVersions(packageId, offset, limit) {
		const statement = `
		MATCH (n:Package)-[r:RELEASED_AS]->(v:Version) where n.id = {packageId}
		RETURN v.name AS name, v.ts AS ts
		ORDER BY ts DESC SKIP {offset} LIMIT {limit}`;

		const results = await this.client.query(statement, { packageId, offset, limit });

		return {
			packageId,
			versions: results.map(d => {
				return { version: d.name, ts: d.ts };
			})
		};
	}
}
