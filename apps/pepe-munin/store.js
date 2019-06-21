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
    triggerParameters = undefined,
    actionParameters = undefined,
    packs = undefined,
    triggerSpec = undefined,
    criteriaSpecs = undefined,
    actionSpec = undefined,
    packSpec = undefined,
  } = state;

  state = {
    ...state,
    munins,
    groups,
    filter,
    munin,
    triggerParameters,
    actionParameters,
    packs,
    triggerSpec,
    criteriaSpecs,
    actionSpec,
    packSpec,
  };

  switch (input.type) {
    case 'FETCH_GROUPS': {
      switch(input.status) {
        case 'success':
          munins = input.payload;
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

    case 'FETCH_RULE': {
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

    case 'FETCH_TRIGGERS': {
      switch(input.status) {
        case 'success':
          criteriaSpecs = {};

          const triggers = input.payload;

          triggerSpec = {
            name: 'type',
            required: true,
            enum: _.map(triggers, (trigger) => {
              criteriaSpecs[trigger.ref] = {
                required: true,
                enum: _.map(trigger.payload_schema.properties, (spec, name) => ({
                  name: `trigger.${name}`,
                  description: spec.description,
                })),
              };

              return {
                name: trigger.ref,
                description: trigger.description,
                spec: trigger.parameters_schema,
              };
            }),
          };

          triggerParameters = _.mapValues(_.keyBy(triggers, 'ref'), trigger => {
            return _.keys(trigger.parameters_schema.properties)
              .map(key => {
                return {
                  name: key,
                  default: trigger.parameters_schema.properties[key].default,
                };
              });
          });
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        triggerSpec,
        criteriaSpecs,
        triggerParameters,
      };
    }

    case 'FETCH_ACTIONS': {
      switch(input.status) {
        case 'success':
          const actions = input.payload;

          actionSpec = {
            name: 'ref',
            required: true,
            enum: _.map(actions, (action) => ({
              name: action.ref,
              description: action.description,
              spec: {
                type: 'object',
                properties: action.parameters,
              },
            })),
          };

          actionParameters = _.mapValues(_.keyBy(actions, 'ref'), action => {
            return Object.keys(action.parameters || {})
              .map(key => {
                return {
                  name: key,
                  default: action.parameters[key].default,
                };
              });
          });
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        actionSpec,
        actionParameters,
      };
    }

    case 'FETCH_PACKS': {
      switch(input.status) {
        case 'success':
          packs = input.payload;

          packSpec = {
            name: 'pack',
            required: true,
            default: 'default',
            enum: _.map(packs, (pack) => ({
              name: pack.name,
              description: pack.description,
              spec: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    required: true,
                    pattern: '^[\\w.-]+$',
                  },
                  description: {
                    type: 'string',
                  },
                },
              },
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
        packSpec,
        packs,
      };
    }

    case 'EDIT_RULE': {
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

    case 'CREATE_RULE': {
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

    case 'DELETE_RULE': {
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
    .filter(({ ref }) => ref.toLowerCase().indexOf(filter.toLowerCase()) > -1)
    .sortBy('ref')
    .groupBy('pack')
    .value()
  ;

  return Object.keys(groups).map((pack) => ({ pack, munin: groups[pack] }));
}
