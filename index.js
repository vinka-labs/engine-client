//  -*- coding: utf-8 -*-
//  engine-client.js ---
//  created: 2017-07-18 09:35:52
//

const log = require('winston');
const boom = require('boom');
const axios = require('axios');
const Hawk = require('hawk');

class EngineHttpClient {

    constructor(host, user, pass) {
        this.hawk = undefined;
        this.host = host;
        this.user = user;
        this.pass = pass;
    }

    _exec(method, path, body, logsz='') {

        body = body || null;
        let url = `${this.host}/${path}`;

        function req(hawk={}) {
            const header = Hawk.client.header(url, method, {credentials: hawk.credentials});
            return axios({
                method,
                url,
                data: body,
                headers: {
                    Authorization: header.field,
                }
            });
        }

        function auth(host, user, pass) {
            return axios({
                url: `${host}/auth/token`,
                method: 'POST',
                data: {username: user, password: pass},
            });
        }

        function performAuth(self) {
            return auth(self.host, self.user, self.pass).then(resp => {
                const data = resp.data;
                log.info(`${self.user} logged in`);
                self.hawk = {
                    credentials: {
                        id: data.id,
                        key: data.key,
                        algorithm: data.algorithm,
                    }
                };
            });
        }

        function error(reject, err) {
            log.error(`es> ${method} ${url} -> ${err.response.data.statusCode} (${err.response.data.message})`);
            reject(boom.create(err.response.data.statusCode, err.response.data.message));
        }

        return new Promise((resolve, reject) => {
            req(this.hawk)
            .then(result => {
                log.info(`es> ${method} ${url} OK ${logsz}`);
                resolve(result.data);
            })
            .catch(err => {
                if (!err.response || err.response.status !== 401) {
                    return error(reject, err);
                }

                log.debug('trying to authenticate');

                return performAuth(this)
                .then(() => {
                    return req(this.hawk)
                    .then(result => {
                        log.info(`es> ${method} ${url} OK  ${logsz} (After retry)`);
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

//
//  engine-client.js ends here
