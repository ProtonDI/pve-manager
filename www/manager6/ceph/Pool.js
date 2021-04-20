Ext.define('PVE.CephPoolInputPanel', {
    extend: 'Proxmox.panel.InputPanel',
    xtype: 'pveCephPoolInputPanel',
    mixins: ['Proxmox.Mixin.CBind'],

    showProgress: true,
    onlineHelp: 'pve_ceph_pools',

    subject: 'Ceph Pool',
    column1: [
	{
	    xtype: 'pmxDisplayEditField',
	    fieldLabel: gettext('Name'),
	    cbind: {
		editable: '{isCreate}',
		value: '{pool_name}',
		disabled: '{!isCreate}',
	    },
	    name: 'name',
	    allowBlank: false,
	},
	{
	    xtype: 'proxmoxintegerfield',
	    fieldLabel: gettext('Size'),
	    name: 'size',
	    value: 3,
	    minValue: 2,
	    maxValue: 7,
	    allowBlank: false,
	    listeners: {
		change: function(field, val) {
		    let size = Math.round(val / 2);
		    if (size > 1) {
			field.up('inputpanel').down('field[name=min_size]').setValue(size);
		    }
		},
	    },
	},
    ],
    column2: [
	{
	    xtype: 'proxmoxKVComboBox',
	    fieldLabel: 'PG Autoscale Mode',
	    name: 'pg_autoscale_mode',
	    comboItems: [
		['warn', 'warn'],
		['on', 'on'],
		['off', 'off'],
	    ],
	    value: 'warn',
	    allowBlank: false,
	    autoSelect: false,
	    labelWidth: 140,
	},
	{
	    xtype: 'proxmoxcheckbox',
	    fieldLabel: gettext('Add as Storage'),
	    cbind: {
		value: '{isCreate}',
		hidden: '{!isCreate}',
	    },
	    name: 'add_storages',
	    labelWidth: 140,
	    autoEl: {
		tag: 'div',
		'data-qtip': gettext('Add the new pool to the cluster storage configuration.'),
	    },
	},
    ],
    advancedColumn1: [
	{
	    xtype: 'proxmoxintegerfield',
	    fieldLabel: gettext('Min. Size'),
	    name: 'min_size',
	    value: 2,
	    cbind: {
		minValue: (get) => get('isCreate') ? 2 : 1,
	    },
	    maxValue: 7,
	    allowBlank: false,
	    listeners: {
		change: function(field, val) {
		    let warn = true;
		    let warn_text = gettext('Min. Size');

		    if (val < 2) {
			warn = false;
			warn_text = gettext('Min. Size') + ' <i class="fa fa-exclamation-triangle warning"></i>';
		    }

		    field.up().down('field[name=min_size-warning]').setHidden(warn);
		    field.setFieldLabel(warn_text);
		},
	    },
	},
	{
	    xtype: 'displayfield',
	    name: 'min_size-warning',
	    userCls: 'pmx-hint',
	    value: 'A pool with min_size=1 could lead to data loss, incomplete PGs or unfound objects.',
	    hidden: true,
	},
	{
	    xtype: 'pveCephRuleSelector',
	    fieldLabel: 'Crush Rule', // do not localize
	    cbind: { nodename: '{nodename}' },
	    name: 'crush_rule',
	    allowBlank: false,
	},
	{
	    xtype: 'proxmoxintegerfield',
	    fieldLabel: '# of PGs',
	    name: 'pg_num',
	    value: 128,
	    minValue: 1,
	    maxValue: 32768,
	    allowBlank: false,
	    emptyText: 128,
	},
    ],
    advancedColumn2: [
	{
	    xtype: 'numberfield',
	    fieldLabel: gettext('Target Size Ratio'),
	    name: 'target_size_ratio',
	    labelWidth: 140,
	    minValue: 0,
	    decimalPrecision: 3,
	    allowBlank: true,
	    emptyText: '0.0',
	},
	{
	    xtype: 'numberfield',
	    fieldLabel: gettext('Target Size') + ' (GiB)',
	    name: 'target_size',
	    labelWidth: 140,
	    minValue: 0,
	    allowBlank: true,
	    emptyText: '0',
	},
	{
	    xtype: 'displayfield',
	    userCls: 'pmx-hint',
	    value: 'Target Size Ratio takes precedence.',
	},
	{
	    xtype: 'proxmoxintegerfield',
	    fieldLabel: 'Min. # of PGs',
	    name: 'pg_num_min',
	    labelWidth: 140,
	    minValue: 0,
	    allowBlank: true,
	    emptyText: '0',
	},
    ],

    onGetValues: function(values) {
	Object.keys(values || {}).forEach(function(name) {
	    if (values[name] === '') {
		delete values[name];
	    }
	});

	let target_size = Number.parseFloat(values.target_size);

	if (Ext.isNumber(target_size) && target_size !== 0) {
	    values.target_size = (target_size*1024*1024*1024).toFixed(0);
	}

	return values;
    },

    setValues: function(values) {
	let target_size = Number.parseFloat(values.target_size);

	if (Ext.isNumber(target_size) && target_size !== 0) {
	    values.target_size = target_size/1024/1024/1024;
	}

	this.callParent([values]);
    },

});

