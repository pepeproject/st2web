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

const muninReducer = (state = {}, input) => {
  let {
    munins = [],
    groups = null,
    filter = '',
    munin = undefined,
    projects = undefined,
  } = state;

  state = {
    ...state,
    munins,
    groups,
    filter,
    munin,
    projects,
  };

  switch (input.type) {
    case 'FETCH_GROUPS': {
      switch(input.status) {
        case 'success':
          munins = input.payload._embedded.query;
          groups = makeGroups(munins, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        munins,
        groups,
        munin,
      };
    }

    case 'FETCH_QUERY': {
      switch(input.status) {
        case 'success':
          munin = input.payload;
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        munin,
      };
    }

    case 'FETCH_PROJECTS': {
      switch(input.status) {
        case 'success':
          projects = input.payload._embedded.project;
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        projects,
      };
    }

    case 'EDIT_QUERY': {
      switch(input.status) {
        case 'success':
          munin = input.payload;

          munins = [ ...munins ];
          for (const index in munins) {
            if (munins[index].id !== munin.id) {
              continue;
            }

            munins[index] = munin;
          }

          groups = makeGroups(munins, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        munin,
        munins,
        groups,
      };
    }

    case 'CREATE_QUERY': {
      switch(input.status) {
        case 'success':
          munin = input.payload;
          munins = [ ...munins, munin ];
          groups = makeGroups(munins, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        munin,
        munins,
        groups,
      };
    }

    case 'DELETE_QUERY': {
      const { ref } = input;

      switch(input.status) {
        case 'success':
          munins = [ ...munins ]
            .filter(munin => munin.ref !== ref)
          ;
          groups = makeGroups(munins, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        munins,
        groups,
      };
    }

    case 'SET_FILTER': {
      filter = input.filter;
      groups = makeGroups(munins, filter);

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

const reducer = (state = {}, action) => {
  state = flexTableReducer(state, action);
  state = muninReducer(state, action);

  return state;
};

const store = createScopedStore('munin', reducer);

export default store;

function makeGroups(munins, filter) {
  const groups = _(munins)
    .filter(({ name }) => name.toLowerCase().indexOf(filter.toLowerCase()) > -1)
    .sortBy('name')
    .groupBy('project')
    .value()
  ;

  return Object.keys(groups).map((project) => ({ project, munins: groups[project] }));
}
