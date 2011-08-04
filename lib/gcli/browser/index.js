/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

// Check GCLI is loaded
require('gcli/index');

var Requisition = require('gcli/cli').Requisition;

var CommandOutputListView = require('gcli/browser/command_output_view').CommandOutputListView;
var Popup = require('gcli/browser/popup').Popup;
var Inputter = require('gcli/browser/inputter').Inputter;
var Hinter = require('gcli/browser/hinter').Hinter;

var ArgFetcher = require('gcli/browser/arg_fetch').ArgFetcher;
var Menu = require('gcli/browser/menu').Menu;
var Templater = require('gcli/browser/domtemplate').Templater;


/**
 * A class to handle the simplest UI implementation
 */
exports.createView = function(options) {
  options = options || {};

  if (!options.document) {
    options.document = document;
  }

  // The requisition depends on no UI components
  if (options.requisition == null) {
    options.requisition = new Requisition(options.environment, options.document);
  }
  else if (typeof options.requisition === 'function') {
    options.requisition = new options.requisition(options);
  }

  // The inputter should depend only on the requisition
  if (options.inputter == null) {
    options.inputter = new Inputter(options);
  }
  else if (typeof options.inputter === 'function') {
    options.inputter = new options.inputter(options);
  }

  // We need to init the popup children before the Popup itself
  if (options.children == null) {
    options.children = [
      new Hinter(options),
      new CommandOutputListView(options)
    ];
  }
  else {
    for (var i = 0; i < options.children.length; i++) {
      if (typeof options.children[i] === 'function') {
        options.children[i] = new options.children[i](options);
      }
    }
  }

  // The Popup has most dependencies
  if (options.popup == null) {
    options.popup = new Popup(options);
  }
  else if (typeof options.popup === 'function') {
    options.popup = new options.popup(options);
  }

  options.inputter.update();
};


});
