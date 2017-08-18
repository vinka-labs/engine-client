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

const getLog = () => {
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
        const log = getLog();
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

    lab.test('Get without log', () => {
        request.returns(Promise.resolve({data: {}}));
        const client = new EngineClient('localhost', 'john', 'doe');
        return client.get('trip').then(() => {
            expect(request.callCount).to.be.equal(1);
            expect(request.getCall(0).args).to.be.equal([{
                method: 'GET',
                url: 'localhost/trip',
                data: null,
                headers: {Authorization: ''},
            }]);
        });
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
});

//
//  test-engine-client.js ends here
