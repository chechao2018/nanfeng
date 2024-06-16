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
	proxys = [[],[]];
	proxy = {443:'', 80:''}
	proxysLoaded;

	_cfhost = new Set(); //entry
	cfhost = new Set(); //entry + cache
	cfhostRaw = false; //kv source
	cfhostLoaded;
	cfhostPutting;
	constructor({KV, proxys, cfhost = []}) {
		this.KV = KV;
		this._proxys = proxys;
		if (proxys[0] instanceof Array)
			this.proxys = proxys;
		else 
			this.proxys[0] = proxys;
		cfhost.forEach(e => {
			this._cfhost.add(e);
			this.cfhost.add(e);
		})
		this.randomProxy();
	}
	randomProxy() {
		[443,80].forEach((p,i) => { if (this.proxys[i].length) this.proxy[p] = randFrom(this.proxys[i]); });
		return this.proxy;
	}
	loadCfhost() {
		return this.loadKey(this.KEY_CFHOST);
	}
	loadKey(key) {
		if (this[key+'Loaded']) return Promise.resolve();
		return this.KVOp(key, 'get').then(r => {
			if (r) {
				/* if (r.find(e => this['_'+key].has(e))) {
					r = difference(r, this['_'+key]);
					//update to KV
					this[key+'Putting'] = true;
					this.KVOp(key, 'put', r.length?r:'').then(()=>{ this[key+'Putting'] = false; })
				} */
				this[key+'Raw'] = true;
				for (let e of r) 
					this[key].add(e);
			}
			this[key+'Loaded'] = true;
			console.log(`KV ${key} loaded ${this[key].size}`)
			return this[key];
		})
	}
	loadProxys() {
		if (this.proxysLoaded) return Promise.resolve();
		return this.KVOp(this.KEY_PROXYS, 'get').then(r => {
			if (r) {
				if (r[0] instanceof Array)
					r.forEach((a,i)=>this.proxys[i] = a);
				else 
					this.proxys[0] = r;
				if (r.toString() != this._proxys.toString())
					this.randomProxy();
			}
			this.proxysLoaded = true;
			console.log(`KV ${this.KEY_PROXYS} loaded ${this.proxys[0].length}(443) ${this.proxys[1].length}(80)`)
			return this.proxys;
		})
	}
	async deleteProxy(host, port) {
		if (! host || port != 443 && port != 80) return;
		while (! this.proxysLoaded) {
			console.log(`${this.KEY_PROXYS} not loaded! try wait 20ms`)
			await delay(20);
		}
		let idx = port == 443 ? 0 : 1
		let i = this.proxys[idx].indexOf(host);
		if (i > -1) {
			this.proxys[idx].splice(i, 1);
			this.KVOp(this.KEY_PROXYS, 'put', this.proxys)
				.then(r => { console.log(`proxy ${host+':'+port} deleted from KV`); });
		}
		this.proxy[port] = randFrom(this.proxys[port]);
	}
	tagCfhost(host) {
		return this.tag(this.KEY_CFHOST, host);
	}
	async tag(key, host) {
		while (! this[key+'Loaded']) {
			console.log(`${key} not loaded! try wait 20ms`)
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
			if (this[key+'Raw']) {
				let r = await this.KVOp(key, 'get');
				if (r) {
					let ldiff = this[key].difference(this['_'+key]);
					for (const e of r) {
						if (this[key].has(e)) ldiff.delete(e);
						else this[key].add(e);
					}
					if (ldiff.size)
						await this.KVOp(key, 'put', difference(this[key], this['_'+key]))
							.then(r => { console.log(`tagged ${ldiff.toArray()} to KV`); })
				} else 
					this[key+'Raw'] = false;
			} else {
				await this.KVOp(key, 'put', difference(this[key], this['_'+key]))
					.then(r => { 
						this[key+'Raw'] = true; 
						console.log(`tagged ${host} to KV`); 
					})
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
	async test() {
		this.loadKey(this.KEY_CFHOST);
		let h = '1.1.1.1';
		if (! this.cfhost.has(h)) {
			this.tagCfhost('1.1.1.1').then(()=>console.log(this.cfhost.has(h)));
		}
		this.loadProxys();
		this.deleteProxy(this.proxy[443], 443);
	}
}
