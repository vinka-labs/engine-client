//  -*- coding: utf-8 -*-
//  test-engine-client.js ---
//  created: 2017-08-16 22:06:18
//

'use strict';

const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Code = require('code');
const expect = Code.expect;
const sinon = require('sinon');
const EngineClient = require('../index');

const createLog = () => {
    const stash = [];
    return {
        info: msg => stash.push(msg),
        warn: msg => stash.push(msg),
        debug: msg => stash.push(msg),
        error: msg => stash.push(msg),

        getStash: () => stash,
    };
};

lab.experiment('EngineClient', function() {
    let request;

    lab.beforeEach(done => {
        request = sinon.stub(EngineClient.internals, 'request');
        done();
    });

    lab.afterEach(done => {
        if (EngineClient.internals.request.restore) {
            EngineClient.internals.request.restore();
        }
        request = null;
        done();
    });

    lab.test('New', (done) => {
        const client = new EngineClient();
        expect(client).to.be.instanceof(EngineClient);
        done();
    });

    lab.test('Get with log', () => {
        const log = createLog();
        request.returns(Promise.resolve({data: {}}));
        const client = new EngineClient('localhost', 'john', 'doe', log);
        return client.get('trip').then(() => {
            expect(request.callCount).to.be.equal(1);
            expect(request.getCall(0).args).to.be.equal([{
                method: 'GET',
                url: 'localhost/trip',
                data: null,
                headers: {Authorization: ''},
            }]);
            expect(log.getStash()).to.be.equal(['es> GET localhost/trip OK ']);
        });
    });

    lab.test('Get without log', async () => {
        request.returns(Promise.resolve({data: {}}));
        const client = new EngineClient('localhost', 'john', 'doe');
        await client.get('trip');
        expect(request.callCount).to.be.equal(1);
        expect(request.getCall(0).args).to.be.equal([{
            method: 'GET',
            url: 'localhost/trip',
            data: null,
            headers: {Authorization: ''},
        }]);
    });

    lab.test('PUT', async () => {
        request.returns(Promise.resolve({data: {}}));
        const client = new EngineClient('localhost', 'john', 'doe');
        await client.put('trip', {one: 'two'});
        expect(request.callCount).to.be.equal(1);
        expect(request.getCall(0).args).to.be.equal([{
            method: 'PUT',
            url: 'localhost/trip',
            data: {one: 'two'},
            headers: {Authorization: ''},
        }]);
    });

    lab.test('Get with log but suppress log line', async () => {
        const log = createLog();
        request.returns(Promise.resolve({data: {}}));
        const client = new EngineClient('localhost', 'john', 'doe', log);

        await client.get('trip', null);
        expect(request.callCount).to.be.equal(1);
        expect(request.getCall(0).args).to.be.equal([{
            method: 'GET',
            url: 'localhost/trip',
            data: null,
            headers: {Authorization: ''},
        }]);
        expect(log.getStash()).to.be.equal([]);

        await client.post('trip', {}, null);
        expect(log.getStash()).to.be.equal([]);

        await client.patch('trip/1', {}, null);
        expect(log.getStash()).to.be.equal([]);

        await client.delete('trip/1', null);
        expect(log.getStash()).to.be.equal([]);
    });

    lab.test('Get from unknown host', () => {
        request.restore();
        const client = new EngineClient('foo.jedi.gov', 'john', 'doe');
        return client.get('one').then(() => {
            Code.fail('should fail');
        }, err => {
            expect(err.message).to.match(/ECONN/);
        });
    });

    lab.test('Get from closed port', () => {
        request.restore();
        const client = new EngineClient('www.google.com:11118', 'john', 'doe');
        return client.get('one').then(() => {
            Code.fail('should fail');
        }, err => {
            expect(err.message).to.match(/EHOST/);
        });
    });

    lab.test('Get undefined error response', () => {
        request.returns(Promise.reject());
        const client = new EngineClient('www.localhost.com');
        return client.delete('/bautista').then(() => {
            Code.fail('should fail');
        }, err => {
            expect(err).to.be.undefined();
        });
    });

    lab.test('Get weird error response', () => {
        request.returns(Promise.reject({response: {thirdbase: 'donaldson'}}));
        const client = new EngineClient('www.localhost.com');
        return client.delete('/encarnacion').then(() => {
            Code.fail('should fail');
        }, err => {
            expect(err).to.be.equal({response: {thirdbase: 'donaldson'}});
        });
    });

    lab.test('Get even weirder error response', () => {
        request.returns(Promise.reject({response: {data: 'donaldson'}}));
        const client = new EngineClient('www.localhost.com');
        return client.delete('/encarnacion').then(() => {
            Code.fail('should fail');
        }, err => {
            expect(err.isBoom).to.be.true();
            expect(err.isServer).to.be.true();
            expect(err.output.statusCode).to.be.equal(500);
        });
    });

    lab.test('Get Not Found', async () => {
        request.returns(Promise.reject({response: {data: 'donaldson', status: 400}}));
        const client = new EngineClient('http://google.com');
        try {
            const response = await client.get('/w4w4w');
            Code.fail('should fail');
        } catch (e) {
            expect(e.output.statusCode).to.be.equal(400);
        }
    });

    lab.test('Error with object', async () => {
        request.returns(Promise.reject({response: {data: {code: 444, msg: 'hiihoo'}, status: 400}}));
        const client = new EngineClient('https://es.tre-test.vinka.cloud');
        try {
            const response = await client.get('w4w4w');
            Code.fail('should fail');
        } catch (e) {
            expect(e.output.statusCode).to.be.equal(400);
            expect(e.output.payload).to.be.equal({
                statusCode: 400,
                error: "Bad Request",
                message: `{"code":444,"msg":"hiihoo"}`,
            });
        }
    });
});

lab.experiment('HTTP tests', () => {
    lab.test('Get Not Found', async () => {
        const log = createLog();
        const client = new EngineClient('https://es.tre-test.vinka.fi', null, null, log);
        try {
            const response = await client.get('w4w4w');
            Code.fail('should fail');
        } catch (e) {
            expect(e.output.statusCode).to.be.equal(404);
            expect(e.output.payload).to.be.equal({
                statusCode: 404,
                error: "Not Found",
                message: `{"statusCode":404,"error":"Not Found","message":"Not Found"}`,
            });
            expect(log.getStash()).to.have.length(1);
            expect(log.getStash()).to.be.equal([
                `es> GET https://es.tre-test.vinka.fi/w4w4w -> 404 ({"statusCode":404,"error":"Not Found","message":"Not Found"})`
            ]);
        }
    });
});

//
//  test-engine-client.js ends here
