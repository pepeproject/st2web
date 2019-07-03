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

import _ from 'lodash';
import axios from 'axios';
import buildURL from 'axios/lib/helpers/buildURL';

function toBase64(str) {
  if (global.window && window.btoa) {
    return btoa(str);
  }
  else {
    return global.Buffer.from(str.toString(), 'binary').toString('base64');
  }
}

export class API {
  constructor() {
    this.token = null;

    const { server, token } = this.readPersistent();

    if (server && token) {
      const server_custom = window.st2constants.st2Config.hosts[0];

      this.token = token;
      this.server = server;
      if (server_custom.pepe) {
        this.server.pepe = server_custom.pepe;
      } else {
        this.server.pepe = `${window.location.protocol || 'https:'}//${window.location.host}/munin`;
      }
    }
  }

  readPersistent() {
    try {
      return JSON.parse(localStorage.getItem('st2Session')) || {};
    }
    catch (e) {
      return {};
    }
  }

  route(opts) {
    const {
      path,
      version = 'v1',
    } = opts;

    const verPath = version ? `/${_.trim(version, '/')}` : '';

    return `${this.server.pepe}${verPath}${path}`;
  }

  async request(opts, data) {
    const {
      method = 'get',
      query,
      raw = false,
    } = opts;

    const headers = {
      'content-type': 'application/json',
    };

    if (this.token && this.token.token && this.token.user) {
      headers['Authorization'] = `Basic ${toBase64(`${this.token.user}:${this.token.token}`)}`;
    }
    
    const config = {
      method,
      url: this.route(opts),
      params: query,
      headers,
      transformResponse: [],
      data,
      withCredentials: true,
      paramsSerializer: params => {
        params = _.mapValues(params, param => {
          if (_.isArray(param)) {
            return param.join(',');
          }
          
          return param;
        });

        return buildURL('', params).substr(1);
      },
    };

    if (this.rejectUnauthorized === false) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
    }
  
    const response = await axios(config);

    const contentType = (response.headers || {})['content-type'] || [];
    const requestId = (response.headers || {})['X-Request-ID'] || null;

    response.headers = response.headers || {};
    response.statusCode = response.status;
    response.body = response.data;

    if (requestId) {
      response.requestId = requestId;
    }

    if (raw) {
      return response;
    }

    if (contentType.indexOf('application/json') !== -1) {
      if (typeof response.body === 'string' || response.body instanceof String) {
        response.body = JSON.parse(response.body);
      }
    }

    return response.data;
  }

}

const pepeapi = new API();

export default pepeapi;
