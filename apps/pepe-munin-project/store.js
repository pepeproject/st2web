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

const projectReducer = (state = {}, input) => {
  let {
    groups = null,
    projects = [],
    project = undefined,
    filter = '',
  } = state;

  state = {
    ...state,
    groups,
    projects,
    project,
    filter,
    project,
  };

  switch (input.type) {
    case 'FETCH_PROJECT': {
      switch(input.status) {
        case 'success':
          project = input.payload;
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        project,
      };
    }

    case 'EDIT_PROJECT': {
      switch(input.status) {
        case 'success':
          project = input.payload;

          projects = [ ...projects ];
          for (const index in projects) {
            if (projects[index].id !== project.id) {
              continue;
            }

            projects[index] = project;
          }

          groups = makeGroups(projects, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        project,
        projects,
        groups,
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

    case 'CREATE_PROJECT': {
      switch(input.status) {
        case 'success':
          project = input.payload;
          projects = [ ...projects, project ];
          groups = makeGroups(projects, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        project,
        projects,
        groups,
      };
    }

    case 'DELETE_PROJECT': {
      const { id} = input;
      switch(input.status) {
        case 'success':
          projects = [ ...projects ].filter(project => project.id != id);
          groups = makeGroups(projects, filter);
          break;
        case 'error':
          break;
        default:
          break;
      }

      return {
        ...state,
        projects,
        groups,
      };
    }

    case 'SET_FILTER': {
      filter = input.filter;
      projects = makeGroups(projects, filter);

      return {
        ...state,
        groups,
        projects,
        filter,
      };
    }

    default:
      return state;
  }
};

const reducer = (state = {}, project) => {
  state = flexTableReducer(state, project);
  state = projectReducer(state, project);

  return state;
};

const store = createScopedStore('project', reducer);

export default store;

function makeGroups(projects, filter) {
  const groups = _(projects)
    .filter(({ name }) => name.toLowerCase().indexOf(filter.toLowerCase()) > -1)
    .sortBy('name')
    .groupBy('name')
    .value()
  ;

  return Object.keys(groups).map((project) => ({ project, projects: groups[project] }));
}
