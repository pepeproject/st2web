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

import React from 'react';
import { PropTypes } from 'prop-types';
import { connect } from 'react-redux';

import api from '@stackstorm/module-api';
import setTitle from '@stackstorm/module-title';
import notification from '@stackstorm/module-notification';

import AutoForm from '@stackstorm/module-auto-form';
import RemoteForm from '@stackstorm/module-remote-form';
import Button from '@stackstorm/module-forms/button.component';
import Criteria from '@stackstorm/module-criteria';

import AutoFormCheckbox from '@stackstorm/module-auto-form/modules/checkbox';
import AutoFormCombobox from '@stackstorm/module-auto-form/modules/combobox';

import {
  DetailsPanel,
  DetailsPanelBody,
  DetailsButtonsPanel,
} from '@stackstorm/module-panel';

import Popup from '@stackstorm/module-popup';

const emptySpec = { enum: [] };

@connect(
  ({
    projectsSpec, connectionsSpec,
  }) => ({
    projectsSpec, connectionsSpec,
  }),
  (dispatch, props) => ({
    onSubmit: (munin) => dispatch({
      type: 'CREATE_QUERY',
      promise: api.request({
        method: 'post',
        path: '/munin',
      }, munin)
        .then((munin) => {
          notification.success(`Munin "${munin.ref}" has been created successfully.`);

          props.onNavigate({
            id: munin.ref,
            section: 'general',
          });

          return munin;
        })
        .catch((err) => {
          notification.error('Unable to create munin.', { err });
          throw err;
        }),
    }),
    onCancel: () => props.onNavigate({ id: false }),
  })
)
export default class MuninPopup extends React.Component {
  static propTypes = {
    projectsSpec: PropTypes.object,
    connectionsSpec: PropTypes.object,
    onSubmit: PropTypes.func,
    onCancel: PropTypes.func,
  }

  state = {
      payload: {
        metric: {
        name: '',
      project: {
        keystone: {
          login: '',
          password: '',
        },
      },
      connection: {
        name: '',
        url: '',
        login: '',
        password: '',
        driver: '',
      }
      }
    },
  }

  cacheMethod(key, method) {
    this.methodCache = this.methodCache || {};
    if (!this.methodCache[key]) {
      this.methodCache[key] = method;
    }

    return this.methodCache[key];
  }

  handleChange(path, value) {
    if (!path) {
      return this.setState({
        payload: {
          ...this.state.payload,
          ...value,
        },
      });
    }

    let source = this.state.payload;
    const target = { ...source };
    let current = target;

    const keys = path.split('.');
    const final = keys.pop();
    for (const key of keys) {
      if (source[key] && Array.isArray(source[key])) {
        current[key] = [ ...source[key] ];
      }
      else if (source[key] && typeof source[key] === 'object') {
        current[key] = { ...source[key] };
      }
      else {
        current[key] = {};
      }

      source = source[key];
      current = current[key];
    }

    current[final] = value;

    return this.setState({ payload: target });
  }

  handleSubmit(e) {
    e.preventDefault();
    this.props.onSubmit(this.state.payload);
  }

  render() {
    const {projectsSpec, connectionsSpec, onCancel } = this.props;
    const payload = this.state.payload;

    setTitle([ 'Create', 'Query' ]);

    return (
      <div className="st2-rerun">
        <Popup title="Create a query" onCancel={() => onCancel()} data-test="munin_create_popup">
          <form>
            <DetailsPanel>
              <DetailsPanelBody>
                <AutoForm
                  spec={{
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        required: true,
                        pattern: '^[\\w.-]+$',
                      },
                      query: {
                        type: 'string',
                        required: true,
                      },
                  },
                  }}
                  data={payload}
                  onChange={(meta) => this.handleChange(null, meta)}
                />

                <AutoFormCombobox
                  name="project"
                  spec={projectsSpec || emptySpec}
                  data={payload.project}
                  onChange={(project) => this.handleChange('project', project)}
                />

                <AutoFormCombobox
                  name="connection"
                  spec={connectionsSpec || emptySpec}
                  data={payload.connection}
                  onChange={(connection) => this.handleChange('connection', connection)}
                />

              </DetailsPanelBody>
            </DetailsPanel>

            <DetailsPanel>
              <DetailsButtonsPanel>
                <Button
                  flat red
                  className="st2-details__toolbar-button"
                  onClick={() => onCancel()}
                  value="Cancel"
                />
                <Button
                  submit
                  className="st2-details__toolbar-button"
                  value="Create"
                  onClick={(e) => this.handleSubmit(e)}
                  data-test="munin_create_submit"
                />
              </DetailsButtonsPanel>
            </DetailsPanel>
          </form>
        </Popup>
      </div>
    );
  }
}
