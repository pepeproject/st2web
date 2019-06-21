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

import api from '@stackstorm/module-api';
import {
  actions as flexActions,
} from '@stackstorm/module-flex-table/flex-table.reducer';
import notification from '@stackstorm/module-notification';
import setTitle from '@stackstorm/module-title';

import FlexTable from '@stackstorm/module-flex-table/flex-table.component';
import PackIcon from '@stackstorm/module-pack-icon';
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
    match: PropTypes.shape({
      params: PropTypes.shape({
        ref: PropTypes.string,
        section: PropTypes.string,
      }),
    }),

    groups: PropTypes.array,
    filter: PropTypes.string,

    collapsed: PropTypes.bool,
  }

  componentDidMount() {
    this.fetchGroups();

    store.dispatch({
      type: 'FETCH_PACKS',
      promise: api.request({
        path: '/packs',
        query: {
          include_attributes: [
            'name',
            'description',
          ],
        },
      })
        .catch((err) => {
          notification.error('Unable to retrieve pack spec.', { err });
          throw err;
        }),
    });

    store.dispatch({
      type: 'FETCH_TRIGGERS',
      promise: api.request({
        path: '/triggertypes',
        // NOTE: If we don't retrieve all the attributes, "TypeError: Cannot read property 'properties' of undefined"
        // error is thrown
        /*query: {
          include_attributes: [
            'id',
            'ref',
            'pack',
            'name',
            'description',
            'parameters_schema',
            'payload_schema',
          ],
        },*/
      })
        .catch((err) => {
          notification.error('Unable to retrieve trigger spec.', { err });
          throw err;
        }),
    });

    store.dispatch({
      type: 'FETCH_ACTIONS',
      promise: api.request({
        path: '/actions/views/overview',
        query: {
          include_attributes: [
            'ref',
            'description',
            'parameters',
          ],
        },
      })
        .catch((err) => {
          notification.error('Unable to retrieve action spec.', { err });
          throw err;
        }),
    });
  }

  fetchGroups() {
    return store.dispatch({
      type: 'FETCH_GROUPS',
      promise: api.request({
        path: '/rules/views',
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
      ref = get('groups[0].munin[0].ref', this.props),
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

    const pathname = `/munin${id ? `/${id}${section ? `/${section}` : ''}` : ''}`;

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
    router.push({ pathname: '/munin/new' });
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
            { groups && groups.map(({ pack, munins }) => {
              const icon = <PackIcon naked name={pack} />;

              return (
                <FlexTableWrapper key={pack} uid={pack} title={pack} icon={icon}>
                  { munins.map((munin) => (
                    <MuninFlexCard
                      key={munin.ref} munin={munin}
                      selected={id === munin.ref}
                      onClick={() => this.handleSelect(munin.ref)}
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
