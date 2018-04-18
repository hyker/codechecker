// -------------------------------------------------------------------------
//                     The CodeChecker Infrastructure
//   This file is distributed under the University of Illinois Open Source
//   License. See LICENSE.TXT for details.
// -------------------------------------------------------------------------

define([
  'dojo/_base/declare',
  'dojo/dom-construct',
  'dojo/topic',
  'dijit/Dialog',
  'dojox/widget/Standby',
  'dijit/layout/ContentPane',
  'codechecker/hashHelper',
  'codechecker/util'],
function (declare, dom, topic, Dialog, Standby, ContentPane, hashHelper, util) {

  return declare(ContentPane, {
    postCreate : function () {
      this._dialog = new Dialog({
        title : 'Check command',
        style : 'max-width: 75%;'
      });

      this._standBy = new Standby({
        target : this.domNode,
        color : '#ffffff'
      });
      this.addChild(this._standBy);
    },

    initRunHistory : function () {
      var that = this;

      var runIds = this.runData ? [this.runData.runId] : null;
      this._standBy.show();
      CC_SERVICE.getRunHistory(runIds, CC_OBJECTS.MAX_QUERY_SIZE, 0, null,
      function (historyData) {
        that.renderRunHistoryTable(historyData);
        that._standBy.hide();
      });
    },

    // Renders the list of run histories.
    renderRunHistoryTable : function (historyData) {
      var that = this;

      var historyGroupByDate = {};
      historyData.forEach(function (data) {
        var date = new Date(data.time.replace(/ /g,'T'));
        var groupDate = date.getDate() + ' '
          + util.getMonthName(date.getMonth()) + ', '
          + date.getFullYear();

        if (!historyGroupByDate[groupDate])
          historyGroupByDate[groupDate] = [];

        historyGroupByDate[groupDate].push(data);
      });

      var filter = this.bugFilterView;
      var dateFilter = filter._detectionDateFilter;
      var dsFilter = filter._detectionStatusFilter;
      var runFilter = filter._runNameFilter;

      Object.keys(historyGroupByDate).forEach(function (key) {
        var group = dom.create('div', { class : 'history-group' }, that.domNode);
        dom.create('div', { class : 'header', innerHTML : key }, group);
        var content = dom.create('div', { class : 'content' }, group);

        historyGroupByDate[key].forEach(function (data) {
          var date = new Date(data.time.replace(/ /g,'T'));
          var time = util.formatDateAMPM(date);

          var history = dom.create('div', {
            class : 'history',
          }, content);

          var wrapper = dom.create('span', {
            onclick : function () {
              that.onRunHistoryClick(data);
            }
          }, history);

          dom.create('span', { class : 'time', innerHTML : time }, wrapper);

          var runNameWrapper = dom.create('span', { class : 'run-name-wrapper', title: 'Run name'}, wrapper);
          dom.create('span', { class : 'customIcon run-name' }, runNameWrapper);
          dom.create('span', { class : 'run-name', innerHTML : data.runName }, runNameWrapper);

          if (data.versionTag) {
            var runTag = util.createRunTag(data.runName, data.versionTag);
            dom.place(runTag, wrapper);
          }

          var userWrapper = dom.create('span', {class : 'user-wrapper', title: 'User name' }, wrapper);
          dom.create('span', { class : 'customIcon user' }, userWrapper);
          dom.create('span', { class : 'user', innerHTML : data.user }, userWrapper);

          if (data.checkCommand)
            var checkCommand = dom.create('span', {
              class : 'check-command link',
              innerHTML : 'Check command',
              onclick : function () {
                that._dialog.set('content', data.checkCommand);
                that._dialog.show();
              }
            }, history);
        })
      });
    },

    onRunHistoryClick : function (item) {
      var filter = this.bugFilterView;
      this.bugFilterView.clearAll();

      if (filter._runNameFilter)
        filter._runNameFilter.select(item.runName);

      if (!item.versionTag) {
        [
          CC_OBJECTS.DetectionStatus.NEW,
          CC_OBJECTS.DetectionStatus.UNRESOLVED,
          CC_OBJECTS.DetectionStatus.REOPENED
        ].forEach(function (status) {
          filter._detectionStatusFilter.select(
            filter._detectionStatusFilter.stateConverter(status));
        });

        var date = new Date(item.time.replace(/ /g,'T'));
        filter._detectionDateFilter.initFixedDateInterval(
          this._formatDate(date));
      } else {
        filter._runHistoryTagFilter.select(
          item.runName + ":" + item.versionTag);
      }

      this.bugFilterView.notifyAll();
      hashHelper.setStateValues({subtab : null});
    },

    _formatDate : function (date) {
      var mm = date.getMonth() + 1; // getMonth() is zero-based
      var dd = date.getDate();

      return [date.getFullYear(),
              (mm > 9 ? '' : '0') + mm,
              (dd > 9 ? '' : '0') + dd
             ].join('-') + ' ' +
             [date.getHours(),
              date.getMinutes(),
              date.getSeconds() + (date.getMilliseconds() > 0 ? 1 : 0)
             ].join(':');
    }
  });
});
