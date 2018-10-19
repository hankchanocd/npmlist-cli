/*
 * npmRoot.js has only one exposed function
 * It is the sole entry to all the npm global module operations, i.e. traversing and collecting information
 *
 */
'use strict';

// Dependencies
const ls = require('ls');
const path = require('path');
const chalk = require('chalk');
const {
	sortByDate,
	parseDate
} = require('./../utils/dateUtil');
const {
	exec
} = require('./../utils/promiseUtil');



module.exports = async function () {
	let root;
	try {
		let {
			stdout,
			stderr
		} = await exec('npm root -g'); // Find the path to global modules on user's machine
		root = stdout;

		stderr ? console.log(chalk.redBright(stderr)) : '';
	} catch (err) {
		console.log(chalk.redBright(err));
	}

	return {
		getRecentTwentyModules() {
			return getRootModulesList(root).sortByDate().twenty().getNameAndTime().build();
		},
		getAllModules() {
			return getRootModulesList(root).sortByDate().all().getNameAndTime().build();
		},
		getAllModulesPaths() {
			return getRootModulesList(root).all().getNameAndPath().build();
		}
	};
};


/*
 * getRootModulesList
 * @param takes root path
 * returns two options: all() and recentTen()
 * p.s. We plan to use recentTen() only
 */
function getRootModulesList(root) {
	// Use path to parse the given path, and attach the following string so to avoid the `/node_modules/\n ` nasty bug
	const GLOBAL_MODULES_ALL = path.parse(root).dir + '/node_modules/*';
	let modulesList = ls(GLOBAL_MODULES_ALL);

	let finalList = (function traverseModulesList() {
		let list = [];
		let authorDirectories = modulesList.filter(module => module.file.includes('@')); // When module's starts with @, i.e. @username/module
		let withoutAuthorDirectories = modulesList.filter(module => !module.file.includes('@'));
		list = list.concat(withoutAuthorDirectories);

		// Traverse one step further into the directory
		authorDirectories.forEach(module => {
			let childModulesList = ls(module.full + '/*');
			childModulesList = childModulesList.map(module => {
				// Append the module name with its parent directory, i.e. module => @username/module
				module.name = path.parse(module.path).name + '/' + module.name;
				return module;
			});
			list = list.concat(childModulesList);
		});

		return list;
	})();

	return new ListBuilder(finalList);
}


/*
 * ListBuilder uses Builder pattern to create reusable chain operations the gives users the flexibility of
 * of choosing their custom list modifications.
 *
 */
class ListBuilder {
	constructor(list) {
		this.list = list;
	}

	all() {
		return this;
	}

	twenty() {
		this.list = this.list.slice(0, 20);
		return this;
	}

	sortByDate() {
		this.list = sortByDate(this.list);
		return this;
	}

	getNameAndTime() {
		this.list = this.list.map(item => {
			return {
				'name': item.name ? chalk.blueBright(item.name) : '',
				'time': item.stat.mtime ? parseDate(item.stat.mtime) : ''
			};
		});
		return this;
	}

	getNameAndPath() {
		this.list = this.list.map(item => {
			return {
				'name': item.name ? chalk.blueBright(item.name) : '',
				'path': item.full ? item.full : ''
			};
		});
		return this;
	}

	build() {
		return this.list;
	}
}
