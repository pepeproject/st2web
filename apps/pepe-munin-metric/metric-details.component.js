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
  DetailsToolbarSeparator, DetailsPanelBody,
} from '@stackstorm/module-panel';

@connect(({ metric }, props) => ({ metric }),
  (dispatch, props) => ({
    onComponentUpdate: () => props.id && Promise.all([
      dispatch({
        type: 'FETCH_METRIC',
        promise: api.request({
          path: `/metric/${props.id}?projection=recursive`,
        })
          .catch((err) => {
            notification.error(`Unable to retrieve the metric "${props.id}".`, { err });
            throw err;
          }),
      }),
    ]),
    onSave: (metric) => dispatch({
      type: 'EDIT_METRIC',
      promise: api.request({
        method: 'put',
        path: `/metric/${metric.id}`,
      }, metric)
        .then((metric) => {
          notification.success(`Metric "${metric.id}" has been saved successfully.`);

          props.onNavigate({
            id: metric.id,
            section: 'general',
          });

          return metric;
        })
        .catch((err) => {
          notification.error(`Unable to save metric "${metric.id}".`, { err });
          throw err;
        })
        .then((metric) => api.request({
          path: `/metric/${metric.id}`,
        }))
        .catch((err) => {
          notification.error(`Unable to retrieve the metric "${metric.id}".`, { err });
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
    onSave: (metric) => dispatch.onSave(metric),
    onDelete: () => dispatch.onDelete(props.id),
  })
)
export default class MetricDetails extends React.Component {
  static propTypes = {
    onComponentUpdate: PropTypes.func,

    onSave: PropTypes.func,
    onDelete: PropTypes.func,

    id: PropTypes.number,
    metric: PropTypes.object,
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
    this.setState({ editing: null,  metricPreview: false });
  }

  handleSave(e) {
    e && e.preventDefault();

    return this.props.onSave(this.state.editing)
      .then(() => {
        this.setState({ editing: null, metricPreview: false });
      });
  }

  handleDelete(e) {
    e && e.preventDefault();

    if (!window.confirm(`Do you really want to delete metric "${this.props.metric.id}"?`)) {
      return undefined;
    }

    return this.props.onDelete();
  }

  render() {
    const metric = this.props.metric;

    if (!metric) {
      return false;
    }

    setTitle([ metric.name, 'Metric' ]);

    return (
      <PanelDetails data-test="details">
        <DetailsHeader
          title={( <Link to={`/metric/${metric.id}`}>{metric.name}</Link> )}
          subtitle={metric.name}
        />
        <DetailsToolbar>
          <Button flat red value="Delete" onClick={() => this.handleDelete()} />
          <DetailsToolbarSeparator />
        </DetailsToolbar>
        <DetailsBody>
          <form>
            <DetailsPanel>
              <DetailsPanelBody>
                <DetailsPanelBodyLine label="Name">
                  {metric.name}
                </DetailsPanelBodyLine>
                <DetailsPanelBodyLine label="Query">
                  {metric.query}
                </DetailsPanelBodyLine>
              </DetailsPanelBody>
            </DetailsPanel>
          </form>
        </DetailsBody>
      </PanelDetails>
    );
  }
}
