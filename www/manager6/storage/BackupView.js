Ext.define('PVE.storage.BackupView', {
    extend: 'PVE.storage.ContentView',

    alias: 'widget.pveStorageBackupView',

    showColumns: ['name', 'notes', 'date', 'format', 'size'],

    initComponent: function() {
	var me = this;

	var nodename = me.nodename = me.pveSelNode.data.node;
	if (!nodename) {
	    throw "no node name specified";
	}

	var storage = me.storage = me.pveSelNode.data.storage;
	if (!storage) {
	    throw "no storage ID specified";
	}

	me.content = 'backup';

	var sm = me.sm = Ext.create('Ext.selection.RowModel', {});

	var reload = function() {
	    me.store.load();
	};

	let pruneButton = Ext.create('Proxmox.button.Button', {
	    text: gettext('Prune group'),
	    disabled: true,
	    selModel: sm,
	    setBackupGroup: function(backup) {
		if (backup) {
		    let name = backup.text;
		    let vmid = backup.vmid;
		    let format = backup.format;

		    let vmtype;
		    if (name.startsWith('vzdump-lxc-') || format === "pbs-ct") {
			vmtype = 'lxc';
		    } else if (name.startsWith('vzdump-qemu-') || format === "pbs-vm") {
			vmtype = 'qemu';
		    }

		    if (vmid && vmtype) {
			this.setText(gettext('Prune group') + ` ${vmtype}/${vmid}`);
			this.vmid = vmid;
			this.vmtype = vmtype;
			this.setDisabled(false);
			return;
		    }
		}
		this.setText(gettext('Prune group'));
		this.vmid = null;
		this.vmtype = null;
		this.setDisabled(true);
	    },
	    handler: function(b, e, rec) {
		let win = Ext.create('PVE.window.Prune', {
		    nodename: nodename,
		    storage: storage,
		    backup_id: this.vmid,
		    backup_type: this.vmtype,
		});
		win.show();
		win.on('destroy', reload);
	    },
	});

	me.on('selectionchange', function(model, srecords, eOpts) {
	    if (srecords.length === 1) {
		pruneButton.setBackupGroup(srecords[0].data);
	    } else {
		pruneButton.setBackupGroup(null);
	    }
	});

	let isPBS = me.pluginType === 'pbs';

	me.tbar = [
	    {
		xtype: 'proxmoxButton',
		text: gettext('Restore'),
		selModel: sm,
		disabled: true,
		handler: function(b, e, rec) {
		    var vmtype;
		    if (PVE.Utils.volume_is_qemu_backup(rec.data.volid, rec.data.format)) {
			vmtype = 'qemu';
		    } else if (PVE.Utils.volume_is_lxc_backup(rec.data.volid, rec.data.format)) {
			vmtype = 'lxc';
		    } else {
			return;
		    }

		    var win = Ext.create('PVE.window.Restore', {
			nodename: nodename,
			volid: rec.data.volid,
			volidText: PVE.Utils.render_storage_content(rec.data.volid, {}, rec),
			vmtype: vmtype,
			isPBS: isPBS,
		    });
		    win.show();
		    win.on('destroy', reload);
		},
	    },
	];
	if (isPBS) {
	    me.tbar.push({
		xtype: 'proxmoxButton',
		text: gettext('File Restore'),
		disabled: true,
		selModel: sm,
		handler: function(b, e, rec) {
		    let isVMArchive = PVE.Utils.volume_is_qemu_backup(rec.data.volid, rec.data.format);
		    Ext.create('Proxmox.window.FileBrowser', {
			title: gettext('File Restore') + " - " + rec.data.text,
			listURL: `/api2/json/nodes/localhost/storage/${me.storage}/file-restore/list`,
			downloadURL: `/api2/json/nodes/localhost/storage/${me.storage}/file-restore/download`,
			extraParams: {
			    volume: rec.data.volid,
			},
			archive: isVMArchive ? 'all' : undefined,
			autoShow: true,
		    });
		},
	    });
	}
	me.tbar.push(
	    {
		xtype: 'proxmoxButton',
		text: gettext('Show Configuration'),
		disabled: true,
		selModel: sm,
		handler: function(b, e, rec) {
		    var win = Ext.create('PVE.window.BackupConfig', {
			volume: rec.data.volid,
			pveSelNode: me.pveSelNode,
		    });

		    win.show();
		},
	    },
	    {
		xtype: 'proxmoxButton',
		text: gettext('Edit Notes'),
		disabled: true,
		selModel: sm,
		handler: function(b, e, rec) {
		    let volid = rec.data.volid;
		    Ext.create('Proxmox.window.Edit', {
			autoLoad: true,
			width: 600,
			height: 400,
			resizable: true,
			title: gettext('Notes'),
			url: `/api2/extjs/nodes/${nodename}/storage/${me.storage}/content/${volid}`,
			layout: 'fit',
			items: [
			    {
				xtype: 'textarea',
				layout: 'fit',
				name: 'notes',
				height: '100%',
			    },
			],
			listeners: {
			    destroy: () => reload(),
			},
		    }).show();
		},
	    },
	    '-',
	    pruneButton,
	);

	if (isPBS) {
	    me.extraColumns = {
		encrypted: {
		    header: gettext('Encrypted'),
		    dataIndex: 'encrypted',
		    renderer: PVE.Utils.render_backup_encryption,
		},
		verification: {
		    header: gettext('Verify State'),
		    dataIndex: 'verification',
		    renderer: PVE.Utils.render_backup_verification,
		},
	    };
	}

	me.callParent();
    },
});
