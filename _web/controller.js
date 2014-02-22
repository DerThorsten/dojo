var J = J || {};

J.controller = function(viewer) {

  this._viewer = viewer;

  this._last_id = null;

  this._merge_table = null;

  this._gl_merge_table_keys = null;
  this._gl_merge_table_values = null;
  this._merge_table_length = -1;

  this._lock_table = null;

  this._gl_lock_table = null;
  this._lock_table_length = -1;

  this._highlighted_id = null;

  this._activated_id = null;

  this._origin = makeid() // TODO

};

J.controller.prototype.activate = function(id) {
  if (this._activated_id == id) return;

  this._activated_id = id;

  this._viewer.redraw();
}

J.controller.prototype.highlight = function(id) {
  if (this._highlighted_id == id) return;

  this._highlighted_id = id;

  this._viewer.redraw(); 
}

J.controller.prototype.receive = function(data) {

  var input = JSON.parse(data.data);

  if (input.name == 'LOG') {
    DOJO.update_log(input.value);
    return;
  }

  if (input.origin == this._origin) {
    // we are the sender
    return;
  }

  if (input.name == 'MERGETABLE') {

    // received new merge table
    this._viewer._controller.update_merge_table(input.value);

  } else if (input.name == 'LOCKTABLE') {

    // received new lock table
    this._viewer._controller.update_lock_table(input.value);

  }

};

J.controller.prototype.send = function(name, data) {

  var output = {};
  output.name = name;
  output.origin = this._origin;
  output.value = data;

  this._viewer._websocket.send(JSON.stringify(output));

};


///
///
///


J.controller.prototype.update_merge_table = function(data) {

  console.log('Received new merge table', data);

  this._merge_table = data;

  this.create_gl_merge_table();

  this._viewer.redraw();

};

J.controller.prototype.send_merge_table = function() {

  this.send('MERGETABLE', this._merge_table);

};

J.controller.prototype.update_lock_table = function()



J.controller.prototype.send_log = function(message) {

  this.send('LOG', message);

};

J.controller.prototype.merge = function(id) {

  if (!this._merge_table) {
    throw new Error('Merge-table does not exist.');
  }

  if (!this._last_id) {
    this._last_id = this._viewer.lookup_id(id);

    this.activate(id);

    return;
  }

  if (this._last_id == id) return;

  console.log('Merging', this._last_id, id);

  // if (!(id in this._merge_table)) {
  //   this._merge_table[id] = [];
  // }

  // this._merge_table[id].push(this._last_id);

  this._merge_table[id] = this._last_id;

  var color1 = DOJO.viewer.get_color(id);
  var color1_hex = rgbToHex(color1[0], color1[1], color1[2]);
  var color2 = DOJO.viewer.get_color(this._last_id);
  var color2_hex = rgbToHex(color2[0], color2[1], color2[2]);

  var colored_id1 = id;
  var colored_id2 = this._last_id;

  var log = 'User '+this._origin+' merged labels <font color="'+color1_hex+'">'+colored_id1+'</font> and <font color="'+color2_hex+'">' +colored_id2 + '</font>.';

  this.send_log(log);
  // shouldn't be required
  // DOJO.update_log(log);

  this._viewer.redraw();

  this.send_merge_table();

  this.create_gl_merge_table();

  this.highlight(this._last_id);

};

J.controller.prototype.create_gl_merge_table = function() {

  var keys = Object.keys(this._merge_table);
  var no_keys = keys.length;

  this._merge_table_length = no_keys;

  this._gl_merge_table_keys = new Uint8Array(4 * no_keys);

  var pos = 0;
  for (var k=0; k<no_keys; k++) {
    // pack value to 4 bytes (little endian)
    var value = parseInt(keys[k],10);
    var b = from32bitTo8bit(value);
    this._gl_merge_table_keys[pos++] = b[0];
    this._gl_merge_table_keys[pos++] = b[1];
    this._gl_merge_table_keys[pos++] = b[2];
    this._gl_merge_table_keys[pos++] = b[3];
  }

  this._gl_merge_table_values = new Uint8Array(4 * no_keys);

  pos = 0;
  for (var k=0; k<no_keys; k++) {
    // pack value to 4 bytes (little endian)
    var key = parseInt(keys[k],10);
    var value = this._merge_table[key];
    var b = from32bitTo8bit(value);
    this._gl_merge_table_values[pos++] = b[0];
    this._gl_merge_table_values[pos++] = b[1];
    this._gl_merge_table_values[pos++] = b[2];
    this._gl_merge_table_values[pos++] = b[3];
  }  

};

J.controller.prototype.end_merge = function() {

  this.activate(null);
  this._last_id = null;

};
