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

import api from '../../modules/pepe';

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
import MuninFlexCard from './munin-flex-card.component';
import MuninDetails from './munin-details.component';
import MuninPopup from './munin-popup.component';

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
  munin, groups, filter, collapsed,
}) => ({
  munin, groups, filter, collapsed,
}))
export default class MuninPanel extends React.Component {
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
        path: '/project',
      })
        .catch((err) => {
          notification.error('Unable to retrieve project spec.', { err });
          throw err;
        }),
    });


    store.dispatch({
      type: 'FETCH_CONNECTION',
      promise: api.request({
        path: '/connection',
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
        path: '/metric/view',
      })
      .catch((err) => {
        notification.error('Unable to retrieve munin.', { err });
        throw err;
      }),
    })
      .then(() => {
        const { id } = this.urlParams;
        const { groups } = this.props;
        if (id && id !== 'new' && groups && !groups.some(({ munin }) => munin.some(({ ref }) => ref === id))) {
          this.navigate({ id: false });
        }
      })
    ;
  }

  get urlParams() {
    const {
      ref = get('queries[0].query[0].name', this.props),
      section = 'general',
    } = this.props.match.params;

    return {
      id: ref,
      section,
    };
  }

  navigate({ id, section } = {}) {
    const current = this.urlParams;

    if (typeof id === 'undefined') {
      if (this.props.match.params.ref) {
        id = current.id;
      }
    }
    if (!id) {
      id = undefined;
    }

    if (typeof section === 'undefined') {
      section = current.section;
    }
    if (section === 'general') {
      section = undefined;
    }

    const pathname = `/metric${id ? `/${id}${section ? `/${section}` : ''}` : ''}`;

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
    const { id, section } = this.urlParams;

    setTitle([ 'Munin' ]);

    return (
      <Panel data-test="munin_panel" detailed>
        <PanelView className="pepe-munin">
          <ToolbarActions>
            <ToolbarButton onClick={() => this.handleCreatePopup()}>
              <i className="icon-plus" data-test="munin_create_button" />
            </ToolbarButton>
          </ToolbarActions>
          <Toolbar title="Munin">
            <ToggleButton collapsed={collapsed} onClick={() => this.handleToggleAll()} />
            <ToolbarSearch
              title="Filter"
              value={filter}
              onChange={({ target: { value }}) => this.handleFilterChange(value)}
            />
          </Toolbar>
          <Content>
            { groups && groups.map(({ project, munins }) => {
              return (
                <FlexTableWrapper key={project} title={project} uid={project}>
                  { munins.map((munin) => (
                    <MuninFlexCard
                      key={munin.id} munin={munin}
                      selected={id === munin.id}
                      onClick={() => this.handleSelect(munin.id)}
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

        <MuninDetails
          ref={(ref) => this._details = ref}
          onNavigate={(...args) => this.navigate(...args)}

          id={id}
          section={section}
        />

        { id === 'new' ? (
          <MuninPopup
            onNavigate={(...args) => this.navigate(...args)}
          />
        ) : null }
      </Panel>
    );
  }
}
