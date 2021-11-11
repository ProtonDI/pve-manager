Ext.define('PVE.window.ScheduleSimulator', {
    extend: 'Ext.window.Window',

    title: gettext('Job Schedule Simulator'),

    controller: {
	xclass: 'Ext.app.ViewController',
	close: function() { this.getView().close(); },
	simulate: function() {
	    let me = this;
	    let schedule = me.lookup('schedule').getValue();
	    if (!schedule) {
		return;
	    }
	    let iterations = me.lookup('iterations').getValue() || 10;
	    Proxmox.Utils.API2Request({
		url: '/cluster/jobs/schedule-analyze',
		method: 'GET',
		params: {
		    schedule,
		    iterations,
		},
		failure: response => Ext.Msg.alert(gettext('Error'), response.htmlStatus),
		success: function(response) {
		    let schedules = response.result.data;
		    me.lookup('grid').getStore().setData(schedules);
		},
	    });
	},

	scheduleChanged: function(field, value) {
	    this.lookup('simulateBtn').setDisabled(!value);
	},

	renderTimestamp: function(value) {
	    let date = new Date(value*1000);
	    return date.toLocaleString();
	},

	init: function(view) {
	    let me = this;
	    if (view.schedule) {
		me.lookup('schedule').setValue(view.schedule);
	    }
	},
    },

    bodyPadding: 10,
    modal: true,
    resizable: false,
    width: 600,

    layout: 'fit',

    items: [
	{
	    xtype: 'inputpanel',
	    column1: [
		{
		    xtype: 'pveCalendarEvent',
		    reference: 'schedule',
		    fieldLabel: gettext('Schedule'),
		    listeners: {
			change: 'scheduleChanged',
		    },
		},
		{
		    xtype: 'proxmoxintegerfield',
		    minValue: 1,
		    maxValue: 100,
		    value: 10,
		    reference: 'iterations',
		    fieldLabel: gettext('Iterations'),
		},
		{
		    xtype: 'container',
		    layout: 'hbox',
		    items: [
			{
			    xtype: 'box',
			    flex: 1,
			},
			{
			    xtype: 'button',
			    reference: 'simulateBtn',
			    text: gettext('Simulate'),
			    handler: 'simulate',
			    disabled: true,
			},
		    ],
		},
	    ],

	    column2: [
		{
		    xtype: 'grid',
		    reference: 'grid',
		    emptyText: Proxmox.Utils.NoneText,
		    scrollable: true,
		    height: 300,
		    columns: [
			{
			    text: gettext('Local Time'),
			    renderer: 'renderTimestamp',
			    dataIndex: 'timestamp',
			    flex: 1,
			},
		    ],
		    store: {
			fields: ['timestamp'],
			data: [],
			sorter: 'timestamp',
		    },
		},
	    ],
	},
    ],

    buttons: [
	{
	    text: gettext('OK'),
	    handler: 'close',
	},
    ],
});
