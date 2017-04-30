import request from 'superagent';
import deepdiff from 'deep-diff';
import semver from 'semver';

import PackageRepository from './package-repository';

export default class SearchService {
	/** @param {PackageRepository} packageRepository */
	constructor(packageRepository) {
		this.repo = packageRepository;
	}

	async findPackages(q, offset, limit) {
		const packages = await this.repo.findPackages(q, offset, limit);

		return { packages };
	}

	async getVersions(packageId, offset, limit) {
		const versions = await this.repo.getVersions(packageId, offset, limit);

		return { packageId, versions };
	}

	async getTree(packageId, version, ts) {
		ts = ts || new Date().getTime();

		const tree = await this.repo.getTree(packageId, version, ts);

		// TODO: indicate if ts has been defaulted to now
		return { ts, dependencies: tree.dependencies };
	}

	async getTreeDiff(lhs, rhs) {
		lhs = lhs || {};
		rhs = rhs || {};

		const now = new Date().getTime();

		lhs.ts = lhs.ts || now;
		rhs.ts = rhs.ts || now;

		const [lhsResult, rhsResult] = await Promise.all([
			this.repo.getTree(lhs.packageId, lhs.version, lhs.ts),
			this.repo.getTree(rhs.packageId, rhs.version, rhs.ts)
		]);

		lhsResult.packageId = lhs.packageId;
		lhsResult.ts = lhs.ts;

		rhsResult.packageId = lhs.packageId;
		rhsResult.ts = rhs.ts;

		const diffs = await getDiffsAsync(lhsResult, rhsResult);

		return {
			lhs: diffs.lhs,
			rhs: diffs.rhs
		};
	}
}

async function getDiffsAsync(lhs, rhs) {
	return new Promise((resolve, reject) => {
		getDiffs(lhs, rhs, (err, result) => {
			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		});
	});
}

function getDiffs(lhs, rhs, callback) {
	lhs = JSON.parse(JSON.stringify(lhs));
	rhs = JSON.parse(JSON.stringify(rhs));
	const diffs = deepdiff(lhs, rhs) || [];

	let updatedVersions = {};

	diffs.forEach(diff => {
		if (diff.kind === 'E' && diff.path[diff.path.length - 1] === 'version') {
			const packageId = diff.path.length === 1 ? lhs.packageId : diff.path[diff.path.length - 2];
			updatedVersions[packageId] = null;
		}
	});

	const promises = Object.keys(updatedVersions).map(packageId => {
		return new Promise((resolve, reject) => {
			request.get(`https://registry.npmjs.com/${packageId}`, (err, res) => {
				if (err) {
					reject(err);
				} else {
					updatedVersions[packageId] = res.body;
					resolve();
				}
			});
		});
	});

	Promise.all(promises).then(() => {
		diffs.forEach(diff => {
			if (diff.kind === 'E' && diff.path[diff.path.length - 1] === 'version') {
				const packageId = diff.path.length === 1 ? lhs.packageId : diff.path[diff.path.length - 2];
				// dependency version change
				diff.path.pop();
				let lhsObj = lhs;
				let rhsObj = rhs;
				diff.path.forEach(prop => {
					lhsObj = lhsObj[prop];
					rhsObj = rhsObj[prop];
				});
				const change = {
					type: 'VERSION',
					uri: getGitDiffUri(updatedVersions[packageId], diff.lhs, diff.rhs)
				};
				lhsObj.$diff = change;
				rhsObj.$diff = change;
			} else if (diff.kind === 'D') {
				// dependency removed
				let lhsObj = lhs;
				diff.path.forEach(prop => {
					lhsObj = lhsObj[prop];
				});
				lhsObj.$diff = { type: 'REMOVED' };
			} else if (diff.kind === 'N') {
				// dependency added
				let rhsObj = rhs;
				diff.path.forEach(prop => {
					rhsObj = rhsObj[prop];
				});
				rhsObj.$diff = { type: 'ADDED' };
			}
		});

		callback(null, { lhs, rhs });
	}).catch(reason => callback(reason));
}

function getGitDiffUri(packageData, vStart, vEnd) {
	if (packageData && packageData.versions && packageData.versions[vStart] && packageData.versions[vStart]) {
		const start = packageData.versions[vStart];
		const end = packageData.versions[vEnd];

		if (start && end && start.repository && end.repository) {
			const uriStart = start.repository.url;
			const uriEnd = end.repository.url;

			if (uriStart && uriEnd && start.gitHead && end.gitHead && uriStart.indexOf('github.com/') > -1 && uriEnd.indexOf('github.com/') > -1) {
				const reg = /github\.com\/([^/]*)\/([^\.]*)/;
				const partsStart = reg.exec(uriStart);
				const partsEnd = reg.exec(uriEnd);

				const userStart = partsStart[1];
				const repoStart = partsStart[2];
				const userEnd = partsEnd[1];
				const repoEnd = partsEnd[2];

				if (userStart === userEnd && repoStart === repoEnd) {
					const startHead = start.gitHead.substr(0, 7);
					const endHead = end.gitHead.substr(0, 7);
					const span = semver.gt(vStart, vEnd) ? `${endHead}...${startHead}` : `${startHead}...${endHead}`;
					const uri = `https://github.com/${userEnd}/${repoEnd}/compare/${span}`;
					return uri;
				}
			}
		}
	}
}
