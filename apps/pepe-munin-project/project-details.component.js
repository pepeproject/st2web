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
import AutoForm from '@stackstorm/module-auto-form';

@connect(({ project }, props) => ({ project }),
  (dispatch, props) => ({
    onComponentUpdate: () => props.id && Promise.all([
      dispatch({
        type: 'FETCH_PROJECT',
        promise: api.request({
          path: `/project/${props.id}`,
        })
          .catch((err) => {
            notification.error(`Unable to retrieve the project "${props.id}".`, { err });
            throw err;
          }),
      }),
    ]),
    onSave: (project) => dispatch({
      type: 'EDIT_PROJECT',
      promise: api.request({
        method: 'put',
        path: `/project/${project.id}`,
      }, project)
        .then((project) => {
          notification.success(`Project "${project.id}" has been saved successfully.`);

          props.onNavigate({
            id: project.id,
            section: 'general',
          });

          return project;
        })
        .catch((err) => {
          notification.error(`Unable to save project "${project.id}".`, { err });
          throw err;
        })
        .then((project) => api.request({
          path: `/project/${project.id}`,
        }))
        .catch((err) => {
          notification.error(`Unable to retrieve the project "${project.id}".`, { err });
          throw err;
        }),
    }),
    onDelete: (id) => dispatch({
      type: 'DELETE_PROJECT',
      id,
      promise: api.request({
        method: 'delete',
        path: `/project/${id}`,
      })
        .then((res) => {
          notification.success(`Project "${id}" has been deleted successfully.`);

          props.onNavigate({ id: null });

          return res;
        })
        .catch((err) => {
          notification.error(`Unable to delete project "${id}".`, { err });
          throw err;
        }),
    }),
  }),
  (state, dispatch, props) => ({
    ...props,
    ...state,
    ...dispatch,
    onSave: (project) => dispatch.onSave(project),
    onDelete: () => dispatch.onDelete(props.id),
  })
)
export default class ProjectDetails extends React.Component {
  static propTypes = {
    onComponentUpdate: PropTypes.func,

    onNavigate: PropTypes.func.isRequired,
    onSave: PropTypes.func,
    onDelete: PropTypes.func,

    id: PropTypes.number,
    section: PropTypes.string,
    project: PropTypes.object

  }

  state = {
    editing: null,
    projectPreview: false,
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
    const { project } = this.props;
    return this.props.onNavigate({ id: project.id, section });
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
    this.setState({ editing: this.props.project });
  }

  handleCancel(e) {
    e && e.preventDefault();
    this.setState({ editing: null,  projectPreview: false });
  }

  handleSave(e) {
    e && e.preventDefault();

    return this.props.onSave(this.state.editing)
      .then(() => {
        this.setState({ editing: null, projectPreview: false });
      });
  }

  handleDelete(e) {
    e && e.preventDefault();

    if (!window.confirm(`Do you really want to delete project "${this.props.project.id}"?`)) {
      return undefined;
    }

    return this.props.onDelete();
  }

  handleToggleRunPreview() {
    let { projectPreview } = this.state;

    projectPreview = !projectPreview;

    this.setState({ projectPreview });
  }

  render() {
    const project = this.props.project;

    if (!project) {
      return false;
    }

    setTitle([ project.name, 'Project' ]);

    return (
      <PanelDetails data-test="details">
      <DetailsHeader
        title={( <Link to={`/project/${project.id}`}>{project.name}</Link> )}
        subtitle={project.name}
      />
      <DetailsToolbar>
          <Button flat red value="Delete" value="Delete" onClick={() => this.handleDelete()} />
        <DetailsToolbarSeparator />
      </DetailsToolbar>
      <DetailsBody>
        <form>
          <DetailsPanel>
            <DetailsPanelBody>

            <DetailsPanelBodyLine label="Name">
                 {project.name}
              </DetailsPanelBodyLine>
              <DetailsPanelBodyLine label="Keystone Login">
                 {project.keystone.login}
              </DetailsPanelBodyLine>
            </DetailsPanelBody>
          </DetailsPanel>
        </form>



      </DetailsBody>
    </PanelDetails>

    );
  }
}
