export { default as inCfSubNet } from "./cfcidr";

if (! Set.prototype.toArray)
	Set.prototype.toArray = function() { return Set.prototype.keys.call(this).toArray() }
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
// args a,b Set|Array 
// return Array
const union = (a, b) => [ ...new Set([...a, ...b]) ];
const difference = (a, b) => {
	const s = new Set(a);
	for (const e of b) 
		s.delete(e);
	return [...s];
};
function symmetricDifference(a, b, seperate=false) {
	const _a = new Set(a);
	let _b;
	if (seperate) _b = new Set();
	else _b = _a;
	for (const e of b) 
		_a.has(e)? _a.delete(e): _b.add(e);
	return seperate? [[..._a], [..._b]]: [..._a];
}

export const randFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const delay = (t) => new Promise(resolve => { setTimeout(resolve, t); });

export default class KVMap {
	KV;
	KEY_PROXYS = 'proxys';
	KEY_CFHOST = 'cfhost';
	
	_proxys; //entry
	proxysCache = [[],[]]; //cache
	proxy; // {443:'', 80:''}
	proxysLoading;

	_cfhost = new Set(); //entry
	cfhost = new Set(); //entry + cache
	cfhostRaw = []; //kv source
	cfhostLoading;
	cfhostPutting;
	constructor({KV, proxys = [], cfhost = [], host = []}) {
		this.KV = KV;
		this._proxys = proxys;
		cfhost.forEach(e => {
			this._cfhost.add(e);
			this.cfhost.add(e);
		})
		this.proxy = this.randomProxy;
	}
	get proxys() {
		return { 443: [...this._proxys, ...this.proxysCache[0]], 80: [...this._proxys, ...this.proxysCache[1]]}
	}
	get randomProxy() {
		return { 443: randFrom(this.proxys[443]), 80: randFrom(this.proxys[80]) }
	}
	loadCfhost() {
		return this.loadKey(this.KEY_CFHOST);
	}
	loadKey(key) {
		const keyLoading = key+'Loading'
		if (this[keyLoading]) return Promise.reject();
		this[keyLoading] = true;
		return this.KVOp(key, 'get').then(r => {
			if (r) {
				if (r.find(e => this['_'+key].has(e))) {
					r = difference(r, this['_'+key]);
					//update to KV
					this[key+'Putting'] = true;
					this.KVOp(key, 'put', r.length?r:'').then(()=>{ this[key+'Putting'] = false; })
				}
				this[key+'Raw'] = r;
				for (let e of r) 
					this[key].add(e);
			}
			this[keyLoading] = false;
			console.log(`KV ${key} loaded ${this[key].size}`)
			return this[key];
		})
	}
	loadProxys() {
		if (this.proxysLoading) return Promise.reject();
		this.proxysLoading = true;
		return this.KVOp(this.KEY_PROXYS, 'get').then(r => {
			if (r) {
				if (r[0] instanceof Array) {
					r.forEach((a,i) => this.proxysCache[i]=a)
				} else {
					this.proxysCache[0] = r;
				}
			}
			this.proxy = this.randomProxy;
			this.proxysLoading = false;
			console.log(`KV ${this.KEY_PROXYS} loaded ${this.proxys[443].length}(443) ${this.proxys[80].length}(80)`)
			return this.proxys;
		})
	}
	async deleteProxy(host, port) {
		if (port != 443 && port != 80) return;
		while (this.proxysLoading) {
			console.log(`${this.KEY_PROXYS} is loading! try wait 20ms`)
			await delay(20);
		}
		let idx = port == 443 ? 0 : 1
		let i = this.proxysCache[idx].indexOf(host);
		if (i > -1) {
			this.proxysCache[idx].splice(i, 1);
			this.KVOp(this.KEY_PROXYS, 'put', this.proxysCache)
				.then(r => { console.log(`proxy ${host+':'+port} deleted from KV`); });
		}
		this.proxy[port] = randFrom(this.proxys[port]);
	}
	tagCfhost(host) {
		return this.tag(this.KEY_CFHOST, host);
	}
	async tag(key, host) {
		while (this[key+'Loading']) {
			console.log(`${key} is loading! try wait 20ms`)
			await delay(20);
		}
		if (! this[key].has(host))
			this[key].add(host);
		else 
			return Promise.resolve();
		console.log(`cached ${host} ${this[key].size}`)
		let keyPutting = key+'Putting';
		while (this[keyPutting]) {
			console.log(`${key} is been putting! try wait 50ms`)
			await delay(50);
		}
		if (! this[keyPutting]) {
			this[keyPutting] = true;
			if (this[key+'Raw'].length) {
				let r = await this.KVOp(key, 'get');
				let ldiff = new Set(this[key]);
				for (const e of r) {
					if (this[key].has(e)) ldiff.delete(e);
					else this[key].add(e);
				}
				if (ldiff.size)
					await this.KVOp(key, 'put', difference(this[key], this['_'+key]))
						.then(r => { console.log(`tagged ${ldiff} to KV`); })
			} else {
				await this.KVOp(key, 'put', difference(this[key], this['_'+key]))
					.then(r => { console.log(`tagged ${host} to KV`); })
			}
			this[keyPutting] = false;
		}
		return Promise.resolve();
	}
	// key, get 
	// key, put,  string|Array|Object
	// key, push, arg0, arg1, ...
	// key, set,  arg0, arg1
	async KVOp(key, op, ...args){
		let val;
		if (op == 'put') {
			args = args[0]
		} else if (/push|set/.test(op)) {
			val = await this.KVApi('get', key);
			if (val) {
				if (val instanceof Array) {
					if (op == 'push') 
						val.push(...args);
				} else if (val.toString() == '[object Object]') {
					if (op == 'set')
						val[args[0]] = args[1]
				}
				args = val
			}
			op = 'put'
		}
		return await this.KVApi(op, key, args);
	}
	/**
	  * op: get,put,list,delete
	  * args: key, value(string,object,array)
	  */
	async KVApi(op, ...args){
		let val;
		if (op == 'get') 
			args = args.slice(0, 1)
		try {
			if (op == 'put' && typeof args[1] == 'object') {
				args[1] = JSON.stringify(args[1]);
			}
			val = await this.KV[op](...args);
			if (op == 'get' && val && /^[{\[].*[\]}]$/.test(val)) {
				val = JSON.parse(val);
			}
		} catch (err) {
			console.error('KV error', err);
		}
		return val;
	}
	test() {
		this.loadKey(this.KEY_CFHOST);
		let h = '1.1.1.1';
		if (! this.cfhost.has(h)) {
			this.tagCfhost('1.1.1.1').then(()=>console.log(this.cfhost))
		}
	}
}