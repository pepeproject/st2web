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
import notification from '@stackstorm/module-notification';
import setTitle from '@stackstorm/module-title';

import { Link } from '@stackstorm/module-router';
import Criteria from '@stackstorm/module-criteria';
import Button, { Toggle } from '@stackstorm/module-forms/button.component';
import Highlight from '@stackstorm/module-highlight';
import PackIcon from '@stackstorm/module-pack-icon';
import {
  PanelDetails,
  DetailsHeader,
  DetailsSwitch,
  DetailsBody,
  DetailsLine,
  DetailsFormLine,
  DetailsCriteriaLine,
  DetailsLineNote,
  DetailsPanel,
  DetailsPanelHeading,
  DetailsPanelBody,
  DetailsToolbar,
  DetailsToolbarSeparator,
} from '@stackstorm/module-panel';
import RemoteForm from '@stackstorm/module-remote-form';
import EnforcementPanel from './panels/enforcements';

@connect(
  ({
    munin,

    enforcements,

    triggerParameters,
    actionParameters,

    triggerSpec,
    criteriaSpecs,
    actionSpec,
    packSpec,
  }, props) => ({
    munin,

    enforcements,

    triggerParameters,
    actionParameters,

    triggerSpec,
    criteriaSpecs,
    actionSpec,
    packSpec,
  }),
  (dispatch, props) => ({
    onComponentUpdate: () => props.id && Promise.all([
      dispatch({
        type: 'FETCH_RULE',
        promise: api.request({
          path: `/munin/views/${props.id}`,
        })
          .catch((err) => {
            notification.error(`Unable to retrieve the munin "${props.id}".`, { err });
            throw err;
          }),
      }),
      dispatch({
        type: 'FETCH_ENFORCEMENTS',
        promise: api.request({ path: '/ruleenforcements/views', query: {
          munin_ref: props.id,
          limit: 10,
        }})
          .catch((err) => {
            notification.error(`Unable to retrieve enforcements for "${props.id}".`, { err });
            throw err;
          }),
      }),
    ]),
    onSave: (munin) => dispatch({
      type: 'EDIT_RULE',
      promise: api.request({
        method: 'put',
        path: `/munin/${munin.id}`,
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
          path: `/munin/views/${munin.ref}`,
        }))
        .catch((err) => {
          notification.error(`Unable to retrieve the munin "${munin.ref}".`, { err });
          throw err;
        }),
    }),
    onDelete: (ref) => dispatch({
      type: 'DELETE_RULE',
      ref,
      promise: api.request({
        method: 'delete',
        path: `/munin/${ref}`,
      })
        .then((res) => {
          notification.success(`Munin "${ref}" has been deleted successfully.`);

          props.onNavigate({ id: null });

          return res;
        })
        .catch((err) => {
          notification.error(`Unable to delete munin "${ref}".`, { err });
          throw err;
        }),
    }),
    onToggleEnable: (munin) => dispatch({
      type: 'TOGGLE_ENABLE',
      promise: api.request({
        method: 'put',
        path: `/munin/${munin.id}`,
      }, { 
        ...munin, 
        enabled: !munin.enabled,
      }),
    })
      .catch((err) => {
        notification.error(`Unable to update munin "${munin.ref}".`, { err });
        throw err;
      }),
  }),
  (state, dispatch, props) => ({
    ...props,
    ...state,
    ...dispatch,
    onSave: (munin) => dispatch.onSave(munin),
    onDelete: () => dispatch.onDelete(props.id),
    onToggleEnable: () => dispatch.onToggleEnable(state.munin),
  })
)
export default class MuninDetails extends React.Component {
  static propTypes = {
    onComponentUpdate: PropTypes.func,

    onNavigate: PropTypes.func.isRequired,
    onSave: PropTypes.func,
    onDelete: PropTypes.func,
    onToggleEnable: PropTypes.func,

    id: PropTypes.string,
    section: PropTypes.string,
    munin: PropTypes.object,

    triggerParameters: PropTypes.object,
    actionParameters: PropTypes.object,

    enforcements: PropTypes.array,

    triggerSpec: PropTypes.object,
    criteriaSpecs: PropTypes.object,
    actionSpec: PropTypes.object,
    packSpec: PropTypes.object,
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
    return this.props.onNavigate({ id: munin.ref, section });
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

    if (!window.confirm(`Do you really want to delete munin "${this.props.munin.ref}"?`)) {
      return undefined;
    }

    return this.props.onDelete();
  }

