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

    /**
     * @param [logsz='']{String} - optional log string to be written after the default msg.
     *    If null, the default msg is not written.
     */
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
                self._log('info', data);
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
            if (!err) {
                this._log('error',
                    `es> ${method} ${url} -> unknown error`);
                reject(err);
            } else if (!err.response || !err.response.data) {
                this._log('error',
                    `es> ${method} ${url} -> ${err.message}`);
                reject(err);
            } else if (isNaN(err.response.status)) {
                // not sure under which circumstances this happens but it does
                // and we can't give NaN statusCode to boom.create() or it will
                // loose it's marbles.
                this._log('error',
                    `es> ${method} ${url} -> error: ${JSON.stringify(err.response.data)}`);
                reject(boom.create(500, JSON.stringify(err.response.data)));
            } else {
                this._log('error',
                    `es> ${method} ${url} -> ${err.response.status} (${JSON.stringify(err.response.data)})`);
                reject(boom.create(err.response.status, JSON.stringify(err.response.data)));
            }
        };

        const log = (retry=false) => {
            if (logsz !== null) {
                if (retry) {
                    this._log('info', `es> ${method} ${url} OK ${logsz} (After retry)`);
                } else {
                    this._log('info', `es> ${method} ${url} OK ${logsz}`);
                }
            }
        };

        return new Promise((resolve, reject) => {
            req(this.hawk)
            .then(result => {
                log();
                resolve(result.data);
            })
            .catch(err => {
                if (!err || !err.response || err.response.status !== 401) {
                    return error(reject, err);
                }

                this._log('debug', 'trying to authenticate');

                return performAuth(this)
                .then(() => {
                    return req(this.hawk)
                    .then(result => {
                        log(true);
                        resolve(result.data);
                    })
                    .catch(error.bind(null, reject));
                })
                .catch(error.bind(null, reject));
            });
        });
    }

    /**
     * @param {string} [logsz] - Optional log string to amend to default msg.
     *    null suppresses the log msg entirely.
     */
    get(path, logsz) {
        return this._exec('GET', path, null, logsz);
    }

    /**
     * @param {string} [logsz] - Optional log string to amend to default msg.
     *    null suppresses the log msg entirely.
     */
    post(path, body, logsz) {
        return this._exec('POST', path, body, logsz);
    }

    /**
     * @param {string} [logsz] - Optional log string to amend to default msg.
     *    null suppresses the log msg entirely.
     */
    patch(path, body, logsz) {
        return this._exec('PATCH', path, body, logsz);
    }

    /**
     * @param {string} [logsz] - Optional log string to amend to default msg.
     *    null suppresses the log msg entirely.
     */
    delete(path, logsz) {
        return this._exec('DELETE', path, null, logsz);
    }
}

module.exports = EngineHttpClient;

if (process.env.NODE_ENV === 'test') {
    module.exports.internals = internals;
}

//
//  engine-client.js ends here
