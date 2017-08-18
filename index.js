//  -*- coding: utf-8 -*-
//  engine-client.js ---
//  created: 2017-07-18 09:35:52
//

const boom = require('boom');
const axios = require('axios');
const Hawk = require('hawk');

const internals = {
    request: axios,
};

class EngineHttpClient {

    constructor(host, user, pass, log) {
        this.hawk = undefined;
        this.host = host;
        this.user = user;
        this.pass = pass;
        this.log = log;
    }

    _log(level, msg) {
        if (this.log && this.log[level]) {
            this.log[level](msg);
        }
    }

    _exec(method, path, body, logsz='') {
        body = body || null;
        let url = `${this.host}/${path}`;

        function req(hawk={}) {
            const header = Hawk.client.header(url, method, {credentials: hawk.credentials});
            return internals.request({
                method,
                url,
                data: body,
                headers: {
                    Authorization: header.field,
                }
            });
        }

        function auth(host, user, pass) {
            return internals.request({
                url: `${host}/auth/token`,
                method: 'POST',
                data: {username: user, password: pass},
            });
        }

        function performAuth(self) {
            return auth(self.host, self.user, self.pass).then(resp => {
                const data = resp.data;
                self._log('info', `${self.user} logged in`);
                self.hawk = {
                    credentials: {
                        id: data.id,
                        key: data.key,
                        algorithm: data.algorithm,
                    }
                };
            });
        }

        const error = (reject, err) => {
            if (!err.response) {
                this._log('error',
                    `es> ${method} ${url} -> ${err.message}`);
                reject(err);
            } else {
                this._log('error',
                    `es> ${method} ${url} -> ${err.response.data.statusCode} (${err.response.data.message})`);
                reject(boom.create(err.response.data.statusCode, err.response.data.message));
            }
        };

        return new Promise((resolve, reject) => {
            req(this.hawk)
            .then(result => {
                this._log('info', `es> ${method} ${url} OK ${logsz}`);
                resolve(result.data);
            })
            .catch(err => {
                if (!err.response || err.response.status !== 401) {
                    return error(reject, err);
                }

                this._log('debug', 'trying to authenticate');

                return performAuth(this)
                .then(() => {
                    return req(this.hawk)
                    .then(result => {
                        this._log('info', `es> ${method} ${url} OK  ${logsz} (After retry)`);
                        resolve(result.data);
                    })
                    .catch(error.bind(null, reject));
                })
                .catch(error.bind(null, reject));
            });
        });
    }

    get(path) {
        return this._exec('GET', path, null);
    }

    post(path, body, logsz) {
        return this._exec('POST', path, body, logsz);
    }

    patch(path, body) {
        return this._exec('PATCH', path, body);
    }

    delete(path) {
        return this._exec('DELETE', path, null);
    }
}

module.exports = EngineHttpClient;

if (process.env.NODE_ENV === 'test') {
    module.exports.internals = internals;
}

//
//  engine-client.js ends here
