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
import ConnectionFlexCard from './connection-flex-card.component';
import ConnectionDetails from './connection-details.component';
import ConnectionPopup from './connection-popup.component';

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
  connection, groups, filter, collapsed,
}) => ({
  connection, groups, filter, collapsed,
}))
export default class ConnectionPanel extends React.Component {
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
      type: 'FETCH_DRIVERS',
      promise: api.request({
        path: '/driver?projection=recursive',
      })
        .catch((err) => {
          notification.error('Unable to retrieve driver spec.', { err });
          throw err;
        }),
    });
  }

  fetchGroups() {
    return store.dispatch({
      type: 'FETCH_GROUPS',
      promise: api.request({
        path: '/connection?projection=recursive',
      })
        .catch((err) => {
          notification.error('Unable to retrieve connections.', { err });
          throw err;
        }),
    })
      .then(() => {
        const { id } = this.urlParams;
        const { groups } = this.props;
        if (id && id !== 'new' && groups && !groups.some(({ connections }) => connections.some(({ id }) => id === id))) {
          this.navigate({ id: false });
        }
      })
    ;
  }

  get urlParams() {
    const {
      ref = get('groups[0].connections[0].id', this.props),
    } = this.props.match.params;

    return {
      id: ref,
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

    const pathname = `/connection${id ? `/${id}` : ''}`;

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
    router.push({ pathname: '/connection/new' });
  }

  render() {
    const { groups, filter, collapsed } = this.props;
    const { id } = this.urlParams;

    setTitle([ 'Connection' ]);

    return (
      <Panel data-test="connection_panel" detailed>
        <PanelView className="pepe-munin-connection">
          <ToolbarActions>
            <ToolbarButton onClick={() => this.handleCreatePopup()}>
              <i className="icon-plus" data-test="connection_create_button" />
            </ToolbarButton>
          </ToolbarActions>
          <Toolbar title="Connection">
            <ToggleButton collapsed={collapsed} onClick={() => this.handleToggleAll()} />
            <ToolbarSearch
              title="Filter"
              value={filter}
              onChange={({ target: { value }}) => this.handleFilterChange(value)}
            />
          </Toolbar>
          <Content>
            { groups && groups.map(({ driver, connections }) => {
              return (
                <FlexTableWrapper key={driver} title={driver} uid={driver}>
                  { connections.map((connection) => (
                    <ConnectionFlexCard
                      key={connection.id} connection={connection}
                      selected={Number(id) === connection.id}
                      onClick={() => this.handleSelect(connection.id)}
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

        <ConnectionDetails
          ref={(ref) => this._details = ref}
          onNavigate={(...args) => this.navigate(...args)}

          id={Number(id)}
        />

        { id === 'new' ? (
          <ConnectionPopup
            onNavigate={(...args) => this.navigate(...args)}
          />
        ) : null }
      </Panel>
    );
  }
}
