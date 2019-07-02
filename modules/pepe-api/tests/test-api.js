// Copyright 2019 Extreme Networks, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { expect } from 'chai';

import '@stackstorm/module-test-utils/bootstrap/st2constants';
import '@stackstorm/module-test-utils/bootstrap/storage';
import '@stackstorm/module-test-utils/bootstrap/location';
import { API } from '..';

describe('API', () => {
  describe('inherits host from window', () => {
    const host = window.location.host; // capture initial value
    window.location.host = 'www.example.net:1234'; // set test value

    const pepeapi = new API();

    expect(pepeapi.server.pepe).to.equal('https://www.example.net:1234/munin'); // always

    window.location.host = host; // restore initial value
  });

  describe('can work with http', () => {
    // capture initial value
    const host = window.location.host;
    const protocol = window.location.protocol;

    // set test value
    window.location.host = 'www.example.net:1234';
    window.location.protocol = 'http:';

    const pepeapi = new API();

    expect(pepeapi.server.pepe).to.equal('http://www.example.net:1234/munin');

    // restore initial value
    window.location.host = host;
    window.location.protocol = protocol;
  });
});
