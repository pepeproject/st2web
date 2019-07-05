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
import cx from 'classnames';

export default class MuninFlexCard extends React.Component {
  static propTypes = {
    munin: PropTypes.object.isRequired,
    selected: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
  }

  static contextTypes = {
    scrollIntoView: PropTypes.func,
  }

  static defaultProps = {
    selected: false,
  }

  render() {
    const { munin, selected, onClick } = this.props;

    return (
      <div
        className={cx('st2-flex-card', {
          'st2-flex-card--active': selected,
        })}
        onClick={onClick}
        data-test={`munin munin:${munin}`}
        ref={selected ? this.context.scrollIntoView : null}
      >
        <div className="st2-flex-card__header">
          <div className="st2-flex-card__column">
            <div className="st2-flex-card__header-primary" title={munin.name}>
              { munin.name }
            </div>
            <div className="st2-flex-card__header-secondary">

            </div>
          </div>
        </div>
      </div>
    );
  }
}
