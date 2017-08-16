//  -*- coding: utf-8 -*-
//  test-engine-client.js ---
//  created: 2017-08-16 22:06:18
//

'use strict';

const Lab = require('lab');
const lab = exports.lab = Lab.script();
const Code = require('code');
const expect = Code.expect;
const EngineClient = require('../index');

lab.experiment('EngineClient', function() {
    lab.test('Placeholder', function(done) {
        const client = new EngineClient();
        expect(client).to.be.instanceof(EngineClient);
        done();
    });
});

//
//  test-engine-client.js ends here
