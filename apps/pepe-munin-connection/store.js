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
import { createScopedStore } from '@stackstorm/module-store';

import flexTableReducer from '@stackstorm/module-flex-table/flex-table.reducer';

const connectionReducer = (state = {}, input) => {
  let {
    groups = null,
    filter = '',
    connections = [],
    connection = undefined,
    drivers = [],
    driversSpec = undefined,
  } = state;

  state = {
    ...state,
    groups,
    filter,
    connections,
    connection,
    drivers,
    driversSpec,
  };

  switch (input.type) {
    case 'FETCH_GROUPS': {
      switch(input.status) {
        case 'success':
          connections = input.payload._embedded.connection;
          groups = makeGroups(connections, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        connections,
        groups,
        connection,
      };
    }

    case 'FETCH_CONNECTION': {
      switch(input.status) {
        case 'success':
          connection = input.payload;
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        connection,
      };
    }

    case 'FETCH_DRIVERS': {
      switch(input.status) {
        case 'success':
          drivers = input.payload._embedded.driver;

          drivers = [{'id': '#', 'name': 'Select one driver'}, ...drivers ];
          driversSpec = {
            name: 'driver',
            required: true,
            enum: _.map(drivers, (driver) => ({
              value: `http://localhost/driver/${driver.id}`,
              label: driver.alias,
            })),
          };
          break;
        case 'error':
          break;
        default:
          break;
      }
      return {
        ...state,
        driversSpec,
        drivers,
      };
    }

    case 'CREATE_CONNECTION': {
      switch(input.status) {
        case 'success':
          connection = input.payload;
          connections = [ ...connections, connection ];
          groups = makeGroups(connections, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        connection,
        connections,
        groups,
      };
    }

    case 'DELETE_CONNECTION': {
      const { id } = input;
      switch(input.status) {
        case 'success':
          connections = [ ...connections ]
            .filter(connection => parseInt(connection.id) !== id)
          ;
          groups = makeGroups(connections, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        connections,
        groups,
      };
    }

    case 'SET_FILTER': {
      filter = input.filter;
      groups = makeGroups(connections, filter);

      return {
        ...state,
        groups,
        filter,
      };
    }

    default:
      return state;
  }
};

const reducer = (state = {}, connection) => {
  state = flexTableReducer(state, connection);
  state = connectionReducer(state, connection);

  return state;
};

const store = createScopedStore('connection', reducer);

export default store;

function makeGroups(connections, filter) {
  const groups = _(connections)
    .filter(({ name }) => name.toLowerCase().indexOf(filter.toLowerCase()) > -1)
    .sortBy('name')
    .groupBy('driver.alias')
    .value()
  ;

  return Object.keys(groups).map((driver) => ({ driver, connections: groups[driver] }));
}
