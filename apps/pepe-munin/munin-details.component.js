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

import api from '../../modules/pepe-api';
import notification from '@stackstorm/module-notification';
import setTitle from '@stackstorm/module-title';

import { Link } from '@stackstorm/module-router';
import RemoteForm from '@stackstorm/module-remote-form';

import Button from '@stackstorm/module-forms/button.component';
import {
  PanelDetails,
  DetailsHeader,
  DetailsBody,
  DetailsPanel,
  DetailsToolbar,
  DetailsToolbarSeparator, DetailsPanelBody, DetailsButtonsPanel,
} from '@stackstorm/module-panel';
import Table from '@stackstorm/app-packs/table.component';
import AutoForm from '@stackstorm/module-auto-form';
import AutoFormCombobox from '@stackstorm/module-auto-form/modules/combobox';
import Popup from '@stackstorm/module-popup';

@connect(({ munin, muninSpec }, props) => ({ munin, muninSpec }),
  (dispatch, props) => ({
    onComponentUpdate: () => props.id && Promise.all([
      dispatch({
        type: 'FETCH_QUERY',
        promise: api.request({
          path: `/metric/${props.id}?projection=recursive`,
        })
          .catch((err) => {
            notification.error(`Unable to retrieve the munin "${props.id}".`, { err });
            throw err;
          }),
      }),
    ]),
    onSave: (munin) => dispatch({
      type: 'EDIT_RULE',
      promise: api.request({
        method: 'put',
        path: `/rules/${munin.id}`,
      }, munin)
        .then((munin) => {
          notification.success(`Munin "${munin.ref}" has been saved successfully.`);

          props.onNavigate({
            id: munin.ref,
            section: 'general',
          });

          return munin;
        })
        .catch((err) => {
          notification.error(`Unable to save munin "${munin.ref}".`, { err });
          throw err;
        })
        .then((munin) => api.request({
          path: `/rules/views/${munin.ref}`,
        }))
        .catch((err) => {
          notification.error(`Unable to retrieve the munin "${munin.ref}".`, { err });
          throw err;
        }),
    }),
    onDelete: (id) => dispatch({
      type: 'DELETE_METRIC',
      id,
      promise: api.request({
        method: 'delete',
        path: `/metric/${id}`,
      })
        .then((res) => {
          notification.success(`Metric "${id}" has been deleted successfully.`);

          props.onNavigate({ id: null });

          return res;
        })
        .catch((err) => {
          notification.error(`Unable to delete metric "${id}".`, { err });
          throw err;
        }),
    }),
  }),
  (state, dispatch, props) => ({
    ...props,
    ...state,
    ...dispatch,
    onSave: (munin) => dispatch.onSave(munin),
    onDelete: () => dispatch.onDelete(props.id),
  })
)
export default class MuninDetails extends React.Component {
  static propTypes = {
    onComponentUpdate: PropTypes.func,

    onNavigate: PropTypes.func.isRequired,
    onSave: PropTypes.func,
    onDelete: PropTypes.func,

    id: PropTypes.string,
    section: PropTypes.string,
    munin: PropTypes.object,
    muninSpec: PropTypes.object,

  }

  state = {
    editing: null,
    muninPreview: false,
  }

  componentDidMount() {
    this.props.onComponentUpdate && this.props.onComponentUpdate();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.id === this.props.id) {
      return;
    }

    if (this.props.id === 'new') {
      return;
    }

    this.props.onComponentUpdate && this.props.onComponentUpdate();
  }

  handleSection(section) {
    const { munin } = this.props;
    return this.props.onNavigate({ id: munin.id, section });
  }

  handleChange(path, value) {
    if (!path) {
      return this.setState({ editing: {
        ...this.state.editing,
        ...value,
      } });
    }

    let source = this.state.editing;
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

    return this.setState({ editing: target });
  }

  handleEdit(e) {
    e && e.preventDefault();
    this.setState({ editing: this.props.munin });
  }

  handleCancel(e) {
    e && e.preventDefault();
    this.setState({ editing: null, muninPreview: false });
  }

  handleSave(e) {
    e && e.preventDefault();

    return this.props.onSave(this.state.editing)
      .then(() => {
        this.setState({ editing: null, muninPreview: false });
      });
  }

  handleDelete(e) {
    e && e.preventDefault();

    if (!window.confirm(`Do you really want to delete munin "${this.props.munin.id}"?`)) {
      return undefined;
    }

    return this.props.onDelete();
  }

  handleToggleRunPreview() {
    let { muninPreview } = this.state;

    muninPreview = !muninPreview;

    this.setState({ muninPreview });
  }

  render() {


    const {
      muninSpec,
    } = this.props;


    const munin = this.props.munin;

    if (!munin) {
      return false;
    }

    setTitle([ munin.name, 'Munin' ]);

    return (
      <PanelDetails data-test="details">
        <DetailsHeader
          title={( <Link to={`/munin/${munin.id}`}>{munin.name}</Link> )}
          subtitle={munin.value}
        />
        <DetailsToolbar>
            <Button flat red value="Delete" value="Delete" onClick={() => this.handleDelete()} />
          <DetailsToolbarSeparator />
        </DetailsToolbar>
        <DetailsBody>
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
                      connection: {
                        type: 'object',
                        required: true,
                      },
                    project: {
                      type: 'object',
                      required: true,

                    },
                    },
                  }}
                  data={munin}
                  onChange={(meta) => this.handleChange(null, meta)}
                />



              </DetailsPanelBody>
            </DetailsPanel>
          </form>



        </DetailsBody>
      </PanelDetails>
    );
  }
}
