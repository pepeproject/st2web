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
import store from './store';

import get from 'lodash/fp/get';

import api from '../../modules/pepe-api';

import {
  actions as flexActions,
} from '@stackstorm/module-flex-table/flex-table.reducer';
import notification from '@stackstorm/module-notification';
import setTitle from '@stackstorm/module-title';

import FlexTable from '@stackstorm/module-flex-table/flex-table.component';
import {
  Panel,
  PanelView,
  Toolbar,
  ToolbarButton,
  ToolbarActions,
  ToolbarSearch,
  Content,
  ContentEmpty,
  ToggleButton,
} from '@stackstorm/module-panel';
import MetricFlexCard from './metric-flex-card.component';
import MetricDetails from './metric-details.component';
import MetricPopup from './metric-popup.component';

import router from '@stackstorm/module-router';

import './style.css';

@connect((state, props) => {
  const { uid } = props;
  const { collapsed = state.collapsed } = state.tables[uid] || {};

  return { collapsed, ...props };
}, (dispatch, props) => {
  const { uid } = props;

  return {
    onToggle: () => store.dispatch(flexActions.toggle(uid)),
  };
})
class FlexTableWrapper extends FlexTable {
  componentDidMount() {
    const { uid } = this.props;

    store.dispatch(flexActions.register(uid, false));
  }
}

@connect(({
  metric, groups, filter, collapsed,
}) => ({
  metric, groups, filter, collapsed,
}))
export default class MetricPanel extends React.Component {
  static propTypes = {
    location: PropTypes.shape({
      search: PropTypes.string,
    }),

    groups: PropTypes.array,
    filter: PropTypes.string,

    collapsed: PropTypes.bool,
  }

  componentDidMount() {
    this.fetchGroups();

    store.dispatch({
      type: 'FETCH_PROJECTS',
      promise: api.request({
        path: '/project?projection=recursive',
      })
        .catch((err) => {
          notification.error('Unable to retrieve project spec.', { err });
          throw err;
        }),
    });


    store.dispatch({
      type: 'FETCH_CONNECTION',
      promise: api.request({
        path: '/connection?projection=recursive',
      })
        .catch((err) => {
          notification.error('Unable to retrieve project spec.', { err });
          throw err;
        }),
    });

  }

  fetchGroups() {
    return store.dispatch({
      type: 'FETCH_GROUPS',
      promise: api.request({
        path: '/metric?projection=recursive',
      })
        .catch((err) => {
          notification.error('Unable to retrieve metrics.', { err });
          throw err;
        }),
    })
      .then(() => {
        const { id } = this.urlParams;
        const { groups } = this.props;
        if (id && id !== 'new' && groups && !groups.some(({ metrics }) => metrics.some(({ id }) => id === id))) {
          this.navigate({ id: false });
        }
      })
    ;
  }

  get urlParams() {
    const {
      ref = get('groups[0].metrics[0].id', this.props),
    } = this.props.match.params;

    return {
      id: parseInt(ref),
    };
  }

  navigate({ id } = {}) {
    const current = this.urlParams;

    if (typeof id === 'undefined') {
      if (this.props.match.params.ref) {
        id = current.id;
      }
    }
    if (!id) {
      id = undefined;
    }

    const pathname = `/metric${id ? `/${id}` : ''}`;

    const { location } = this.props;
    if (location.pathname === pathname) {
      return;
    }

    router.push({ pathname });
  }

  handleSelect(id) {
    this.navigate({ id });
  }

  handleToggleAll() {
    return store.dispatch(flexActions.toggleAll());
  }

  handleFilterChange(filter) {
    store.dispatch({
      type: 'SET_FILTER',
      filter,
    });
  }

  handleCreatePopup() {
    router.push({ pathname: '/metric/new' });
  }

  render() {
    const { groups, filter, collapsed } = this.props;
    const { id } = this.urlParams;

    setTitle([ 'Metric' ]);

    return (
      <Panel data-test="metric_panel" detailed>
        <PanelView className="pepe-munin-metric">
          <ToolbarActions>
            <ToolbarButton onClick={() => this.handleCreatePopup()}>
              <i className="icon-plus" data-test="metric_create_button" />
            </ToolbarButton>
          </ToolbarActions>
          <Toolbar title="Metric">
            <ToggleButton collapsed={collapsed} onClick={() => this.handleToggleAll()} />
            <ToolbarSearch
              title="Filter"
              value={filter}
              onChange={({ target: { value }}) => this.handleFilterChange(value)}
            />
          </Toolbar>
          <Content>
            { groups && groups.map(({ project, metrics }) => {
              return (
                <FlexTableWrapper key={project} title={project} uid={project}>
                  { metrics.map((metric) => (
                    <MetricFlexCard
                      key={metric.id} metric={metric}
                      selected={id === metric.id}
                      onClick={() => this.handleSelect(metric.id)}
                    />
                  )) }
                </FlexTableWrapper>
              );
              
            }) }

            { !groups || groups.length > 0 ? null : (
              <ContentEmpty />
            ) }
          </Content>
        </PanelView>

        <MetricDetails
          ref={(ref) => this._details = ref}
          onNavigate={(...args) => this.navigate(...args)}

          id={id}
        />

        { id === 'new' ? (
          <MetricPopup
            onNavigate={(...args) => this.navigate(...args)}
          />
        ) : null }
      </Panel>
    );
  }
}