  handleToggleEnable(munin) {
    return this.props.onToggleEnable();
  }

  handleToggleRunPreview() {
    let { muninPreview } = this.state;

    muninPreview = !muninPreview;

    this.setState({ muninPreview });
  }

  render() {
    const {
      section,
      enforcements, 
      triggerParameters, 
      actionParameters, 
      triggerSpec, 
      criteriaSpecs, 
      actionSpec, 
      packSpec,
    } = this.props;

    const munin = this.state.editing || this.props.munin;

    if (!munin || !triggerParameters || !actionParameters) {
      return false;
    }

    const trigger = triggerParameters[munin.trigger.type];
    const action = actionParameters[munin.action.ref];

    setTitle([ munin.ref, 'Munin' ]);

    return (
      <PanelDetails data-test="details">
        <DetailsHeader
          status={munin.enabled ? 'enabled' : 'disabled'}
          title={( <Link to={`/munin/${munin.ref}`}>{munin.ref}</Link> )}
          subtitle={munin.description}
        />
        <DetailsSwitch
          sections={[
            { label: 'General', path: 'general' },
            { label: 'Enforcements', path: 'enforcements' },
            { label: 'Code', path: 'code', className: [ 'icon-code', 'st2-details__switch-button' ] },
          ]}
          current={section}
          onChange={({ path }) => this.handleSection(path)}
        />
        <DetailsToolbar>
          <Toggle title="enabled" value={munin.enabled} onChange={() => this.handleToggleEnable(munin)} />
          { this.state.editing ? [
            <Button key="save" value="Save" onClick={() => this.handleSave()} data-test="save_button" />,
            <Button flat red key="cancel" value="Cancel" onClick={() => this.handleCancel()} data-test="cancel_button" />,
            <Button flat key="preview" value="Preview" onClick={() => this.handleToggleRunPreview()} />,
          ] : [
            <Button flat key="edit" value="Edit" onClick={() => this.handleEdit()} data-test="edit_button" />,
            <Button flat red key="delete" value="Delete" onClick={() => this.handleDelete()} data-test="delete_button" />,
          ] }
          <DetailsToolbarSeparator />
        </DetailsToolbar>
        { this.state.muninPreview && <Highlight key="preview" well data-test="munin_preview" code={munin} /> }
        <div className="pepe-munin__conditions">
          <div className="pepe-munin__condition-if" data-test="condition_if">
            <div className="pepe-munin__column-trigger" title={munin.trigger.type}>
              <span className="pepe-munin__label">If</span>
              <PackIcon className="pepe-munin__condition-icon" name={munin && munin.trigger.type.split('.')[0]} />

              <span className="pepe-munin__name">
                { munin.trigger.type }
              </span>
              { munin.trigger.description ? (
                <span className="pepe-munin__description">
                  { munin.trigger.description }
                </span>
              ) : null }
            </div>
          </div>
          <div className="pepe-munin__condition-then" data-test="condition_then">
            <div className="pepe-munin__column-action" title={munin.action.ref}>
              <span className="pepe-munin__label">Then</span>
              <PackIcon className="pepe-munin__condition-icon" name={munin && munin.action.ref.split('.')[0]} />

              <span className="pepe-munin__name">
                { munin.action.ref }
              </span>
              <span className="pepe-munin__description">
                { munin.action.description }
              </span>
            </div>
          </div>
        </div>
        <DetailsBody>
          { section === 'general' ? (
            !this.state.editing ? (
              <div>
                <DetailsPanel>
                  <DetailsPanelHeading title="Trigger" />
                  <DetailsPanelBody>
                    <Link to={`/triggers/${munin.trigger.type}`}>{munin.trigger.type}</Link>
                    {
                      trigger
                        ? (
                          trigger
                            .map(({ name, default:def }) => {
                              const value = munin.trigger.parameters[name] !== undefined ? munin.trigger.parameters[name] : def;
    
                              if (value === undefined) {
                                return false;
                              }
    
                              return <DetailsFormLine key={name} name={name} value={value} />;
                            })
                        ) : (
                          <div>
                            Trigger is missing
                          </div>
                        )
                        
                    }
                  </DetailsPanelBody>
                </DetailsPanel>
                <DetailsPanel>
                  <DetailsPanelHeading title="Action" />
                  <DetailsPanelBody>
                    <Link to={`/actions/${munin.action.ref}`}>{munin.action.ref}</Link>
                    {
                      action 
                        ? (
                          action
                            .map(({ name, default:def }) => {
                              const value = munin.action.parameters[name] !== undefined ? munin.action.parameters[name] : def;

                              if (value === undefined) {
                                return false;
                              }

                              return <DetailsFormLine key={name} name={name} value={value} />;
                            })
                        ) : (
                          <DetailsLineNote>
                            Action has not been installed
                          </DetailsLineNote>
                        )
                    }
                  </DetailsPanelBody>
                </DetailsPanel>
                <DetailsPanel>
                  <DetailsPanelHeading title="Munin" />
                  <DetailsPanelBody>
                    <DetailsLine name="pack" value={<Link to={`/packs/${munin.pack}`}>{munin.pack}</Link>} />
                  </DetailsPanelBody>
                </DetailsPanel>
                <DetailsPanel>
                  <DetailsPanelHeading title="Criteria" />
                  <DetailsPanelBody>
                    {
                      Object.keys(munin.criteria || {}).length
                        ? (
                          Object.keys(munin.criteria || {})
                            .map(name => {
                              const { type, pattern } = munin.criteria[name];
                              return <DetailsCriteriaLine key={`${name}//${type}//${pattern}`} name={name} type={type} pattern={pattern} />;
                            })
                        ) : (
                          <DetailsLineNote>
                            No criteria defined for this munin
                          </DetailsLineNote>
                        )
                    }
                  </DetailsPanelBody>
                </DetailsPanel>
              </div>
            ) : (
              <form name="form">
                { triggerSpec ? (
                  <DetailsPanel>
                    <DetailsPanelHeading title="Trigger" />
                    <DetailsPanelBody>
                      <RemoteForm
                        name="trigger"
                        disabled={!this.state.editing}
                        spec={triggerSpec}
                        data={munin.trigger}
                        onChange={(trigger) => this.handleChange('trigger', trigger)}
                        data-test="munin_trigger_form"
                      />
                    </DetailsPanelBody>
                  </DetailsPanel>
                ) : null }
                { criteriaSpecs ? (
                  <DetailsPanel>
                    <DetailsPanelHeading title="Criteria" />
                    <DetailsPanelBody>
                      <Criteria
                        disabled={!this.state.editing}
                        data={munin.criteria}
                        spec={criteriaSpecs[munin.trigger.type]}
                        onChange={(criteria) => this.handleChange('criteria', criteria)}
                        data-test="munin_criteria_form"
                      />
                    </DetailsPanelBody>
                  </DetailsPanel>
                ) : null }
                { actionSpec ? (
                  <DetailsPanel>
                    <DetailsPanelHeading title="Action" />
                    <DetailsPanelBody>
                      <RemoteForm
                        name="action"
                        disabled={!this.state.editing}
                        spec={actionSpec}
                        data={munin.action}
                        onChange={(action) => this.handleChange('action', action)}
                        data-test="munin_action_form"
                      />
                    </DetailsPanelBody>
                  </DetailsPanel>
                ) : null }
                { packSpec ? (
                  <DetailsPanel>
                    <DetailsPanelHeading title="Munin" />
                    <DetailsPanelBody>
                      <RemoteForm
                        name="pack"
                        disabled={!this.state.editing}
                        spec={packSpec}
                        data={{ pack: munin.pack, parameters: munin }}
                        onChange={({ pack, parameters: munin }) =>
                          pack === munin.pack
                            ? this.handleChange(null, munin)
                            : this.handleChange('pack', pack)
                        }
                        data-test="munin_pack_form"
                      />
                    </DetailsPanelBody>
                  </DetailsPanel>
                ) : null }
              </form>
            )
          ) : null }
          { section === 'code' ? (
            <DetailsPanel data-test="munin_code">
              <Highlight code={munin} type="munin" id={munin.id} />
            </DetailsPanel>
          ) : null }
          { section === 'enforcements' ? (
            <EnforcementPanel enforcements={enforcements} data-test="munin_enforcements" />
          ) : null }
        </DetailsBody>
      </PanelDetails>
    );
  }
}
