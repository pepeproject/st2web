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

import Button from '@stackstorm/module-forms/button.component';
import {
  PanelDetails,
  DetailsHeader,
  DetailsBody,
  DetailsPanel,
  DetailsPanelBodyLine,
  DetailsToolbar,
  DetailsToolbarSeparator, DetailsPanelBody, DetailsPanelHeading, DetailsFormLine,
} from '@stackstorm/module-panel';

@connect(({ connection }, props) => ({ connection }),
  (dispatch, props) => ({
    onComponentUpdate: () => props.id && Promise.all([
      dispatch({
        type: 'FETCH_CONNECTION',
        promise: api.request({
          path: `/connection/${props.id}?projection=recursive`,
        })
          .catch((err) => {
            notification.error(`Unable to retrieve the connection "${props.id}".`, { err });
            throw err;
          }),
      }),
    ]),
    onDelete: (id) => dispatch({
      type: 'DELETE_CONNECTION',
      id,
      promise: api.request({
        method: 'delete',
        path: `/connection/${id}`,
      })
        .then((res) => {
          notification.success(`Connection "${id}" has been deleted successfully.`);

          props.onNavigate({ id: null });

          return res;
        })
        .catch((err) => {
          notification.error(`Unable to delete connection "${id}".`, { err });
          throw err;
        }),
    }),
  }),
  (state, dispatch, props) => ({
    ...props,
    ...state,
    ...dispatch,
    onDelete: () => dispatch.onDelete(props.id),
  })
)
export default class ConnectionDetails extends React.Component {
  static propTypes = {
    onComponentUpdate: PropTypes.func,

    onDelete: PropTypes.func,

    id: PropTypes.number,
    connection: PropTypes.object,
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

  handleCancel(e) {
    e && e.preventDefault();
    this.setState({ editing: null,  connectionPreview: false });
  }

  handleDelete(e) {
    e && e.preventDefault();

    if (!window.confirm(`Do you really want to delete connection "${this.props.connection.id}"?`)) {
      return undefined;
    }

    return this.props.onDelete();
  }

  render() {
    const connection = this.props.connection;

    if (!connection) {
      return false;
    }

    setTitle([ connection.name, 'Connection' ]);

    return (
      <PanelDetails data-test="details">
        <DetailsHeader
          title={( <Link to={`/connection/${connection.id}`}>{connection.name}</Link> )}
          subtitle={connection.name}
        />
        <DetailsToolbar>
          <Button flat red value="Delete" onClick={() => this.handleDelete()} />
          <DetailsToolbarSeparator />
        </DetailsToolbar>
        <DetailsBody>
          <DetailsPanel>
            <DetailsPanelBody>
              <DetailsPanelBodyLine label="Name">
                {connection.name}
              </DetailsPanelBodyLine>
              <DetailsPanelBodyLine label="URL">
                {connection.url}
              </DetailsPanelBodyLine>
              <DetailsPanelBodyLine label="Login">
                {connection.login}
              </DetailsPanelBodyLine>
            </DetailsPanelBody>
          </DetailsPanel>
          <DetailsPanel>
            <DetailsPanelHeading title="Driver" />
            <DetailsPanelBody>
              <DetailsFormLine name="Name" value={connection.driver.name} />
              <DetailsFormLine name="Alias" value={connection.driver.alias} />
              <DetailsFormLine name="JAR" value={connection.driver.jar} />
              <DetailsFormLine name="Type" value={connection.driver.type} />
            </DetailsPanelBody>
          </DetailsPanel>
        </DetailsBody>
      </PanelDetails>
    );
  }
}
