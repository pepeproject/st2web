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

const metricReducer = (state = {}, input) => {
  let {
    groups = null,
    metrics = [],
    metric = undefined,
    filter = '',
    projects = [],
    project = undefined,
    projectsSpec = undefined,
    connections = [],
    connectionsSpec = undefined,
  } = state;

  state = {
    ...state,
    groups,
    metrics,
    metric,
    filter,
    projects,
    projectsSpec,
    project,
    connections,
    connectionsSpec,
  };

  switch (input.type) {
    case 'FETCH_GROUPS': {
      switch(input.status) {
        case 'success':
          metrics = input.payload._embedded.metric;
          groups = makeGroups(metrics, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        metrics,
        groups,
        metric,
      };
    }

    case 'FETCH_METRIC': {
      switch(input.status) {
        case 'success':
          metric = input.payload;
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        metric,
      };
    }

    case 'FETCH_PROJECTS': {
      switch(input.status) {
        case 'success':
          projects = input.payload._embedded.project;

          projects = [{'id': '#', 'name': 'Select one project'}, ...projects];
          projectsSpec = {
            name: 'project',
            required: true,
            enum: _.map(projects, (project) => ({
              value: `http://localhost/project/${project.id}`,
              label: project.name,
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
        projectsSpec,
        projects,
      };
    }

    case 'FETCH_CONNECTION': {
      switch(input.status) {
        case 'success':
          connections = input.payload._embedded.connection;

          connections = [{'id': '#', 'name': 'Select one connection'}, ...connections];
          connectionsSpec = {
            name: 'connection',
            required: true,
            enum: _.map(connections, (connection) => ({
              value: `http://localhost/connection/${connection.id}`,
              label: connection.name,
            })),
          };
          break;
        case 'error':
          break;
        default:
          break;

      }
      return{
        ...state,
        connectionsSpec,
        connections,
      };
    }

    case 'EDIT_METRIC': {
      switch(input.status) {
        case 'success':
          metric = input.payload;

          metrics = [ ...metrics ];
          for (const index in metrics) {
            if (metrics[index].id !== metric.id) {
              continue;
            }

            metrics[index] = metric;
          }

          groups = makeGroups(metrics, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        metric,
        metrics,
        groups,
      };
    }

    case 'CREATE_METRIC': {
      switch(input.status) {
        case 'success':
          metric = input.payload;
          metrics = [ ...metrics, metric ];
          groups = makeGroups(metrics, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        metric,
        metrics,
        groups,
      };
    }

    case 'DELETE_METRIC': {
      const { id} = input;
      switch(input.status) {
        case 'success':
          metrics = [ ...metrics ].filter(metric => metric.id != id);
          groups = makeGroups(metrics, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        metrics,
        groups,
      };
    }

    case 'SET_FILTER': {
      filter = input.filter;
      groups = makeGroups(metrics, filter);

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

const reducer = (state = {}, metric) => {
  state = flexTableReducer(state, metric);
  state = metricReducer(state, metric);

  return state;
};

const store = createScopedStore('metric', reducer);

export default store;

function makeGroups(metrics, filter) {
  const groups = _(metrics)
    .filter(({ name }) => name.toLowerCase().indexOf(filter.toLowerCase()) > -1)
    .sortBy('name')
    .groupBy('project.name')
    .value()
  ;

  return Object.keys(groups).map((project) => ({ project, metrics: groups[project] }));
}
