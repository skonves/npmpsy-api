import request from 'superagent';
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
}