Ext.define('PVE.CephPoolEdit', {
    extend: 'Proxmox.window.Edit',
    alias: 'widget.pveCephPoolEdit',
    xtype: 'pveCephPoolEdit',
    mixins: ['Proxmox.Mixin.CBind'],

    cbindData: {
	pool_name: '',
	isCreate: (cfg) => !cfg.pool_name,
    },

    cbind: {
	autoLoad: get => !get('isCreate'),
	url: get => get('isCreate')
	    ? `/nodes/${get('nodename')}/ceph/pools`
	    : `/nodes/${get('nodename')}/ceph/pools/${get('pool_name')}`,
	method: get => get('isCreate') ? 'POST' : 'PUT',
    },

    subject: gettext('Ceph Pool'),

    items: [{
	xtype: 'pveCephPoolInputPanel',
	cbind: {
	    nodename: '{nodename}',
	    pool_name: '{pool_name}',
	    isCreate: '{isCreate}',
	},
    }],
});

Ext.define('PVE.node.CephPoolList', {
    extend: 'Ext.grid.GridPanel',
    alias: 'widget.pveNodeCephPoolList',

    onlineHelp: 'chapter_pveceph',

    stateful: true,
    stateId: 'grid-ceph-pools',
    bufferedRenderer: false,

    features: [{ ftype: 'summary' }],

    columns: [
	{
	    text: gettext('Name'),
	    minWidth: 120,
	    flex: 2,
	    sortable: true,
	    dataIndex: 'pool_name',
	},
	{
	    text: gettext('Size') + '/min',
	    minWidth: 100,
	    flex: 1,
	    align: 'right',
	    renderer: function(v, meta, rec) {
		return v + '/' + rec.data.min_size;
	    },
	    dataIndex: 'size',
	},
	{
	    text: '# of Placement Groups',
	    flex: 1,
	    minWidth: 150,
	    align: 'right',
	    dataIndex: 'pg_num',
	},
	{
	    text: gettext('Optimal # of PGs'),
	    flex: 1,
	    minWidth: 140,
	    align: 'right',
	    dataIndex: 'pg_num_final',
	    renderer: function(value, metaData) {
		if (!value) {
		    value = '<i class="fa fa-info-circle faded"></i> n/a';
		    metaData.tdAttr = 'data-qtip="Needs pg_autoscaler module enabled."';
		}
		return value;
	    },
	},
	{
	    text: gettext('Min. # of PGs'),
	    flex: 1,
	    minWidth: 140,
	    align: 'right',
	    dataIndex: 'pg_num_min',
	    hidden: true,
	},
	{
	    text: gettext('Target Size Ratio'),
	    flex: 1,
	    minWidth: 140,
	    align: 'right',
	    dataIndex: 'target_size_ratio',
	    renderer: Ext.util.Format.numberRenderer('0.0000'),
	    hidden: true,
	},
	{
	    text: gettext('Target Size'),
	    flex: 1,
	    minWidth: 140,
	    align: 'right',
	    dataIndex: 'target_size',
	    hidden: true,
	    renderer: function(v, metaData, rec) {
		let value = PVE.Utils.render_size(v);
		if (rec.data.target_size_ratio > 0) {
		    value = '<i class="fa fa-info-circle faded"></i> ' + value;
		    metaData.tdAttr = 'data-qtip="Target Size Ratio takes precedence over Target Size."';
		}
		return value;
	    },
	},
	{
	    text: gettext('Autoscale Mode'),
	    flex: 1,
	    minWidth: 140,
	    align: 'right',
	    dataIndex: 'pg_autoscale_mode',
	},
	{
	    text: 'CRUSH Rule (ID)',
	    flex: 1,
	    align: 'right',
	    minWidth: 150,
	    renderer: function(v, meta, rec) {
		return v + ' (' + rec.data.crush_rule + ')';
	    },
	    dataIndex: 'crush_rule_name',
	},
	{
	    text: gettext('Used') + ' (%)',
	    flex: 1,
	    minWidth: 180,
	    sortable: true,
	    align: 'right',
	    dataIndex: 'bytes_used',
	    summaryType: 'sum',
	    summaryRenderer: PVE.Utils.render_size,
	    renderer: function(v, meta, rec) {
		let percentage = Ext.util.Format.percent(rec.data.percent_used, '0.00');
		let used = PVE.Utils.render_size(v);
		return used + ' (' + percentage + ')';
	    },
	},
    ],
    initComponent: function() {
        var me = this;

	var nodename = me.pveSelNode.data.node;
	if (!nodename) {
	    throw "no node name specified";
	}

	var sm = Ext.create('Ext.selection.RowModel', {});

	var rstore = Ext.create('Proxmox.data.UpdateStore', {
	    interval: 3000,
	    storeid: 'ceph-pool-list' + nodename,
	    model: 'ceph-pool-list',
	    proxy: {
                type: 'proxmox',
                url: "/api2/json/nodes/" + nodename + "/ceph/pools",
	    },
	});

	var store = Ext.create('Proxmox.data.DiffStore', { rstore: rstore });
	var reload = function() {
	    rstore.load();
	};

	var regex = new RegExp("not (installed|initialized)", "i");
	PVE.Utils.handleStoreErrorOrMask(me, rstore, regex, function(me, error) {
	    me.store.rstore.stopUpdate();
	    PVE.Utils.showCephInstallOrMask(me, error.statusText, nodename,
		function(win) {
		    me.mon(win, 'cephInstallWindowClosed', function() {
			me.store.rstore.startUpdate();
		    });
		},
	    );
	});

	var create_btn = new Ext.Button({
	    text: gettext('Create'),
	    handler: function() {
		var win = Ext.create('PVE.CephPoolEdit', {
		    title: gettext('Create') + ': Ceph Pool',
		    isCreate: true,
		    nodename: nodename,
		});
		win.show();
		win.on('destroy', reload);
	    },
	});

	var run_editor = function() {
	    var rec = sm.getSelection()[0];
	    if (!rec) {
		return;
	    }

	    var win = Ext.create('PVE.CephPoolEdit', {
		title: gettext('Edit') + ': Ceph Pool',
		nodename: nodename,
		pool_name: rec.data.pool_name,
	    });
            win.on('destroy', reload);
            win.show();
	};

	var edit_btn = new Proxmox.button.Button({
	    text: gettext('Edit'),
	    disabled: true,
	    selModel: sm,
	    handler: run_editor,
	});

	var destroy_btn = Ext.create('Proxmox.button.Button', {
	    text: gettext('Destroy'),
	    selModel: sm,
	    disabled: true,
	    handler: function() {
		var rec = sm.getSelection()[0];

		if (!rec.data.pool_name) {
		    return;
		}
		var base_url = '/nodes/' + nodename + '/ceph/pools/' +
		    rec.data.pool_name;

		var win = Ext.create('PVE.window.SafeDestroy', {
		    showProgress: true,
		    url: base_url,
		    params: {
			remove_storages: 1,
		    },
		    item: { type: 'CephPool', id: rec.data.pool_name },
		}).show();
		win.on('destroy', reload);
	    },
	});

	Ext.apply(me, {
	    store: store,
	    selModel: sm,
	    tbar: [create_btn, edit_btn, destroy_btn],
	    listeners: {
		activate: () => rstore.startUpdate(),
		destroy: () => rstore.stopUpdate(),
		itemdblclick: run_editor,
	    },
	});

	me.callParent();
    },
}, function() {
    Ext.define('ceph-pool-list', {
	extend: 'Ext.data.Model',
	fields: ['pool_name',
		  { name: 'pool', type: 'integer' },
		  { name: 'size', type: 'integer' },
		  { name: 'min_size', type: 'integer' },
		  { name: 'pg_num', type: 'integer' },
		  { name: 'pg_num_min', type: 'integer' },
		  { name: 'bytes_used', type: 'integer' },
		  { name: 'percent_used', type: 'number' },
		  { name: 'crush_rule', type: 'integer' },
		  { name: 'crush_rule_name', type: 'string' },
		  { name: 'pg_autoscale_mode', type: 'string' },
		  { name: 'pg_num_final', type: 'integer' },
		  { name: 'target_size_ratio', type: 'number' },
		  { name: 'target_size', type: 'integer' },
		],
	idProperty: 'pool_name',
    });
});

Ext.define('PVE.form.CephRuleSelector', {
    extend: 'Ext.form.field.ComboBox',
    alias: 'widget.pveCephRuleSelector',

    allowBlank: false,
    valueField: 'name',
    displayField: 'name',
    editable: false,
    queryMode: 'local',

    initComponent: function() {
	var me = this;

	if (!me.nodename) {
	    throw "no nodename given";
	}

	var store = Ext.create('Ext.data.Store', {
	    fields: ['name'],
	    sorters: 'name',
	    proxy: {
		type: 'proxmox',
		url: '/api2/json/nodes/' + me.nodename + '/ceph/rules',
	    },
	});

	Ext.apply(me, {
	    store: store,
	});

	me.callParent();

	store.load({
	    callback: function(rec, op, success) {
		if (success && rec.length > 0) {
		    me.select(rec[0]);
		}
	    },
	});
    },

});
