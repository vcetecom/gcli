/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Define a module along with a payload.
 * @param moduleName Name for the payload
 * @param deps Ignored. For compatibility with CommonJS AMD Spec
 * @param payload Function with (require, exports, module) params
 */
function define(moduleName, deps, payload) {
  if (typeof moduleName != "string") {
    throw new Error("Error: Module name is not a string");
  }

  if (arguments.length == 2) {
    payload = deps;
  }
  else {
    payload.deps = deps;
  }

  if (define.debugDependencies) {
    console.log("define: " + moduleName + " -> " + payload.toString()
        .slice(0, 40).replace(/\n/, '\\n').replace(/\r/, '\\r') + "...");
  }

  if (moduleName in define.modules) {
    throw new Error("Error: Redefining module: " + moduleName);
  }

  // Mark the payload so we know we need to call it to get the real module
  payload.__uncompiled = true;
  define.modules[moduleName] = payload;
}

/**
 * The global store of un-instantiated modules
 */
define.modules = {};

/**
 * Should we console.log on module definition/instantiation/requirement?
 */
define.debugDependencies = false;


(function() {

/**
 * We invoke require() in the context of a Domain so we can have multiple
 * sets of modules running separate from each other.
 * This contrasts with JSMs which are singletons, Domains allows us to
 * optionally load a CommonJS module twice with separate data each time.
 * Perhaps you want 2 command lines with a different set of commands in each,
 * for example.
 */
function Domain() {
  this.modules = {};

  if (define.debugDependencies) {
    this.depth = "";
  }
}

/**
 * Lookup module names and resolve them by calling the definition function if
 * needed.
 * There are 2 ways to call this, either with an array of dependencies and a
 * callback to call when the dependencies are found (which can happen
 * asynchronously in an in-page context) or with a single string an no
 * callback where the dependency is resolved synchronously and returned.
 * The API is designed to be compatible with the CommonJS AMD spec and
 * RequireJS.
 * @param deps A name, or array of names for the payload
 * @param callback Function to call when the dependencies are resolved
 * @return The module required or undefined for array/callback method
 */
Domain.prototype.require = function(config, deps, callback) {
  if (arguments.length <= 2) {
    callback = deps;
    deps = config;
    config = undefined;
  }

  if (Array.isArray(deps)) {
    var params = deps.map(function(dep) {
      return this.lookup(dep);
    }, this);
    if (callback) {
      callback.apply(null, params);
    }
    return undefined;
  }
  else {
    return this.lookup(deps);
  }
};

/**
 * Lookup module names and resolve them by calling the definition function if
 * needed.
 * @param moduleName A name for the payload to lookup
 * @return The module specified by aModuleName or null if not found
 */
Domain.prototype.lookup = function(moduleName) {
  if (moduleName in this.modules) {
    var module = this.modules[moduleName];
    if (define.debugDependencies) {
      console.log(this.depth + " Using module: " + moduleName);
    }
    return module;
  }

  if (!(moduleName in define.modules)) {
    throw new Error("Missing module: " + moduleName);
  }

  var module = define.modules[moduleName];

  if (define.debugDependencies) {
    console.log(this.depth + " Compiling module: " + moduleName);
  }

  if (module.__uncompiled) {
    if (define.debugDependencies) {
      this.depth += ".";
    }

    var exports = {};
    try {
      var params = module.deps.map(function(dep) {
        if (dep === "require") {
          return this.require.bind(this);
        }
        if (dep === "exports") {
          return exports;
        }
        if (dep === "module") {
          return { id: moduleName, uri: "" };
        }
        return this.lookup(dep);
      }.bind(this));

      var reply = module.apply(null, params);
      module = (reply !== undefined) ? reply : exports;
    }
    catch (ex) {
      console.error("Error using module: " + moduleName, ex);
      throw ex;
    }

    if (define.debugDependencies) {
      this.depth = this.depth.slice(0, -1);
    }
  }

  // cache the resulting module object for next time
  this.modules[moduleName] = module;

  return module;
};

/**
 * Expose the Domain constructor and a global domain (on the define function
 * to avoid exporting more than we need. This is a common pattern with
 * require systems)
 */
define.Domain = Domain;
define.globalDomain = new Domain();

})();

/**
 * Expose a default require function which is the require of the global
 * sandbox to make it easy to use.
 */
var require = define.globalDomain.require.bind(define.globalDomain);
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/index', ['require', 'exports', 'module' , 'gcli/legacy', 'gcli/canon', 'gcli/types/basic', 'gcli/types/command', 'gcli/types/javascript', 'gcli/types/node', 'gcli/types/resource', 'gcli/types/selection', 'gcli/types/setting', 'gcli/settings', 'gcli/cli', 'gcli/ui/intro', 'gcli/ui/focus', 'gcli/ui/fields/basic', 'gcli/ui/fields/javascript', 'gcli/ui/fields/selection', 'gcli/ui/display'], function(require, exports, module) {

  // Patch-up IE9
  require('gcli/legacy');

  // The API for use by command authors
  exports.addCommand = require('gcli/canon').addCommand;
  exports.removeCommand = require('gcli/canon').removeCommand;

  require('gcli/types/basic').startup();
  require('gcli/types/command').startup();
  require('gcli/types/javascript').startup();
  require('gcli/types/node').startup();
  require('gcli/types/resource').startup();
  require('gcli/types/selection').startup();
  require('gcli/types/setting').startup();

  require('gcli/settings').startup();
  require('gcli/cli').startup();
  require('gcli/ui/intro').startup();
  require('gcli/ui/focus').startup();
  require('gcli/ui/fields/basic').startup();
  require('gcli/ui/fields/javascript').startup();
  require('gcli/ui/fields/selection').startup();

  var display = require('gcli/ui/display');

  /**
   * Create a basic UI for GCLI on the web
   */
  exports.createDisplay = function(options) {
    return display.createDisplay(options || {});
  };

  /**
   * @deprecated Use createDisplay
   */
  exports.createView = exports.createDisplay;
});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/legacy', ['require', 'exports', 'module' ], function(require, exports, module) {

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  /**
   * Fake a console for IE9
   */
  if (window.console == null) {
    window.console = {};
  }
  'debug,log,warn,error,trace,group,groupEnd'.split(',').forEach(function(f) {
    if (!window.console[f]) {
      window.console[f] = function() {};
    }
  });

  /**
   * Fake Element.classList for IE9
   * Based on https://gist.github.com/1381839 by Devon Govett
   */
  if (!('classList' in document.documentElement) && Object.defineProperty &&
          typeof HTMLElement !== 'undefined') {
    Object.defineProperty(HTMLElement.prototype, 'classList', {
      get: function() {
        var self = this;
        function update(fn) {
          return function(value) {
            var classes = self.className.split(/\s+/);
            var index = classes.indexOf(value);
            fn(classes, index, value);
            self.className = classes.join(' ');
          };
        }

        var ret = {
          add: update(function(classes, index, value) {
            ~index || classes.push(value);
          }),
          remove: update(function(classes, index) {
            ~index && classes.splice(index, 1);
          }),
          toggle: update(function(classes, index, value) {
            ~index ? classes.splice(index, 1) : classes.push(value);
          }),
          contains: function(value) {
            return !!~self.className.split(/\s+/).indexOf(value);
          },
          item: function(i) {
            return self.className.split(/\s+/)[i] || null;
          }
        };

        Object.defineProperty(ret, 'length', {
          get: function() {
            return self.className.split(/\s+/).length;
          }
        });

        return ret;
      }
    });
  }

  /**
   * Fake Range.createContextualFragment for IE9
   */
  if (typeof Range.prototype.createContextualFragment === 'undefined') {
    Range.prototype.createContextualFragment = function(html) {
      var container = this.startContainer;
      var doc = container.nodeType == 9 /* i.e. Node.DOCUMENT_NODE */ ?
              container :
              container.ownerDocument;
      var div = doc.createElement('div');
      div.innerHTML = html;
      var frag = doc.createDocumentFragment();
      var n;
      while (n = div.firstChild) {
        frag.appendChild(n);
      }
      return frag;
    };
  }

  /**
   * String.prototype.trimLeft is non-standard, but it works in Firefox,
   * Chrome and Opera. It's easiest to create a shim here.
   */
  if (!String.prototype.trimLeft) {
    String.prototype.trimLeft = function() {
      return String(this).replace(/\s*$/, '');
    };
  }

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/canon', ['require', 'exports', 'module' , 'gcli/util', 'gcli/l10n', 'gcli/types', 'gcli/types/basic', 'gcli/types/selection'], function(require, exports, module) {
var canon = exports;


var util = require('gcli/util');
var l10n = require('gcli/l10n');

var types = require('gcli/types');
var Status = require('gcli/types').Status;
var BooleanType = require('gcli/types/basic').BooleanType;
var SelectionType = require('gcli/types/selection').SelectionType;

/**
 * Implement the localization algorithm for any documentation objects (i.e.
 * description and manual) in a command.
 * @param data The data assigned to a description or manual property
 * @param onUndefined If data == null, should we return the data untouched or
 * lookup a 'we don't know' key in it's place.
 */
function lookup(data, onUndefined) {
  if (data == null) {
    if (onUndefined) {
      return l10n.lookup(onUndefined);
    }

    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'object') {
    if (data.key) {
      return l10n.lookup(data.key);
    }

    var locales = l10n.getPreferredLocales();
    var translated;
    locales.some(function(locale) {
      translated = data[locale];
      return translated != null;
    });
    if (translated != null) {
      return translated;
    }

    console.error('Can\'t find locale in descriptions: ' +
            'locales=' + JSON.stringify(locales) + ', ' +
            'description=' + JSON.stringify(data));
    return '(No description)';
  }

  return l10n.lookup(onUndefined);
}


/**
 * The command object is mostly just setup around a commandSpec (as passed to
 * #addCommand()).
 */
function Command(commandSpec) {
  Object.keys(commandSpec).forEach(function(key) {
    this[key] = commandSpec[key];
  }, this);

  if (!this.name) {
    throw new Error('All registered commands must have a name');
  }

  if (this.params == null) {
    this.params = [];
  }
  if (!Array.isArray(this.params)) {
    throw new Error('command.params must be an array in ' + this.name);
  }

  this.hasNamedParameters = false;
  this.description = 'description' in this ? this.description : undefined;
  this.description = lookup(this.description, 'canonDescNone');
  this.manual = 'manual' in this ? this.manual : undefined;
  this.manual = lookup(this.manual);

  // At this point this.params has nested param groups. We want to flatten it
  // out and replace the param object literals with Parameter objects
  var paramSpecs = this.params;
  this.params = [];

  // Track if the user is trying to mix default params and param groups.
  // All the non-grouped parameters must come before all the param groups
  // because non-grouped parameters can be assigned positionally, so their
  // index is important. We don't want 'holes' in the order caused by
  // parameter groups.
  var usingGroups = false;

  if (this.returnType == null) {
    this.returnType = 'string';
  }

  // In theory this could easily be made recursive, so param groups could
  // contain nested param groups. Current thinking is that the added
  // complexity for the UI probably isn't worth it, so this implementation
  // prevents nesting.
  paramSpecs.forEach(function(spec) {
    if (!spec.group) {
      if (usingGroups) {
        throw new Error('Parameters can\'t come after param groups.' +
                        ' Ignoring ' + this.name + '/' + spec.name);
      }
      else {
        var param = new Parameter(spec, this, null);
        this.params.push(param);

        if (!param.isPositionalAllowed) {
          this.hasNamedParameters = true;
        }
      }
    }
    else {
      spec.params.forEach(function(ispec) {
        var param = new Parameter(ispec, this, spec.group);
        this.params.push(param);

        if (!param.isPositionalAllowed) {
          this.hasNamedParameters = true;
        }
      }, this);

      usingGroups = true;
    }
  }, this);
}

canon.Command = Command;


/**
 * A wrapper for a paramSpec so we can sort out shortened versions names for
 * option switches
 */
function Parameter(paramSpec, command, groupName) {
  this.command = command || { name: 'unnamed' };
  this.paramSpec = paramSpec;
  this.name = this.paramSpec.name;
  this.type = this.paramSpec.type;
  this.groupName = groupName;
  this.defaultValue = this.paramSpec.defaultValue;

  if (!this.name) {
    throw new Error('In ' + this.command.name +
                    ': all params must have a name');
  }

  var typeSpec = this.type;
  this.type = types.getType(typeSpec);
  if (this.type == null) {
    console.error('Known types: ' + types.getTypeNames().join(', '));
    throw new Error('In ' + this.command.name + '/' + this.name +
                    ': can\'t find type for: ' + JSON.stringify(typeSpec));
  }

  // boolean parameters have an implicit defaultValue:false, which should
  // not be changed. See the docs.
  if (this.type instanceof BooleanType) {
    if (this.defaultValue !== undefined) {
      throw new Error('In ' + this.command.name + '/' + this.name +
                      ': boolean parameters can not have a defaultValue.' +
                      ' Ignoring');
    }
    this.defaultValue = false;
  }

  // Check the defaultValue for validity.
  // Both undefined and null get a pass on this test. undefined is used when
  // there is no defaultValue, and null is used when the parameter is
  // optional, neither are required to parse and stringify.
  if (this.defaultValue != null) {
    try {
      var defaultText = this.type.stringify(this.defaultValue);
      var defaultConversion = this.type.parseString(defaultText);
      if (defaultConversion.getStatus() !== Status.VALID) {
        throw new Error('In ' + this.command.name + '/' + this.name +
                        ': Error round tripping defaultValue. status = ' +
                        defaultConversion.getStatus());
      }
    }
    catch (ex) {
      throw new Error('In ' + this.command.name + '/' + this.name +
                      ': ' + ex);
    }
  }

  // Some types (boolean, array) have a non 'undefined' blank value. Give the
  // type a chance to override the default defaultValue of undefined
  if (this.defaultValue === undefined) {
    this.defaultValue = this.type.getBlank().value;
  }

  // All parameters that can only be set via a named parameter must have a
  // non-undefined default value
  if (!this.isPositionalAllowed && this.defaultValue === undefined) {
    throw new Error('In ' + this.command.name + '/' + this.name +
                    ': Missing defaultValue for optional parameter.');
  }
}

/**
 * Does the given name uniquely identify this param (among the other params
 * in this command)
 * @param name The name to check
 */
Parameter.prototype.isKnownAs = function(name) {
  if (name === '--' + this.name) {
    return true;
  }
  return false;
};

/**
 * Read the default value for this parameter either from the parameter itself
 * (if this function has been over-ridden) or from the type, or from calling
 * parseString on an empty string
 */
Parameter.prototype.getBlank = function() {
  if (this.type.getBlank) {
    return this.type.getBlank();
  }

  return this.type.parseString('');
};

/**
 * Resolve the manual for this parameter, by looking in the paramSpec
 * and doing a l10n lookup
 */
Object.defineProperty(Parameter.prototype, 'manual', {
  get: function() {
    return lookup(this.paramSpec.manual || undefined);
  },
  enumerable: true
});

/**
 * Resolve the description for this parameter, by looking in the paramSpec
 * and doing a l10n lookup
 */
Object.defineProperty(Parameter.prototype, 'description', {
  get: function() {
    return lookup(this.paramSpec.description || undefined, 'canonDescNone');
  },
  enumerable: true
});

/**
 * Is the user required to enter data for this parameter? (i.e. has
 * defaultValue been set to something other than undefined)
 */
Object.defineProperty(Parameter.prototype, 'isDataRequired', {
  get: function() {
    return this.defaultValue === undefined;
  },
  enumerable: true
});

/**
 * Reflect the paramSpec 'hidden' property (dynamically so it can change)
 */
Object.defineProperty(Parameter.prototype, 'hidden', {
  get: function() {
    return this.paramSpec.hidden;
  },
  enumerable: true
});

/**
 * Are we allowed to assign data to this parameter using positional
 * parameters?
 */
Object.defineProperty(Parameter.prototype, 'isPositionalAllowed', {
  get: function() {
    return this.groupName == null;
  },
  enumerable: true
});

canon.Parameter = Parameter;


/**
 * A lookup hash of our registered commands
 */
var commands = {};

/**
 * A sorted list of command names, we regularly want them in order, so pre-sort
 */
var commandNames = [];

/**
 * A lookup of the original commandSpecs by command name
 */
var commandSpecs = {};

/**
 * Add a command to the canon of known commands.
 * This function is exposed to the outside world (via gcli/index). It is
 * documented in docs/index.md for all the world to see.
 * @param commandSpec The command and its metadata.
 * @return The new command
 */
canon.addCommand = function addCommand(commandSpec) {
  if (commands[commandSpec.name] != null) {
    // Roughly canon.removeCommand() without the event call, which we do later
    delete commands[commandSpec.name];
    commandNames = commandNames.filter(function(test) {
      return test !== commandSpec.name;
    });
  }

  var command = new Command(commandSpec);
  commands[commandSpec.name] = command;
  commandNames.push(commandSpec.name);
  commandNames.sort();

  commandSpecs[commandSpec.name] = commandSpec;

  canon.onCanonChange();
  return command;
};

/**
 * Remove an individual command. The opposite of #addCommand().
 * Removing a non-existent command is a no-op.
 * @param commandOrName Either a command name or the command itself.
 * @return true if a command was removed, false otherwise.
 */
canon.removeCommand = function removeCommand(commandOrName) {
  var name = typeof commandOrName === 'string' ?
          commandOrName :
          commandOrName.name;

  if (!commands[name]) {
    return false;
  }

  // See start of canon.addCommand if changing this code
  delete commands[name];
  delete commandSpecs[name];
  commandNames = commandNames.filter(function(test) {
    return test !== name;
  });

  canon.onCanonChange();
  return true;
};

/**
 * Retrieve a command by name
 * @param name The name of the command to retrieve
 */
canon.getCommand = function getCommand(name) {
  // '|| undefined' is to silence 'reference to undefined property' warnings
  return commands[name] || undefined;
};

/**
 * Get an array of all the registered commands.
 */
canon.getCommands = function getCommands() {
  // return Object.values(commands);
  return Object.keys(commands).map(function(name) {
    return commands[name];
  }, this);
};

/**
 * Get an array containing the names of the registered commands.
 */
canon.getCommandNames = function getCommandNames() {
  return commandNames.slice(0);
};

/**
 * Get access to the stored commandMetaDatas (i.e. before they were made into
 * instances of Command/Parameters) so we can remote them.
 */
canon.getCommandSpecs = function getCommandSpecs() {
  return commandSpecs;
};

/**
 * Enable people to be notified of changes to the list of commands
 */
canon.onCanonChange = util.createEvent('canon.onCanonChange');

/**
 * CommandOutputManager stores the output objects generated by executed
 * commands.
 *
 * CommandOutputManager is exposed (via canon.commandOutputManager) to the the
 * outside world and could (but shouldn't) be used before gcli.startup() has
 * been called. This could should be defensive to that where possible, and we
 * should certainly document if the use of it or similar will fail if used too
 * soon.
 */
function CommandOutputManager() {
  this.onOutput = util.createEvent('CommandOutputManager.onOutput');
}

canon.CommandOutputManager = CommandOutputManager;

/**
 * We maintain a global command output manager for the majority case where
 * there is only one important set of outputs.
 */
canon.commandOutputManager = new CommandOutputManager();


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/util', ['require', 'exports', 'module' ], function(require, exports, module) {

/*
 * A number of DOM manipulation and event handling utilities.
 */


//------------------------------------------------------------------------------

var eventDebug = false;

/**
 * Useful way to create a name for a handler, used in createEvent()
 */
function nameFunction(handler) {
  var scope = handler.scope ? handler.scope.constructor.name + '.' : '';
  var name = handler.func.name;
  if (name) {
    return scope + name;
  }
  for (var prop in handler.scope) {
    if (handler.scope[prop] === handler.func) {
      return scope + prop;
    }
  }
  return scope + handler.func;
}

/**
 * Create an event.
 * For use as follows:
 *
 *   function Hat() {
 *     this.putOn = createEvent('Hat.putOn');
 *     ...
 *   }
 *   Hat.prototype.adorn = function(person) {
 *     this.putOn({ hat: hat, person: person });
 *     ...
 *   }
 *
 *   var hat = new Hat();
 *   hat.putOn.add(function(ev) {
 *     console.log('The hat ', ev.hat, ' has is worn by ', ev.person);
 *   }, scope);
 *
 * @param name Optional name to help with debugging
 */
exports.createEvent = function(name) {
  var handlers = [];
  var holdFire = false;
  var heldEvents = [];
  var eventCombiner = undefined;

  /**
   * This is how the event is triggered.
   * @param ev The event object to be passed to the event listeners
   */
  var event = function(ev) {
    if (holdFire) {
      heldEvents.push(ev);
      if (eventDebug) {
        console.log('Held fire: ' + name, ev);
      }
      return;
    }

    if (eventDebug) {
      console.group('Fire: ' + name + ' to ' + handlers.length + ' listeners', ev);
    }

    // Use for rather than forEach because it step debugs better, which is
    // important for debugging events
    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i];
      if (eventDebug) {
        console.log(nameFunction(handler));
      }
      handler.func.call(handler.scope, ev);
    }

    if (eventDebug) {
      console.groupEnd();
    }
  };

  /**
   * Add a new handler function
   * @param func The function to call when this event is triggered
   * @param scope Optional 'this' object for the function call
   */
  event.add = function(func, scope) {
    handlers.push({ func: func, scope: scope });
  };

  /**
   * Remove a handler function added through add(). Both func and scope must
   * be strict equals (===) the values used in the call to add()
   * @param func The function to call when this event is triggered
   * @param scope Optional 'this' object for the function call
   */
  event.remove = function(func, scope) {
    var found = false;
    handlers = handlers.filter(function(test) {
      var noMatch = (test.func !== func && test.scope !== scope);
      if (!noMatch) {
        found = true;
      }
      return noMatch;
    });
    if (!found) {
      console.warn('Failed to remove handler from ' + name);
    }
  };

  /**
   * Remove all handlers.
   * Reset the state of this event back to it's post create state
   */
  event.removeAll = function() {
    handlers = [];
  };

  /**
   * Temporarily prevent this event from firing.
   * @see resumeFire(ev)
   */
  event.holdFire = function() {
    if (eventDebug) {
      console.group('Holding fire: ' + name);
    }

    holdFire = true;
  };

  /**
   * Resume firing events.
   * If there are heldEvents, then we fire one event to cover them all. If an
   * event combining function has been provided then we use that to combine the
   * events. Otherwise the last held event is used.
   * @see holdFire()
   */
  event.resumeFire = function() {
    if (eventDebug) {
      console.groupEnd('Resume fire: ' + name);
    }

    if (holdFire !== true) {
      throw new Error('Event not held: ' + name);
    }

    holdFire = false;
    if (heldEvents.length === 0) {
      return;
    }

    if (heldEvents.length === 1) {
      event(heldEvents[0]);
    }
    else {
      var first = heldEvents[0];
      var last = heldEvents[heldEvents.length - 1];
      if (eventCombiner) {
        event(eventCombiner(first, last, heldEvents));
      }
      else {
        event(last);
      }
    }

    heldEvents = [];
  };

  /**
   * When resumeFire has a number of events to combine, by default it just
   * picks the last, however you can provide an eventCombiner which returns a
   * combined event.
   * eventCombiners will be passed 3 parameters:
   * - first The first event to be held
   * - last The last event to be held
   * - all An array containing all the held events
   * The return value from an eventCombiner is expected to be an event object
   */
  Object.defineProperty(event, 'eventCombiner', {
    set: function(newEventCombiner) {
      if (typeof newEventCombiner !== 'function') {
        throw new Error('eventCombiner is not a function');
      }
      eventCombiner = newEventCombiner;
    },

    enumerable: true
  });

  return event;
};


//------------------------------------------------------------------------------

/**
 * XHTML namespace
 */
exports.NS_XHTML = 'http://www.w3.org/1999/xhtml';

/**
 * XUL namespace
 */
exports.NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';

/**
 * Create an HTML or XHTML element depending on whether the document is HTML
 * or XML based. Where HTML/XHTML elements are distinguished by whether they
 * are created using doc.createElementNS('http://www.w3.org/1999/xhtml', tag)
 * or doc.createElement(tag)
 * If you want to create a XUL element then you don't have a problem knowing
 * what namespace you want.
 * @param doc The document in which to create the element
 * @param tag The name of the tag to create
 * @returns The created element
 */
exports.createElement = function(doc, tag) {
  if (exports.isXmlDocument(doc)) {
    return doc.createElementNS(exports.NS_XHTML, tag);
  }
  else {
    return doc.createElement(tag);
  }
};

/**
 * Remove all the child nodes from this node
 * @param elem The element that should have it's children removed
 */
exports.clearElement = function(elem) {
  while (elem.hasChildNodes()) {
    elem.removeChild(elem.firstChild);
  }
};

var isAllWhitespace = /^\s*$/;

/**
 * Iterate over the children of a node looking for TextNodes that have only
 * whitespace content and remove them.
 * This utility is helpful when you have a template which contains whitespace
 * so it looks nice, but where the whitespace interferes with the rendering of
 * the page
 * @param elem The element which should have blank whitespace trimmed
 * @param deep Should this node removal include child elements
 */
exports.removeWhitespace = function(elem, deep) {
  var i = 0;
  while (i < elem.childNodes.length) {
    var child = elem.childNodes.item(i);
    if (child.nodeType === 3 /*Node.TEXT_NODE*/ &&
        isAllWhitespace.test(child.textContent)) {
      elem.removeChild(child);
    }
    else {
      if (deep && child.nodeType === 1 /*Node.ELEMENT_NODE*/) {
        exports.removeWhitespace(child, deep);
      }
      i++;
    }
  }
};

/**
 * Create a style element in the document head, and add the given CSS text to
 * it.
 * @param cssText The CSS declarations to append
 * @param doc The document element to work from
 * @param id Optional id to assign to the created style tag. If the id already
 * exists on the document, we do not add the CSS again.
 */
exports.importCss = function(cssText, doc, id) {
  if (!cssText) {
    return undefined;
  }

  doc = doc || document;

  if (!id) {
    id = 'hash-' + hash(cssText);
  }

  var found = doc.getElementById(id);
  if (found) {
    if (found.tagName.toLowerCase() !== 'style') {
      console.error('Warning: importCss passed id=' + id +
              ', but that pre-exists (and isn\'t a style tag)');
    }
    return found;
  }

  var style = exports.createElement(doc, 'style');
  style.id = id;
  style.appendChild(doc.createTextNode(cssText));

  var head = doc.getElementsByTagName('head')[0] || doc.documentElement;
  head.appendChild(style);

  return style;
};

/**
 * Simple hash function which happens to match Java's |String.hashCode()|
 * Done like this because I we don't need crypto-security, but do need speed,
 * and I don't want to spend a long time working on it.
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
function hash(str) {
  var hash = 0;
  if (str.length == 0) {
    return hash;
  }
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * There are problems with innerHTML on XML documents, so we need to do a dance
 * using document.createRange().createContextualFragment() when in XML mode
 */
exports.setContents = function(elem, contents) {
  if (typeof HTMLElement !== 'undefined' && contents instanceof HTMLElement) {
    exports.clearElement(elem);
    elem.appendChild(contents);
    return;
  }

  if (exports.isXmlDocument(elem.ownerDocument)) {
    try {
      var ns = elem.ownerDocument.documentElement.namespaceURI;
      if (!ns) {
        ns = exports.NS_XHTML;
      }
      exports.clearElement(elem);
      contents = '<div xmlns="' + ns + '">' + contents + '</div>';
      var range = elem.ownerDocument.createRange();
      var child = range.createContextualFragment(contents).firstChild;
      while (child.hasChildNodes()) {
        elem.appendChild(child.firstChild);
      }
    }
    catch (ex) {
      console.error('Bad XHTML', ex);
      console.trace();
      throw ex;
    }
  }
  else {
    elem.innerHTML = contents;
  }
};

/**
 * Load some HTML into the given document and return a DOM element.
 * This utility assumes that the html has a single root (other than whitespace)
 */
exports.toDom = function(document, html) {
  var div = exports.createElement(document, 'div');
  exports.setContents(div, html);
  return div.children[0];
};

/**
 * How to detect if we're in an XML document.
 * In a Mozilla we check that document.xmlVersion = null, however in Chrome
 * we use document.contentType = undefined.
 * @param doc The document element to work from (defaulted to the global
 * 'document' if missing
 */
exports.isXmlDocument = function(doc) {
  doc = doc || document;
  // Best test for Firefox
  if (doc.contentType && doc.contentType != 'text/html') {
    return true;
  }
  // Best test for Chrome
  if (doc.xmlVersion != null) {
    return true;
  }
  return false;
};

/**
 * Find the position of [element] in [nodeList].
 * @returns an index of the match, or -1 if there is no match
 */
function positionInNodeList(element, nodeList) {
  for (var i = 0; i < nodeList.length; i++) {
    if (element === nodeList[i]) {
      return i;
    }
  }
  return -1;
}

/**
 * Find a unique CSS selector for a given element
 * @returns a string such that ele.ownerDocument.querySelector(reply) === ele
 * and ele.ownerDocument.querySelectorAll(reply).length === 1
 */
exports.findCssSelector = function(ele) {
  var document = ele.ownerDocument;
  if (ele.id && document.getElementById(ele.id) === ele) {
    return '#' + ele.id;
  }

  // Inherently unique by tag name
  var tagName = ele.tagName.toLowerCase();
  if (tagName === 'html') {
    return 'html';
  }
  if (tagName === 'head') {
    return 'head';
  }
  if (tagName === 'body') {
    return 'body';
  }

  if (ele.parentNode == null) {
    console.log('danger: ' + tagName);
  }

  // We might be able to find a unique class name
  var selector, index, matches;
  if (ele.classList.length > 0) {
    for (var i = 0; i < ele.classList.length; i++) {
      // Is this className unique by itself?
      selector = '.' + ele.classList.item(i);
      matches = document.querySelectorAll(selector);
      if (matches.length === 1) {
        return selector;
      }
      // Maybe it's unique with a tag name?
      selector = tagName + selector;
      matches = document.querySelectorAll(selector);
      if (matches.length === 1) {
        return selector;
      }
      // Maybe it's unique using a tag name and nth-child
      index = positionInNodeList(ele, ele.parentNode.children) + 1;
      selector = selector + ':nth-child(' + index + ')';
      matches = document.querySelectorAll(selector);
      if (matches.length === 1) {
        return selector;
      }
    }
  }

  // So we can be unique w.r.t. our parent, and use recursion
  index = positionInNodeList(ele, ele.parentNode.children) + 1;
  selector = exports.findCssSelector(ele.parentNode) + ' > ' +
          tagName + ':nth-child(' + index + ')';

  return selector;
};

/**
 * Work out the path for images.
 */
exports.createUrlLookup = function(callingModule) {
  return function imageUrl(path) {
    try {
      return require('text!gcli/ui/' + path);
    }
    catch (ex) {
      // Under node/unamd callingModule is provided by node. This code isn't
      // the right answer but it's enough to pass all the unit tests and get
      // test coverage information, which is all we actually care about here.
      if (callingModule.filename) {
        return callingModule.filename + path;
      }

      var filename = callingModule.id.split('/').pop() + '.js';

      if (callingModule.uri.substr(-filename.length) !== filename) {
        console.error('Can\'t work out path from module.uri/module.id');
        return path;
      }

      if (callingModule.uri) {
        var end = callingModule.uri.length - filename.length - 1;
        return callingModule.uri.substr(0, end) + '/' + path;
      }

      return filename + '/' + path;
    }
  };
};

/**
 * Helper to find the 'data-command' attribute and call some action on it.
 * @see |updateCommand()| and |executeCommand()|
 */
function withCommand(element, action) {
  var command = element.getAttribute('data-command');
  if (!command) {
    command = element.querySelector('*[data-command]')
            .getAttribute('data-command');
  }

  if (command) {
    action(command);
  }
  else {
    console.warn('Missing data-command for ' + util.findCssSelector(element));
  }
}

/**
 * Update the requisition to contain the text of the clicked element
 * @param element The clicked element, containing either a data-command
 * attribute directly or in a nested element, from which we get the command
 * to be executed.
 * @param context Either a Requisition or an ExecutionContext or another object
 * that contains an |update()| function that follows a similar contract.
 */
exports.updateCommand = function(element, context) {
  withCommand(element, function(command) {
    context.update(command);
  });
};

/**
 * Execute the text contained in the element that was clicked
 * @param element The clicked element, containing either a data-command
 * attribute directly or in a nested element, from which we get the command
 * to be executed.
 * @param context Either a Requisition or an ExecutionContext or another object
 * that contains an |update()| function that follows a similar contract.
 */
exports.executeCommand = function(element, context) {
  withCommand(element, function(command) {
    context.exec({
      visible: true,
      typed: command
    });
  });
};


//------------------------------------------------------------------------------

/**
 * Keyboard handling is a mess. http://unixpapa.com/js/key.html
 * It would be good to use DOM L3 Keyboard events,
 * http://www.w3.org/TR/2010/WD-DOM-Level-3-Events-20100907/#events-keyboardevents
 * however only Webkit supports them, and there isn't a shim on Monernizr:
 * https://github.com/Modernizr/Modernizr/wiki/HTML5-Cross-browser-Polyfills
 * and when the code that uses this KeyEvent was written, nothing was clear,
 * so instead, we're using this unmodern shim:
 * http://stackoverflow.com/questions/5681146/chrome-10-keyevent-or-something-similar-to-firefoxs-keyevent
 * See BUG 664991: GCLI's keyboard handling should be updated to use DOM-L3
 * https://bugzilla.mozilla.org/show_bug.cgi?id=664991
 */
if (typeof 'KeyEvent' === 'undefined') {
  exports.KeyEvent = this.KeyEvent;
}
else {
  exports.KeyEvent = {
    DOM_VK_CANCEL: 3,
    DOM_VK_HELP: 6,
    DOM_VK_BACK_SPACE: 8,
    DOM_VK_TAB: 9,
    DOM_VK_CLEAR: 12,
    DOM_VK_RETURN: 13,
    DOM_VK_ENTER: 14,
    DOM_VK_SHIFT: 16,
    DOM_VK_CONTROL: 17,
    DOM_VK_ALT: 18,
    DOM_VK_PAUSE: 19,
    DOM_VK_CAPS_LOCK: 20,
    DOM_VK_ESCAPE: 27,
    DOM_VK_SPACE: 32,
    DOM_VK_PAGE_UP: 33,
    DOM_VK_PAGE_DOWN: 34,
    DOM_VK_END: 35,
    DOM_VK_HOME: 36,
    DOM_VK_LEFT: 37,
    DOM_VK_UP: 38,
    DOM_VK_RIGHT: 39,
    DOM_VK_DOWN: 40,
    DOM_VK_PRINTSCREEN: 44,
    DOM_VK_INSERT: 45,
    DOM_VK_DELETE: 46,
    DOM_VK_0: 48,
    DOM_VK_1: 49,
    DOM_VK_2: 50,
    DOM_VK_3: 51,
    DOM_VK_4: 52,
    DOM_VK_5: 53,
    DOM_VK_6: 54,
    DOM_VK_7: 55,
    DOM_VK_8: 56,
    DOM_VK_9: 57,
    DOM_VK_SEMICOLON: 59,
    DOM_VK_EQUALS: 61,
    DOM_VK_A: 65,
    DOM_VK_B: 66,
    DOM_VK_C: 67,
    DOM_VK_D: 68,
    DOM_VK_E: 69,
    DOM_VK_F: 70,
    DOM_VK_G: 71,
    DOM_VK_H: 72,
    DOM_VK_I: 73,
    DOM_VK_J: 74,
    DOM_VK_K: 75,
    DOM_VK_L: 76,
    DOM_VK_M: 77,
    DOM_VK_N: 78,
    DOM_VK_O: 79,
    DOM_VK_P: 80,
    DOM_VK_Q: 81,
    DOM_VK_R: 82,
    DOM_VK_S: 83,
    DOM_VK_T: 84,
    DOM_VK_U: 85,
    DOM_VK_V: 86,
    DOM_VK_W: 87,
    DOM_VK_X: 88,
    DOM_VK_Y: 89,
    DOM_VK_Z: 90,
    DOM_VK_CONTEXT_MENU: 93,
    DOM_VK_NUMPAD0: 96,
    DOM_VK_NUMPAD1: 97,
    DOM_VK_NUMPAD2: 98,
    DOM_VK_NUMPAD3: 99,
    DOM_VK_NUMPAD4: 100,
    DOM_VK_NUMPAD5: 101,
    DOM_VK_NUMPAD6: 102,
    DOM_VK_NUMPAD7: 103,
    DOM_VK_NUMPAD8: 104,
    DOM_VK_NUMPAD9: 105,
    DOM_VK_MULTIPLY: 106,
    DOM_VK_ADD: 107,
    DOM_VK_SEPARATOR: 108,
    DOM_VK_SUBTRACT: 109,
    DOM_VK_DECIMAL: 110,
    DOM_VK_DIVIDE: 111,
    DOM_VK_F1: 112,
    DOM_VK_F2: 113,
    DOM_VK_F3: 114,
    DOM_VK_F4: 115,
    DOM_VK_F5: 116,
    DOM_VK_F6: 117,
    DOM_VK_F7: 118,
    DOM_VK_F8: 119,
    DOM_VK_F9: 120,
    DOM_VK_F10: 121,
    DOM_VK_F11: 122,
    DOM_VK_F12: 123,
    DOM_VK_F13: 124,
    DOM_VK_F14: 125,
    DOM_VK_F15: 126,
    DOM_VK_F16: 127,
    DOM_VK_F17: 128,
    DOM_VK_F18: 129,
    DOM_VK_F19: 130,
    DOM_VK_F20: 131,
    DOM_VK_F21: 132,
    DOM_VK_F22: 133,
    DOM_VK_F23: 134,
    DOM_VK_F24: 135,
    DOM_VK_NUM_LOCK: 144,
    DOM_VK_SCROLL_LOCK: 145,
    DOM_VK_COMMA: 188,
    DOM_VK_PERIOD: 190,
    DOM_VK_SLASH: 191,
    DOM_VK_BACK_QUOTE: 192,
    DOM_VK_OPEN_BRACKET: 219,
    DOM_VK_BACK_SLASH: 220,
    DOM_VK_CLOSE_BRACKET: 221,
    DOM_VK_QUOTE: 222,
    DOM_VK_META: 224
  };
}


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/l10n', ['require', 'exports', 'module' , 'gcli/nls/strings'], function(require, exports, module) {

var strings = {};

/**
 * Add a CommonJS module to the list of places in which we look for
 * localizations. Before calling this function, it's important to make a call
 * to require(modulePath) to ensure that the dependency system (either require
 * or dryice) knows to make the module ready.
 * @param modulePath A CommonJS module (as used in calls to require). Don't
 * add the 'i18n!' prefix used by requirejs.
 * @see unregisterStringsSource()
 */
exports.registerStringsSource = function(modulePath) {
  //  Bug 683844: Should be require('i18n!' + module);
  var additions = require(modulePath).root;
  Object.keys(additions).forEach(function(key) {
    if (strings[key]) {
      console.error('Key \'' + key + '\' (loaded from ' + modulePath + ') ' +
          'already exists. Ignoring.');
      return;
    }
    strings[key] = additions[key];
  }, this);
};

/**
 * The main GCLI strings source is always required.
 * We have to load it early on in the process (in the require phase) so that
 * we can define settingSpecs and commandSpecs at the top level too.
 */
require('gcli/nls/strings');
exports.registerStringsSource('gcli/nls/strings');

/**
 * Undo the effects of registerStringsSource().
 * @param modulePath A CommonJS module (as used in calls to require).
 * @see registerStringsSource()
 */
exports.unregisterStringsSource = function(modulePath) {
  //  Bug 683844: Should be require('i18n!' + module);
  var additions = require(modulePath).root;
  Object.keys(additions).forEach(function(key) {
    delete strings[key];
  }, this);
};

/**
 * Finds the preferred locales of the user as an array of RFC 4646 strings
 * (e.g. 'pt-br').
 * . There is considerable confusion as to the correct value
 * since there are a number of places the information can be stored:
 * - In the OS (IE:navigator.userLanguage, IE:navigator.systemLanguage)
 * - In the browser (navigator.language, IE:navigator.browserLanguage)
 * - By GEO-IP
 * - By website specific settings
 * This implementation uses navigator.language || navigator.userLanguage as
 * this is compatible with requirejs.
 * See http://tools.ietf.org/html/rfc4646
 * See http://stackoverflow.com/questions/1043339/javascript-for-detecting-browser-language-preference
 * See http://msdn.microsoft.com/en-us/library/ms534713.aspx
 * @return The current locale as an RFC 4646 string
 */
exports.getPreferredLocales = function() {
  var language = typeof navigator !== 'undefined' ?
      (navigator.language || navigator.userLanguage).toLowerCase() :
      'en-us';
  var parts = language.split('-');
  var reply = parts.map(function(part, index) {
    return parts.slice(0, parts.length - index).join('-');
  });
  reply.push('root');
  return reply;
};

/**
 * Lookup a key in our strings file using localized versions if possible,
 * throwing an error if that string does not exist.
 * @param key The string to lookup
 * This should generally be in the general form 'filenameExportIssue' where
 * filename is the name of the module (all lowercase without underscores) and
 * export is the name of a top level thing in which the message is used and
 * issue is a short string indicating the issue.
 * The point of a 'standard' like this is to keep strings fairly short whilst
 * still allowing users to have an idea where they come from, and preventing
 * name clashes.
 * @return The string resolved from the correct locale
 */
exports.lookup = function(key) {
  var str = strings[key];
  if (str == null) {
    throw new Error('No i18n key: ' + key);
  }
  return str;
};

/**
 * An alternative to lookup().
 * <tt>l10n.lookup('x') === l10n.propertyLookup.x</tt>
 * We should go easy on this method until we are sure that we don't have too
 * many 'old-browser' problems. However this works particularly well with the
 * templater because you can pass this in to a template that does not do
 * <tt>{ allowEval: true }</tt>
 */
if (typeof Proxy !== 'undefined') {
  exports.propertyLookup = Proxy.create({
    get: function(rcvr, name) {
      return exports.lookup(name);
    }
  });
}
else {
  exports.propertyLookup = strings;
}

/**
 * Helper function to process swaps.
 * For example:
 *   swap('the {subject} {verb} {preposition} the {object}', {
 *     subject: 'cat', verb: 'sat', preposition: 'on', object: 'mat'
 *   });
 * Returns 'the cat sat on the mat'.
 * @param str The string containing parts delimited by { and } to be replaced
 * @param swaps Lookup map containing the replacement strings
 */
function swap(str, swaps) {
  return str.replace(/\{[^}]*\}/g, function(name) {
    name = name.slice(1, -1);
    if (swaps == null) {
      console.log('Missing swaps while looking up \'' + name + '\'');
      return '';
    }
    var replacement = swaps[name];
    if (replacement == null) {
      console.log('Can\'t find \'' + name + '\' in ' + JSON.stringify(swaps));
      replacement = '';
    }
    return replacement;
  });
}

/**
 * Lookup a key in our strings file using localized versions if possible,
 * and perform string interpolation to inject runtime values into the string.
 * l10n lookup is required for user visible strings, but not required for
 * console messages and throw strings.
 * lookupSwap() is virtually identical in function to lookupFormat(), except
 * that lookupSwap() is easier to use, however lookupFormat() is required if
 * your code is to work with Mozilla's i10n system.
 * @param key The string to lookup
 * This should generally be in the general form 'filename_export_issue' where
 * filename is the name of the module (all lowercase without underscores) and
 * export is the name of a top level thing in which the message is used and
 * issue is a short string indicating the issue.
 * The point of a 'standard' like this is to keep strings fairly short whilst
 * still allowing users to have an idea where they come from, and preventing
 * name clashes.
 * The value looked up may contain {variables} to be exchanged using swaps
 * @param swaps A map of variable values to be swapped.
 * @return A looked-up and interpolated message for display to the user.
 * @see lookupFormat()
 */
exports.lookupSwap = function(key, swaps) {
  var str = exports.lookup(key);
  return swap(str, swaps);
};

/**
 * Perform the string swapping required by format().
 * @see format() for details of the swaps performed.
 */
function format(str, swaps) {
  // First replace the %S strings
  var index = 0;
  str = str.replace(/%S/g, function() {
    return swaps[index++];
  });
  // Then %n$S style strings
  str = str.replace(/%([0-9])\$S/g, function(match, idx) {
    return swaps[idx - 1];
  });
  return str;
}

/**
 * Lookup a key in our strings file using localized versions if possible,
 * and perform string interpolation to inject runtime values into the string.
 * l10n lookup is required for user visible strings, but not required for
 * console messages and throw strings.
 * lookupFormat() is virtually identical in function to lookupSwap(), except
 * that lookupFormat() works with strings held in the mozilla repo in addition
 * to files held outside.
 * @param key Looks up the format string for the given key in the string bundle
 * and returns a formatted copy where each occurrence of %S (uppercase) is
 * replaced by each successive element in the supplied array.
 * Alternatively, numbered indices of the format %n$S (e.g. %1$S, %2$S, etc.)
 * can be used to specify the position of the corresponding parameter
 * explicitly.
 * The mozilla version performs more advances formatting than these simple
 * cases, however these cases are not supported so far, mostly because they are
 * not well documented.
 * @param swaps An array of strings to be swapped.
 * @return A looked-up and interpolated message for display to the user.
 * @see https://developer.mozilla.org/en/XUL/Method/getFormattedString
 */
exports.lookupFormat = function(key, swaps) {
  var str = exports.lookup(key);
  return format(str, swaps);
};

/**
 * Lookup the correct pluralization of a word/string.
 * The first ``key`` and ``swaps`` parameters of lookupPlural() are the same
 * as for lookupSwap(), however there is an extra ``ord`` parameter which indicates
 * the plural ordinal to use.
 * For example, in looking up the string '39 steps', the ordinal would be 39.
 *
 * More detailed example:
 * French has 2 plural forms: the first for 0 and 1, the second for everything
 * else. English also has 2, but the first only covers 1. Zero is lumped into
 * the 'everything else' category. Vietnamese has only 1 plural form - so it
 * uses the same noun form however many of them there are.
 * The following localization strings describe how to pluralize the phrase
 * '1 minute':
 *   'en-us': { demo_plural_time: [ '{ord} minute', '{ord} minutes' ] },
 *   'fr-fr': { demo_plural_time: [ '{ord} minute', '{ord} minutes' ] },
 *   'vi-vn': { demo_plural_time: [ '{ord} phut' ] },
 *
 *   l10n.lookupPlural('demo_plural_time', 0); // '0 minutes' in 'en-us'
 *   l10n.lookupPlural('demo_plural_time', 1); // '1 minute' in 'en-us'
 *   l10n.lookupPlural('demo_plural_time', 9); // '9 minutes' in 'en-us'
 *
 *   l10n.lookupPlural('demo_plural_time', 0); // '0 minute' in 'fr-fr'
 *   l10n.lookupPlural('demo_plural_time', 1); // '1 minute' in 'fr-fr'
 *   l10n.lookupPlural('demo_plural_time', 9); // '9 minutes' in 'fr-fr'
 *
 *   l10n.lookupPlural('demo_plural_time', 0); // '0 phut' in 'vi-vn'
 *   l10n.lookupPlural('demo_plural_time', 1); // '1 phut' in 'vi-vn'
 *   l10n.lookupPlural('demo_plural_time', 9); // '9 phut' in 'vi-vn'
 *
 * The
 * Note that the localization strings are (correctly) the same (since both
 * the English and the French words have the same etymology)
 * @param key The string to lookup in gcli/nls/strings.js
 * @param ord The number to use in plural lookup
 * @param swaps A map of variable values to be swapped.
 */
exports.lookupPlural = function(key, ord, swaps) {
  var index = getPluralRule().get(ord);
  var words = exports.lookup(key);
  var str = words[index];

  swaps = swaps || {};
  swaps.ord = ord;

  return swap(str, swaps);
};

/**
 * Find the correct plural rule for the current locale
 * @return a plural rule with a 'get()' function
 */
function getPluralRule() {
  if (!pluralRule) {
    var lang = navigator.language || navigator.userLanguage;
    // Convert lang to a rule index
    pluralRules.some(function(rule) {
      if (rule.locales.indexOf(lang) !== -1) {
        pluralRule = rule;
        return true;
      }
      return false;
    });

    // Use rule 0 by default, which is no plural forms at all
    if (!pluralRule) {
      console.error('Failed to find plural rule for ' + lang);
      pluralRule = pluralRules[0];
    }
  }

  return pluralRule;
}

/**
 * A plural form is a way to pluralize a noun. There are 2 simple plural forms
 * in English, with (s) and without - e.g. tree and trees. There are many other
 * ways to pluralize (e.g. witches, ladies, teeth, oxen, axes, data, alumini)
 * However they all follow the rule that 1 is 'singular' while everything
 * else is 'plural' (words without a plural form like sheep can be seen as
 * following this rule where the singular and plural forms are the same)
 * <p>Non-English languages have different pluralization rules, for example
 * French uses singular for 0 as well as 1. Japanese has no plurals while
 * Arabic and Russian are very complex.
 *
 * See https://developer.mozilla.org/en/Localization_and_Plurals
 * See https://secure.wikimedia.org/wikipedia/en/wiki/List_of_ISO_639-1_codes
 *
 * Contains code inspired by Mozilla L10n code originally developed by
 *     Edward Lee <edward.lee@engineering.uiuc.edu>
 */
var pluralRules = [
  /**
   * Index 0 - Only one form for all
   * Asian family: Japanese, Vietnamese, Korean
   */
  {
    locales: [
      'fa', 'fa-ir',
      'id',
      'ja', 'ja-jp-mac',
      'ka',
      'ko', 'ko-kr',
      'th', 'th-th',
      'tr', 'tr-tr',
      'zh', 'zh-tw', 'zh-cn'
    ],
    numForms: 1,
    get: function(n) {
      return 0;
    }
  },

  /**
   * Index 1 - Two forms, singular used for one only
   * Germanic family: English, German, Dutch, Swedish, Danish, Norwegian,
   *          Faroese
   * Romanic family: Spanish, Portuguese, Italian, Bulgarian
   * Latin/Greek family: Greek
   * Finno-Ugric family: Finnish, Estonian
   * Semitic family: Hebrew
   * Artificial: Esperanto
   * Finno-Ugric family: Hungarian
   * Turkic/Altaic family: Turkish
   */
  {
    locales: [
      'af', 'af-za',
      'as', 'ast',
      'bg',
      'br',
      'bs', 'bs-ba',
      'ca',
      'cy', 'cy-gb',
      'da',
      'de', 'de-de', 'de-ch',
      'en', 'en-gb', 'en-us', 'en-za',
      'el', 'el-gr',
      'eo',
      'es', 'es-es', 'es-ar', 'es-cl', 'es-mx',
      'et', 'et-ee',
      'eu',
      'fi', 'fi-fi',
      'fy', 'fy-nl',
      'gl', 'gl-gl',
      'he',
     //     'hi-in', Without an unqualified language, looks dodgy
      'hu', 'hu-hu',
      'hy', 'hy-am',
      'it', 'it-it',
      'kk',
      'ku',
      'lg',
      'mai',
     // 'mk', 'mk-mk', Should be 14?
      'ml', 'ml-in',
      'mn',
      'nb', 'nb-no',
      'no', 'no-no',
      'nl',
      'nn', 'nn-no',
      'no', 'no-no',
      'nb', 'nb-no',
      'nso', 'nso-za',
      'pa', 'pa-in',
      'pt', 'pt-pt',
      'rm', 'rm-ch',
     // 'ro', 'ro-ro', Should be 5?
      'si', 'si-lk',
     // 'sl',      Should be 10?
      'son', 'son-ml',
      'sq', 'sq-al',
      'sv', 'sv-se',
      'vi', 'vi-vn',
      'zu', 'zu-za'
    ],
    numForms: 2,
    get: function(n) {
      return n != 1 ?
        1 :
        0;
    }
  },

  /**
   * Index 2 - Two forms, singular used for zero and one
   * Romanic family: Brazilian Portuguese, French
   */
  {
    locales: [
      'ak', 'ak-gh',
      'bn', 'bn-in', 'bn-bd',
      'fr', 'fr-fr',
      'gu', 'gu-in',
      'kn', 'kn-in',
      'mr', 'mr-in',
      'oc', 'oc-oc',
      'or', 'or-in',
            'pt-br',
      'ta', 'ta-in', 'ta-lk',
      'te', 'te-in'
    ],
    numForms: 2,
    get: function(n) {
      return n > 1 ?
        1 :
        0;
    }
  },

  /**
   * Index 3 - Three forms, special case for zero
   * Latvian
   */
  {
    locales: [ 'lv' ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        1 :
        n != 0 ?
          2 :
          0;
    }
  },

  /**
   * Index 4 -
   * Scottish Gaelic
   */
  {
    locales: [ 'gd', 'gd-gb' ],
    numForms: 4,
    get: function(n) {
      return n == 1 || n == 11 ?
        0 :
        n == 2 || n == 12 ?
          1 :
          n > 0 && n < 20 ?
            2 :
            3;
    }
  },

  /**
   * Index 5 - Three forms, special case for numbers ending in 00 or [2-9][0-9]
   * Romanian
   */
  {
    locales: [ 'ro', 'ro-ro' ],
    numForms: 3,
    get: function(n) {
      return n == 1 ?
        0 :
        n == 0 || n % 100 > 0 && n % 100 < 20 ?
          1 :
          2;
    }
  },

  /**
   * Index 6 - Three forms, special case for numbers ending in 1[2-9]
   * Lithuanian
   */
  {
    locales: [ 'lt' ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        0 :
        n % 10 >= 2 && (n % 100 < 10 || n % 100 >= 20) ?
          2 :
          1;
    }
  },

  /**
   * Index 7 - Three forms, special cases for numbers ending in 1 and
   *       2, 3, 4, except those ending in 1[1-4]
   * Slavic family: Russian, Ukrainian, Serbian, Croatian
   */
  {
    locales: [
      'be', 'be-by',
      'hr', 'hr-hr',
      'ru', 'ru-ru',
      'sr', 'sr-rs', 'sr-cs',
      'uk'
    ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        0 :
        n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ?
          1 :
          2;
    }
  },

  /**
   * Index 8 - Three forms, special cases for 1 and 2, 3, 4
   * Slavic family: Czech, Slovak
   */
  {
    locales: [ 'cs', 'sk' ],
    numForms: 3,
    get: function(n) {
      return n == 1 ?
        0 :
        n >= 2 && n <= 4 ?
          1 :
          2;
    }
  },

  /**
   * Index 9 - Three forms, special case for one and some numbers ending in
   *       2, 3, or 4
   * Polish
   */
  {
    locales: [ 'pl' ],
    numForms: 3,
    get: function(n) {
      return n == 1 ?
        0 :
        n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ?
          1 :
          2;
    }
  },

  /**
   * Index 10 - Four forms, special case for one and all numbers ending in
   *      02, 03, or 04
   * Slovenian
   */
  {
    locales: [ 'sl' ],
    numForms: 4,
    get: function(n) {
      return n % 100 == 1 ?
        0 :
        n % 100 == 2 ?
          1 :
          n % 100 == 3 || n % 100 == 4 ?
            2 :
            3;
    }
  },

  /**
   * Index 11 -
   * Irish Gaeilge
   */
  {
    locales: [ 'ga-ie', 'ga-ie', 'ga', 'en-ie' ],
    numForms: 5,
    get: function(n) {
      return n == 1 ?
        0 :
        n == 2 ?
          1 :
          n >= 3 && n <= 6 ?
            2 :
            n >= 7 && n <= 10 ?
              3 :
              4;
    }
  },

  /**
   * Index 12 -
   * Arabic
   */
  {
    locales: [ 'ar' ],
    numForms: 6,
    get: function(n) {
      return n == 0 ?
        5 :
        n == 1 ?
          0 :
          n == 2 ?
            1 :
            n % 100 >= 3 && n % 100 <= 10 ?
              2 :
              n % 100 >= 11 && n % 100 <= 99 ?
                3 :
                4;
    }
  },

  /**
   * Index 13 -
   * Maltese
   */
  {
    locales: [ 'mt' ],
    numForms: 4,
    get: function(n) {
      return n == 1 ?
        0 :
        n == 0 || n % 100 > 0 && n % 100 <= 10 ?
          1 :
          n % 100 > 10 && n % 100 < 20 ?
            2 :
            3;
    }
  },

  /**
   * Index 14 -
   * Macedonian
   */
  {
    locales: [ 'mk', 'mk-mk' ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 ?
        0 :
        n % 10 == 2 ?
          1 :
          2;
    }
  },

  /**
   * Index 15 -
   * Icelandic
   */
  {
    locales: [ 'is' ],
    numForms: 2,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        0 :
        1;
    }
  }

  /*
  // Known locales without a known plural rule
  'km', 'ms', 'ne-np', 'ne-np', 'ne', 'nr', 'nr-za', 'rw', 'ss', 'ss-za',
  'st', 'st-za', 'tn', 'tn-za', 'ts', 'ts-za', 've', 've-za', 'xh', 'xh-za'
  */
];

/**
 * The cached plural rule
 */
var pluralRule;

});

define('gcli/nls/strings', ['require', 'exports', 'module' ], function(require, exports, module) {
/**
 * This file has detailed comments as to the usage of these strings so when
 * translators work on these strings separately from the code, (but with the
 * comments) they have something to work on.
 * Each string should be commented using single-line comments.
 */
var i18n = {
  root: {
    // Short string used to describe any command or command parameter when
    // no description has been provided.
    canonDescNone: '(No description)',

    // The special '{' command allows entry of JavaScript like traditional
    // developer tool command lines. This describes the '{' command.
    cliEvalJavascript: 'Enter JavaScript directly',

    // When the command line has more arguments than the current command can
    // understand this is the error message shown to the user.
    cliUnusedArg: 'Too many arguments',

    // The title of the dialog which displays the options that are available
    // to the current command.
    cliOptions: 'Available Options',

    // When a command has a parameter that has a number of pre-defined options
    // the user interface presents these in a drop-down menu, where the first
    // 'option' is an indicator that a selection should be made. This string
    // describes that first option.
    fieldSelectionSelect: 'Select a %S…',

    // When a command has a parameter that can be repeated a number of times
    // (e.g. like the 'cat a.txt b.txt' command) the user interface presents
    // buttons to add and remove arguments. This string is used to add
    // arguments.
    fieldArrayAdd: 'Add',

    // When a command has a parameter that can be repeated a number of times
    // (e.g. like the 'cat a.txt b.txt' command) the user interface presents
    // buttons to add and remove arguments. This string is used to remove
    // arguments.
    fieldArrayDel: 'Delete',

    // When the menu has displayed all the matches that it should (i.e. about
    // 10 items) then we display this to alert the user that more matches are
    // available.
    fieldMenuMore: 'More matches, keep typing',

    // The command line provides completion for JavaScript commands, however
    // there are times when the scope of what we're completing against can't
    // be used. This error message is displayed when this happens.
    jstypeParseScope: 'Scope lost',

    // When the command line is doing JavaScript completion, sometimes the
    // property to be completed does not exist. This error message is displayed
    // when this happens.
    jstypeParseMissing: 'Can\'t find property \'%S\'',

    // When the command line is doing JavaScript completion using invalid
    // JavaScript, this error message is displayed.
    jstypeBeginSyntax: 'Syntax error',

    // When the command line is doing JavaScript completion using a string
    // that is not properly terminated, this error message is displayed.
    jstypeBeginUnterm: 'Unterminated string literal',

    // If the system for providing JavaScript completions encounters and error
    // it displays this.
    jstypeParseError: 'Error',

    // When the command line is passed a number, however the input string is
    // not a valid number, this error message is displayed.
    typesNumberNan: 'Can\'t convert "%S" to a number.',

    // When the command line is passed a number, but the number is bigger than
    // the largest allowed number, this error message is displayed.
    typesNumberMax: '%1$S is greater than maximum allowed: %2$S.',

    // When the command line is passed a number, but the number is lower than
    // the smallest allowed number, this error message is displayed.
    typesNumberMin: '%1$S is smaller than minimum allowed: %2$S.',

    // When the command line is passed an option with a limited number of
    // correct values, but the passed value is not one of them, this error
    // message is displayed.
    typesSelectionNomatch: 'Can\'t use \'%S\'.',

    // When the command line is expecting a CSS query string, however the
    // passed string is not valid, this error message is displayed.
    nodeParseSyntax: 'Syntax error in CSS query',

    // When the command line is expecting a CSS string that matches a single
    // node, but more than one node matches, this error message is displayed.
    nodeParseMultiple: 'Too many matches (%S)',

    // When the command line is expecting a CSS string that matches a single
    // node, but no nodes match, this error message is displayed.
    nodeParseNone: 'No matches',

    // A very short description of the 'help' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See helpManual for a fuller description of what it does.
    helpDesc: 'Get help on the available commands',

    // A fuller description of the 'help' command.
    // Displayed when the user asks for help on what it does.
    helpManual: 'Provide help either on a specific command (if a search string is provided and an exact match is found) or on the available commands (if a search string is not provided, or if no exact match is found).',

    // A very short description of the 'search' parameter to the 'help' command.
    // See helpSearchManual2 for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    helpSearchDesc: 'Search string',

    // A fuller description of the 'search' parameter to the 'help' command.
    // Displayed when the user asks for help on what it does. Inline HTML
    // (e.g. <strong>) can be used to emphasize the core concept.
    helpSearchManual2: '<strong>search string</strong> to use in narrowing down the displayed commands. Regular expressions not supported.',

    // A heading shown at the top of a help page for a command in the console
    // It labels a summary of the parameters to the command
    helpManSynopsis: 'Synopsis',

    // A heading shown in a help page for a command in the console.
    // This heading precedes the top level description.
    helpManDescription: 'Description',

    // A heading shown above the parameters in a help page for a command in the
    // console.
    helpManParameters: 'Parameters',

    // Some text shown under the parameters heading in a help page for a
    // command which has no parameters.
    helpManNone: 'None',

    // The heading shown in response to the 'help' command when used without a
    // filter, just above the list of known commands.
    helpListAll: 'Available Commands:',

    // The heading shown in response to the 'help <search>' command (i.e. with
    // a search string), just above the list of matching commands.
    helpListPrefix: 'Commands starting with \'%1$S\':',

    // The heading shown in response to the 'help <search>' command (i.e. with
    // a search string), when there are no matching commands.
    helpListNone: 'No commands starting with \'%1$S\'',

    // When the 'help x' command wants to show the manual for the 'x' command
    // it needs to be able to describe the parameters as either required or
    // optional. See also 'helpManOptional'.
    helpManRequired: 'required',

    // See description of 'helpManRequired'
    helpManOptional: 'optional',

    // Text shown as part of the output of the 'help' command when the command
    // in question has sub-commands, before a list of the matching sub-commands
    subCommands: 'Sub-Commands',

    // Text shown as part of the output of the 'help' command when the command
    // in question should have sub-commands but in fact has none
    subCommandsNone: 'None',

    // A very short description of the 'pref' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See prefManual for a fuller description of what it does.
    prefDesc: 'Commands to control settings',

    // A fuller description of the 'pref' command.
    // Displayed when the user asks for help on what it does.
    prefManual: 'Commands to display and alter preferences both for GCLI and the surrounding environment',

    // A very short description of the 'pref list' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See prefListManual for a fuller description of what it does.
    prefListDesc: 'Display available settings',

    // A fuller description of the 'pref list' command.
    // Displayed when the user asks for help on what it does.
    prefListManual: 'Display a list of preferences, optionally filtered when using the \'search\' parameter',

    // A short description of the 'search' parameter to the 'pref list' command.
    // See prefListSearchManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    prefListSearchDesc: 'Filter the list of settings displayed',

    // A fuller description of the 'search' parameter to the 'pref list' command.
    // Displayed when the user asks for help on what it does.
    prefListSearchManual: 'Search for the given string in the list of available preferences',

    // A very short description of the 'pref show' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See prefShowManual for a fuller description of what it does.
    prefShowDesc: 'Display setting value',

    // A fuller description of the 'pref show' command.
    // Displayed when the user asks for help on what it does.
    prefShowManual: 'Display the value of a given preference',

    // A short description of the 'setting' parameter to the 'pref show' command.
    // See prefShowSettingManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    prefShowSettingDesc: 'Setting to display',

    // A fuller description of the 'setting' parameter to the 'pref show' command.
    // Displayed when the user asks for help on what it does.
    prefShowSettingManual: 'The name of the setting to display',

    // A very short description of the 'pref set' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See prefSetManual for a fuller description of what it does.
    prefSetDesc: 'Alter a setting',

    // A fuller description of the 'pref set' command.
    // Displayed when the user asks for help on what it does.
    prefSetManual: 'Alter preferences defined by the environment',

    // A short description of the 'setting' parameter to the 'pref set' command.
    // See prefSetSettingManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    prefSetSettingDesc: 'Setting to alter',

    // A fuller description of the 'setting' parameter to the 'pref set' command.
    // Displayed when the user asks for help on what it does.
    prefSetSettingManual: 'The name of the setting to alter.',

    // A short description of the 'value' parameter to the 'pref set' command.
    // See prefSetValueManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    prefSetValueDesc: 'New value for setting',

    // A fuller description of the 'value' parameter to the 'pref set' command.
    // Displayed when the user asks for help on what it does.
    prefSetValueManual: 'The new value for the specified setting',

    // Title displayed to the user the first time they try to alter a setting
    // This is displayed directly above prefSetCheckBody and prefSetCheckGo.
    prefSetCheckHeading: 'This might void your warranty!',

    // The main text of the warning displayed to the user the first time they
    // try to alter a setting. See also prefSetCheckHeading and prefSetCheckGo.
    prefSetCheckBody: 'Changing these advanced settings can be harmful to the stability, security, and performance of this application. You should only continue if you are sure of what you are doing.',

    // The text to enable preference editing. Displayed in a button directly
    // under prefSetCheckHeading and prefSetCheckBody
    prefSetCheckGo: 'I\'ll be careful, I promise!',

    // A very short description of the 'pref reset' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See prefResetManual for a fuller description of what it does.
    prefResetDesc: 'Reset a setting',

    // A fuller description of the 'pref reset' command.
    // Displayed when the user asks for help on what it does.
    prefResetManual: 'Reset the value of a setting to the system defaults',

    // A short description of the 'setting' parameter to the 'pref reset' command.
    // See prefResetSettingManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    prefResetSettingDesc: 'Setting to reset',

    // A fuller description of the 'setting' parameter to the 'pref reset' command.
    // Displayed when the user asks for help on what it does.
    prefResetSettingManual: 'The name of the setting to reset to the system default value',

    // Displayed in the output from the 'pref list' command as a label to an
    // input element that allows the user to filter the results
    prefOutputFilter: 'Filter',

    // Displayed in the output from the 'pref list' command as a heading to
    // a table. The column contains the names of the available preferences
    prefOutputName: 'Name',

    // Displayed in the output from the 'pref list' command as a heading to
    // a table. The column contains the values of the available preferences
    prefOutputValue: 'Value',

    // A very short description of the 'intro' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See introManual for a fuller description of what it does.
    introDesc: 'Show the opening message',

    // A fuller description of the 'intro' command.
    // Displayed when the user asks for help on what it does.
    introManual: 'Redisplay the message that is shown to new users until they click the \'Got it!\' button',

    // The 'intro text' opens when the user first opens the developer toolbar
    // to explain the command line, and is shown each time it is opened until
    // the user clicks the 'Got it!' button.
    // This string is the opening paragraph of the intro text.
    introTextOpening: 'The Firefox command line is designed for developers. It focuses on speed of input over JavaScript syntax and a rich display over monospace output.',

    // For information about the 'intro text' see introTextOpening.
    // The second paragraph is in 2 sections, the first section points the user
    // to the 'help' command.
    introTextCommands: 'For a list of commands type',

    // For information about the 'intro text' see introTextOpening.
    // The second section in the second paragraph points the user to the
    // F1/Escape keys which show and hide hints.
    introTextKeys: 'or to show/hide command hints press',

    // For information about the 'intro text' see introTextOpening.
    // This string is used with introTextKeys, and contains the keys that are
    // pressed to open and close hints.
    introTextF1Escape: 'F1/Escape',

    // For information about the 'intro text' see introTextOpening.
    // The text on the button that dismisses the intro text.
    introTextGo: 'Got it!',

    // Short description of the 'hideIntro' setting. Displayed when the user
    // asks for help on the settings.
    hideIntroDesc: 'Show the initial welcome message',

    // Short description of the 'eagerHelper' setting. Displayed when the user
    // asks for help on the settings.
    eagerHelperDesc: 'How eager are the tooltips',

    // Short description of the 'allowSetDesc' setting. Displayed when the user
    // asks for help on the settings.
    allowSetDesc: 'Has the user enabled the \'pref set\' command?'
  }
};
exports.root = i18n.root;
});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/types', ['require', 'exports', 'module' , 'gcli/argument'], function(require, exports, module) {


var Argument = require('gcli/argument').Argument;
var BlankArgument = require('gcli/argument').BlankArgument;


/**
 * Some types can detect validity, that is to say they can distinguish between
 * valid and invalid values.
 * We might want to change these constants to be numbers for better performance
 */
var Status = {
  /**
   * The conversion process worked without any problem, and the value is
   * valid. There are a number of failure states, so the best way to check
   * for failure is (x !== Status.VALID)
   */
  VALID: {
    toString: function() { return 'VALID'; },
    valueOf: function() { return 0; }
  },

  /**
   * A conversion process failed, however it was noted that the string
   * provided to 'parse()' could be VALID by the addition of more characters,
   * so the typing may not be actually incorrect yet, just unfinished.
   * @see Status.ERROR
   */
  INCOMPLETE: {
    toString: function() { return 'INCOMPLETE'; },
    valueOf: function() { return 1; }
  },

  /**
   * The conversion process did not work, the value should be null and a
   * reason for failure should have been provided. In addition some
   * completion values may be available.
   * @see Status.INCOMPLETE
   */
  ERROR: {
    toString: function() { return 'ERROR'; },
    valueOf: function() { return 2; }
  },

  /**
   * A combined status is the worser of the provided statuses. The statuses
   * can be provided either as a set of arguments or a single array
   */
  combine: function() {
    var combined = Status.VALID;
    for (var i = 0; i < arguments.length; i++) {
      var status = arguments[i];
      if (Array.isArray(status)) {
        status = Status.combine.apply(null, status);
      }
      if (status > combined) {
        combined = status;
      }
    }
    return combined;
  }
};

exports.Status = Status;


/**
 * The type.parse() method converts an Argument into a value, Conversion is
 * a wrapper to that value.
 * Conversion is needed to collect a number of properties related to that
 * conversion in one place, i.e. to handle errors and provide traceability.
 * @param value The result of the conversion
 * @param arg The data from which the conversion was made
 * @param status See the Status values [VALID|INCOMPLETE|ERROR] defined above.
 * The default status is Status.VALID.
 * @param message If status=ERROR, there should be a message to describe the
 * error. A message is not needed unless for other statuses, but could be
 * present for any status including VALID (in the case where we want to note a
 * warning, for example).
 * See BUG 664676: GCLI conversion error messages should be localized
 * @param predictions If status=INCOMPLETE, there could be predictions as to
 * the options available to complete the input.
 * We generally expect there to be about 7 predictions (to match human list
 * comprehension ability) however it is valid to provide up to about 20,
 * or less. It is the job of the predictor to decide a smart cut-off.
 * For example if there are 4 very good matches and 4 very poor ones,
 * probably only the 4 very good matches should be presented.
 * The predictions are presented either as an array of prediction objects or as
 * a function which returns this array when called with no parameters.
 * Each prediction object has the following shape:
 *     {
 *       name: '...',     // textual completion. i.e. what the cli uses
 *       value: { ... },  // value behind the textual completion
 *       incomplete: true // this completion is only partial (optional)
 *     }
 * The 'incomplete' property could be used to denote a valid completion which
 * could have sub-values (e.g. for tree navigation).
 */
function Conversion(value, arg, status, message, predictions) {
  // The result of the conversion process. Will be null if status != VALID
  this.value = value;

  // Allow us to trace where this Conversion came from
  this.arg = arg;
  if (arg == null) {
    throw new Error('Missing arg');
  }

  this._status = status || Status.VALID;
  this.message = message;
  this.predictions = predictions;
}

/**
 * Ensure that all arguments that are part of this conversion know what they
 * are assigned to.
 * @param assignment The Assignment (param/conversion link) to inform the
 * argument about.
 */
Conversion.prototype.assign = function(assignment) {
  this.arg.assign(assignment);
};

/**
 * Work out if there is information provided in the contained argument.
 */
Conversion.prototype.isDataProvided = function() {
  return this.arg.type !== 'BlankArgument';
};

/**
 * 2 conversions are equal if and only if their args are equal (argEquals) and
 * their values are equal (valueEquals).
 * @param that The conversion object to compare against.
 */
Conversion.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null) {
    return false;
  }
  return this.valueEquals(that) && this.argEquals(that);
};

/**
 * Check that the value in this conversion is strict equal to the value in the
 * provided conversion.
 * @param that The conversion to compare values with
 */
Conversion.prototype.valueEquals = function(that) {
  return this.value === that.value;
};

/**
 * Check that the argument in this conversion is equal to the value in the
 * provided conversion as defined by the argument (i.e. arg.equals).
 * @param that The conversion to compare arguments with
 */
Conversion.prototype.argEquals = function(that) {
  return that == null ? false : this.arg.equals(that.arg);
};

/**
 * Accessor for the status of this conversion
 */
Conversion.prototype.getStatus = function(arg) {
  return this._status;
};

/**
 * Defined by the toString() value provided by the argument
 */
Conversion.prototype.toString = function() {
  return this.arg.toString();
};

/**
 * If status === INCOMPLETE, then we may be able to provide predictions as to
 * how the argument can be completed.
 * @return An array of items, where each item is an object with the following
 * properties:
 * - name (mandatory): Displayed to the user, and typed in. No whitespace
 * - description (optional): Short string for display in a tool-tip
 * - manual (optional): Longer description which details usage
 * - incomplete (optional): Indicates that the prediction if used should not
 *   be considered necessarily sufficient, which typically will mean that the
 *   UI should not append a space to the completion
 * - value (optional): If a value property is present, this will be used as the
 *   value of the conversion, otherwise the item itself will be used.
 */
Conversion.prototype.getPredictions = function() {
  if (typeof this.predictions === 'function') {
    return this.predictions();
  }
  return this.predictions || [];
};

/**
 * Return an index constrained by the available predictions. Basically
 * (index % predicitons.length)
 */
Conversion.prototype.constrainPredictionIndex = function(index) {
  if (index == null) {
    return undefined;
  }

  var predictions = this.getPredictions();
  if (predictions.length === 0) {
    return undefined;
  }

  index = index % predictions.length;
  if (index < 0) {
    index = predictions.length + index;
  }
  return index;
};

/**
 * Constant to allow everyone to agree on the maximum number of predictions
 * that should be provided. We actually display 1 less than this number.
 */
Conversion.maxPredictions = 11;

exports.Conversion = Conversion;


/**
 * ArrayConversion is a special Conversion, needed because arrays are converted
 * member by member rather then as a whole, which means we can track the
 * conversion if individual array elements. So an ArrayConversion acts like a
 * normal Conversion (which is needed as Assignment requires a Conversion) but
 * it can also be devolved into a set of Conversions for each array member.
 */
function ArrayConversion(conversions, arg) {
  this.arg = arg;
  this.conversions = conversions;
  this.value = conversions.map(function(conversion) {
    return conversion.value;
  }, this);

  this._status = Status.combine(conversions.map(function(conversion) {
    return conversion.getStatus();
  }));

  // This message is just for reporting errors like "not enough values"
  // rather that for problems with individual values.
  this.message = '';

  // Predictions are generally provided by individual values
  this.predictions = [];
}

ArrayConversion.prototype = Object.create(Conversion.prototype);

ArrayConversion.prototype.assign = function(assignment) {
  this.conversions.forEach(function(conversion) {
    conversion.assign(assignment);
  }, this);
  this.assignment = assignment;
};

ArrayConversion.prototype.getStatus = function(arg) {
  if (arg && arg.conversion) {
    return arg.conversion.getStatus();
  }
  return this._status;
};

ArrayConversion.prototype.isDataProvided = function() {
  return this.conversions.length > 0;
};

ArrayConversion.prototype.valueEquals = function(that) {
  if (!(that instanceof ArrayConversion)) {
    throw new Error('Can\'t compare values with non ArrayConversion');
  }

  if (this.value === that.value) {
    return true;
  }

  if (this.value.length !== that.value.length) {
    return false;
  }

  for (var i = 0; i < this.conversions.length; i++) {
    if (!this.conversions[i].valueEquals(that.conversions[i])) {
      return false;
    }
  }

  return true;
};

ArrayConversion.prototype.toString = function() {
  return '[ ' + this.conversions.map(function(conversion) {
    return conversion.toString();
  }, this).join(', ') + ' ]';
};

exports.ArrayConversion = ArrayConversion;


/**
 * Most of our types are 'static' e.g. there is only one type of 'string',
 * however some types like 'selection' and 'deferred' are customizable.
 * The basic Type type isn't useful, but does provide documentation about what
 * types do.
 */
function Type() {
}

/**
 * Convert the given <tt>value</tt> to a string representation.
 * Where possible, there should be round-tripping between values and their
 * string representations.
 */
Type.prototype.stringify = function(value) {
  throw new Error('Not implemented');
};

/**
 * Convert the given <tt>arg</tt> to an instance of this type.
 * Where possible, there should be round-tripping between values and their
 * string representations.
 * @param arg An instance of <tt>Argument</tt> to convert.
 * @return Conversion
 */
Type.prototype.parse = function(arg) {
  throw new Error('Not implemented');
};

/**
 * A convenience method for times when you don't have an argument to parse
 * but instead have a string.
 * @see #parse(arg)
 */
Type.prototype.parseString = function(str) {
  return this.parse(new Argument(str));
},

/**
 * The plug-in system, and other things need to know what this type is
 * called. The name alone is not enough to fully specify a type. Types like
 * 'selection' and 'deferred' need extra data, however this function returns
 * only the name, not the extra data.
 */
Type.prototype.name = undefined;

/**
 * If there is some concept of a higher value, return it,
 * otherwise return undefined.
 */
Type.prototype.increment = function(value) {
  return undefined;
};

/**
 * If there is some concept of a lower value, return it,
 * otherwise return undefined.
 */
Type.prototype.decrement = function(value) {
  return undefined;
};

/**
 * The 'blank value' of most types is 'undefined', but there are exceptions;
 * This allows types to specify a better conversion from empty string than
 * 'undefined'.
 * 2 known examples of this are boolean -> false and array -> []
 */
Type.prototype.getBlank = function() {
  return this.parse(new BlankArgument());
};

/**
 * This is something of a hack for the benefit of DeferredType which needs to
 * be able to lie about it's type for fields to accept it as one of their own.
 * Sub-types can ignore this unless they're DeferredType.
 */
Type.prototype.getType = function() {
  return this;
};

exports.Type = Type;

/**
 * Private registry of types
 * Invariant: types[name] = type.name
 */
var registeredTypes = {};

exports.getTypeNames = function() {
  return Object.keys(registeredTypes);
};

/**
 * Add a new type to the list available to the system.
 * You can pass 2 things to this function - either an instance of Type, in
 * which case we return this instance when #getType() is called with a 'name'
 * that matches type.name.
 * Also you can pass in a constructor (i.e. function) in which case when
 * #getType() is called with a 'name' that matches Type.prototype.name we will
 * pass the typeSpec into this constructor.
 */
exports.registerType = function(type) {
  if (typeof type === 'object') {
    if (type instanceof Type) {
      if (!type.name) {
        throw new Error('All registered types must have a name');
      }
      registeredTypes[type.name] = type;
    }
    else {
      throw new Error('Can\'t registerType using: ' + type);
    }
  }
  else if (typeof type === 'function') {
    if (!type.prototype.name) {
      throw new Error('All registered types must have a name');
    }
    registeredTypes[type.prototype.name] = type;
  }
  else {
    throw new Error('Unknown type: ' + type);
  }
};

exports.registerTypes = function registerTypes(newTypes) {
  Object.keys(newTypes).forEach(function(name) {
    var type = newTypes[name];
    type.name = name;
    newTypes.registerType(type);
  });
};

/**
 * Remove a type from the list available to the system
 */
exports.deregisterType = function(type) {
  delete registeredTypes[type.name];
};

/**
 * Find a type, previously registered using #registerType()
 */
exports.getType = function(typeSpec) {
  var type;
  if (typeof typeSpec === 'string') {
    type = registeredTypes[typeSpec];
    if (typeof type === 'function') {
      type = new type({});
    }
    return type;
  }

  if (typeof typeSpec === 'object') {
    if (!typeSpec.name) {
      throw new Error('Missing \'name\' member to typeSpec');
    }

    type = registeredTypes[typeSpec.name];
    if (typeof type === 'function') {
      type = new type(typeSpec);
    }
    return type;
  }

  throw new Error('Can\'t extract type from ' + typeSpec);
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/argument', ['require', 'exports', 'module' ], function(require, exports, module) {


/**
 * Thinking out loud here:
 * Arguments are an area where we could probably refactor things a bit better.
 * The split process in Requisition creates a set of Arguments, which are then
 * assigned. The assign process sometimes converts them into subtypes of
 * Argument. We might consider that what gets assigned is _always_ one of the
 * subtypes (or actually a different type hierarchy entirely) and that we
 * don't manipulate the prefix/text/suffix but just use the 'subtypes' as
 * filters which present a view of the underlying original Argument.
 */

/**
 * We record where in the input string an argument comes so we can report
 * errors against those string positions.
 * @param text The string (trimmed) that contains the argument
 * @param prefix Knowledge of quotation marks and whitespace used prior to the
 * text in the input string allows us to re-generate the original input from
 * the arguments.
 * @param suffix Any quotation marks and whitespace used after the text.
 * Whitespace is normally placed in the prefix to the succeeding argument, but
 * can be used here when this is the last argument.
 * @constructor
 */
function Argument(text, prefix, suffix) {
  if (text === undefined) {
    this.text = '';
    this.prefix = '';
    this.suffix = '';
  }
  else {
    this.text = text;
    this.prefix = prefix !== undefined ? prefix : '';
    this.suffix = suffix !== undefined ? suffix : '';
  }
}

Argument.prototype.type = 'Argument';

/**
 * Return the result of merging these arguments.
 * case and some of the arguments are in quotation marks?
 */
Argument.prototype.merge = function(following) {
  // Is it possible that this gets called when we're merging arguments
  // for the single string?
  return new Argument(
    this.text + this.suffix + following.prefix + following.text,
    this.prefix, following.suffix);
};

/**
 * Returns a new Argument like this one but with various items changed.
 * @param options Values to use in creating a new Argument.
 * Warning: some implementations of beget make additions to the options
 * argument. You should be aware of this in the unlikely event that you want to
 * reuse 'options' arguments.
 * Properties:
 * - text: The new text value
 * - prefixSpace: Should the prefix be altered to begin with a space?
 * - prefixPostSpace: Should the prefix be altered to end with a space?
 * - suffixSpace: Should the suffix be altered to end with a space?
 * - type: Constructor to use in creating new instances. Default: Argument
 */
Argument.prototype.beget = function(options) {
  var text = this.text;
  var prefix = this.prefix;
  var suffix = this.suffix;

  if (options.text != null) {
    text = options.text;

    // We need to add quotes when the replacement string has spaces or is empty
    var needsQuote = text.indexOf(' ') >= 0 || text.length == 0;
    if (needsQuote && /['"]/.test(prefix)) {
      prefix = prefix + '\'';
      suffix = '\'' + suffix;
    }
  }

  if (options.prefixSpace && prefix.charAt(0) !== ' ') {
    prefix = ' ' + prefix;
  }

  if (options.prefixPostSpace && prefix.charAt(prefix.length - 1) !== ' ') {
    prefix = prefix + ' ';
  }

  if (options.suffixSpace && suffix.charAt(suffix.length - 1) !== ' ') {
    suffix = suffix + ' ';
  }

  if (text === this.text && suffix === this.suffix && prefix === this.prefix) {
    return this;
  }

  var type = options.type || Argument;
  return new type(text, prefix, suffix);
};

/**
 * We need to keep track of which assignment we've been assigned to
 */
Argument.prototype.assign = function(assignment) {
  this.assignment = assignment;
};

/**
 * Sub-classes of Argument are collections of arguments, getArgs() gets access
 * to the members of the collection in order to do things like re-create input
 * command lines. For the simple Argument case it's just an array containing
 * only this.
 */
Argument.prototype.getArgs = function() {
  return [ this ];
};

/**
 * We define equals to mean all arg properties are strict equals.
 * Used by Conversion.argEquals and Conversion.equals and ultimately
 * Assignment.equals to avoid reporting a change event when a new conversion
 * is assigned.
 */
Argument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof Argument)) {
    return false;
  }

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

/**
 * Helper when we're putting arguments back together
 */
Argument.prototype.toString = function() {
  // BUG 664207: We should re-escape escaped characters
  // But can we do that reliably?
  return this.prefix + this.text + this.suffix;
};

/**
 * Merge an array of arguments into a single argument.
 * All Arguments in the array are expected to have the same emitter
 */
Argument.merge = function(argArray, start, end) {
  start = (start === undefined) ? 0 : start;
  end = (end === undefined) ? argArray.length : end;

  var joined;
  for (var i = start; i < end; i++) {
    var arg = argArray[i];
    if (!joined) {
      joined = arg;
    }
    else {
      joined = joined.merge(arg);
    }
  }
  return joined;
};

/**
 * For test/debug use only. The output from this function is subject to wanton
 * random change without notice, and should not be relied upon to even exist
 * at some later date.
 */
Object.defineProperty(Argument.prototype, '_summaryJson', {
  get: function() {
    var assignStatus = this.assignment == null ?
            'null' :
            this.assignment.param.name;
    return '<' + this.prefix + ':' + this.text + ':' + this.suffix + '>' +
        ' (a=' + assignStatus + ',' + ' t=' + this.type + ')';
  },
  enumerable: true
});

exports.Argument = Argument;


/**
 * BlankArgument is a marker that the argument wasn't typed but is there to
 * fill a slot. Assignments begin with their arg set to a BlankArgument.
 */
function BlankArgument() {
  this.text = '';
  this.prefix = '';
  this.suffix = '';
}

BlankArgument.prototype = Object.create(Argument.prototype);

BlankArgument.prototype.type = 'BlankArgument';

exports.BlankArgument = BlankArgument;


/**
 * ScriptArgument is a marker that the argument is designed to be Javascript.
 * It also implements the special rules that spaces after the { or before the
 * } are part of the pre/suffix rather than the content, and that they are
 * never 'blank' so they can be used by Requisition._split() and not raise an
 * ERROR status due to being blank.
 */
function ScriptArgument(text, prefix, suffix) {
  this.text = text !== undefined ? text : '';
  this.prefix = prefix !== undefined ? prefix : '';
  this.suffix = suffix !== undefined ? suffix : '';

  ScriptArgument._moveSpaces(this);
}

ScriptArgument.prototype = Object.create(Argument.prototype);

ScriptArgument.prototype.type = 'ScriptArgument';

/**
 * Private/Dangerous: Alters a ScriptArgument to move the spaces at the start
 * or end of the 'text' into the prefix/suffix. With a string, " a " is 3 chars
 * long, but with a ScriptArgument, { a } is only one char long.
 * Arguments are generally supposed to be immutable, so this method should only
 * be called on a ScriptArgument that isn't exposed to the outside world yet.
 */
ScriptArgument._moveSpaces = function(arg) {
  while (arg.text.charAt(0) === ' ') {
    arg.prefix = arg.prefix + ' ';
    arg.text = arg.text.substring(1);
  }

  while (arg.text.charAt(arg.text.length - 1) === ' ') {
    arg.suffix = ' ' + arg.suffix;
    arg.text = arg.text.slice(0, -1);
  }
};

/**
 * As Argument.beget that implements the space rule documented in the ctor.
 */
ScriptArgument.prototype.beget = function(options) {
  options.type = ScriptArgument;
  var begotten = Argument.prototype.beget.call(this, options);
  ScriptArgument._moveSpaces(begotten);
  return begotten;
};

exports.ScriptArgument = ScriptArgument;


/**
 * Commands like 'echo' with a single string argument, and used with the
 * special format like: 'echo a b c' effectively have a number of arguments
 * merged together.
 */
function MergedArgument(args, start, end) {
  if (!Array.isArray(args)) {
    throw new Error('args is not an array of Arguments');
  }

  if (start === undefined) {
    this.args = args;
  }
  else {
    this.args = args.slice(start, end);
  }

  var arg = Argument.merge(this.args);
  this.text = arg.text;
  this.prefix = arg.prefix;
  this.suffix = arg.suffix;
}

MergedArgument.prototype = Object.create(Argument.prototype);

MergedArgument.prototype.type = 'MergedArgument';

/**
 * Keep track of which assignment we've been assigned to, and allow the
 * original args to do the same.
 */
MergedArgument.prototype.assign = function(assignment) {
  this.args.forEach(function(arg) {
    arg.assign(assignment);
  }, this);

  this.assignment = assignment;
};

MergedArgument.prototype.getArgs = function() {
  return this.args;
};

MergedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof MergedArgument)) {
    return false;
  }

  // We might need to add a check that args is the same here

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

exports.MergedArgument = MergedArgument;


/**
 * TrueNamedArguments are for when we have an argument like --verbose which
 * has a boolean value, and thus the opposite of '--verbose' is ''.
 */
function TrueNamedArgument(arg) {
  this.arg = arg;
  this.text = arg.text;
  this.prefix = arg.prefix;
  this.suffix = arg.suffix;
}

TrueNamedArgument.prototype = Object.create(Argument.prototype);

TrueNamedArgument.prototype.type = 'TrueNamedArgument';

TrueNamedArgument.prototype.assign = function(assignment) {
  if (this.arg) {
    this.arg.assign(assignment);
  }
  this.assignment = assignment;
};

TrueNamedArgument.prototype.getArgs = function() {
  return [ this.arg ];
};

TrueNamedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof TrueNamedArgument)) {
    return false;
  }

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

/**
 * As Argument.beget that rebuilds nameArg and valueArg
 */
TrueNamedArgument.prototype.beget = function(options) {
  if (options.text) {
    console.error('Can\'t change text of a TrueNamedArgument', this, options);
  }

  options.type = TrueNamedArgument;
  var begotten = Argument.prototype.beget.call(this, options);
  begotten.arg = new Argument(begotten.text, begotten.prefix, begotten.suffix);
  return begotten;
};

exports.TrueNamedArgument = TrueNamedArgument;


/**
 * FalseNamedArguments are for when we don't have an argument like --verbose
 * which has a boolean value, and thus the opposite of '' is '--verbose'.
 */
function FalseNamedArgument() {
  this.text = '';
  this.prefix = '';
  this.suffix = '';
}

FalseNamedArgument.prototype = Object.create(Argument.prototype);

FalseNamedArgument.prototype.type = 'FalseNamedArgument';

FalseNamedArgument.prototype.getArgs = function() {
  return [ ];
};

FalseNamedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof FalseNamedArgument)) {
    return false;
  }

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

exports.FalseNamedArgument = FalseNamedArgument;


/**
 * A named argument is for cases where we have input in one of the following
 * formats:
 * <ul>
 * <li>--param value
 * <li>-p value
 * </ul>
 * We model this as a normal argument but with a long prefix.
 *
 * There are 2 ways to construct a NamedArgument. One using 2 Arguments which
 * are taken to be the argument for the name (e.g. '--param') and one for the
 * value to assign to that parameter.
 * Alternatively, you can pass in the text/prefix/suffix values in the same
 * way as an Argument is constructed. If you do this then you are expected to
 * assign to nameArg and valueArg before exposing the new NamedArgument.
 */
function NamedArgument() {
  if (typeof arguments[0] === 'string') {
    this.nameArg = null;
    this.valueArg = null;
    this.text = arguments[0];
    this.prefix = arguments[1];
    this.suffix = arguments[2];
  }
  else if (arguments[1] == null) {
    this.nameArg = arguments[0];
    this.valueArg = null;
    this.text = '';
    this.prefix = this.nameArg.toString();
    this.suffix = '';
  }
  else {
    this.nameArg = arguments[0];
    this.valueArg = arguments[1];
    this.text = this.valueArg.text;
    this.prefix = this.nameArg.toString() + this.valueArg.prefix;
    this.suffix = this.valueArg.suffix;
  }
}

NamedArgument.prototype = Object.create(Argument.prototype);

NamedArgument.prototype.type = 'NamedArgument';

NamedArgument.prototype.assign = function(assignment) {
  this.nameArg.assign(assignment);
  if (this.valueArg != null) {
    this.valueArg.assign(assignment);
  }
  this.assignment = assignment;
};

NamedArgument.prototype.getArgs = function() {
  return this.valueArg ? [ this.nameArg, this.valueArg ] : [ this.nameArg ];
};

NamedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null) {
    return false;
  }

  if (!(that instanceof NamedArgument)) {
    return false;
  }

  // We might need to add a check that nameArg and valueArg are the same

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

/**
 * As Argument.beget that rebuilds nameArg and valueArg
 */
NamedArgument.prototype.beget = function(options) {
  options.type = NamedArgument;
  var begotten = Argument.prototype.beget.call(this, options);

  // Cut the prefix into |whitespace|non-whitespace|whitespace| so we can
  // rebuild nameArg and valueArg from the parts
  var matches = /^([\s]*)([^\s]*)([\s]*)$/.exec(begotten.prefix);

  if (this.valueArg == null && begotten.text === '') {
    begotten.nameArg = new Argument(matches[2], matches[1], matches[3]);
    begotten.valueArg = null;
  }
  else {
    begotten.nameArg = new Argument(matches[2], matches[1], '');
    begotten.valueArg = new Argument(begotten.text, matches[3], begotten.suffix);
  }

  return begotten;
};

exports.NamedArgument = NamedArgument;


/**
 * An argument the groups together a number of plain arguments together so they
 * can be jointly assigned to a single array parameter
 */
function ArrayArgument() {
  this.args = [];
}

ArrayArgument.prototype = Object.create(Argument.prototype);

ArrayArgument.prototype.type = 'ArrayArgument';

ArrayArgument.prototype.addArgument = function(arg) {
  this.args.push(arg);
};

ArrayArgument.prototype.addArguments = function(args) {
  Array.prototype.push.apply(this.args, args);
};

ArrayArgument.prototype.getArguments = function() {
  return this.args;
};

ArrayArgument.prototype.assign = function(assignment) {
  this.args.forEach(function(arg) {
    arg.assign(assignment);
  }, this);

  this.assignment = assignment;
};

ArrayArgument.prototype.getArgs = function() {
  return this.args;
};

ArrayArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null) {
    return false;
  }

  if (!(that.type === 'ArrayArgument')) {
    return false;
  }

  if (this.args.length !== that.args.length) {
    return false;
  }

  for (var i = 0; i < this.args.length; i++) {
    if (!this.args[i].equals(that.args[i])) {
      return false;
    }
  }

  return true;
};

/**
 * Helper when we're putting arguments back together
 */
ArrayArgument.prototype.toString = function() {
  return '{' + this.args.map(function(arg) {
    return arg.toString();
  }, this).join(',') + '}';
};

exports.ArrayArgument = ArrayArgument;


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/types/basic', ['require', 'exports', 'module' , 'gcli/l10n', 'gcli/types', 'gcli/types/selection', 'gcli/argument'], function(require, exports, module) {


var l10n = require('gcli/l10n');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var ArrayConversion = require('gcli/types').ArrayConversion;
var SelectionType = require('gcli/types/selection').SelectionType;

var BlankArgument = require('gcli/argument').BlankArgument;
var ArrayArgument = require('gcli/argument').ArrayArgument;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(StringType);
  types.registerType(NumberType);
  types.registerType(BooleanType);
  types.registerType(BlankType);
  types.registerType(DeferredType);
  types.registerType(ArrayType);
};

exports.shutdown = function() {
  types.unregisterType(StringType);
  types.unregisterType(NumberType);
  types.unregisterType(BooleanType);
  types.unregisterType(BlankType);
  types.unregisterType(DeferredType);
  types.unregisterType(ArrayType);
};


/**
 * 'string' the most basic string type that doesn't need to convert
 */
function StringType(typeSpec) {
}

StringType.prototype = Object.create(Type.prototype);

StringType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return value.toString();
};

StringType.prototype.parse = function(arg) {
  if (arg.text == null || arg.text === '') {
    return new Conversion(undefined, arg, Status.INCOMPLETE, '');
  }
  return new Conversion(arg.text, arg);
};

StringType.prototype.name = 'string';

exports.StringType = StringType;


/**
 * We don't currently plan to distinguish between integers and floats
 */
function NumberType(typeSpec) {
  if (typeSpec) {
    this._min = typeSpec.min;
    this._max = typeSpec.max;
    this._step = typeSpec.step || 1;
  }
  else {
    this._step = 1;
  }
}

NumberType.prototype = Object.create(Type.prototype);

NumberType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return '' + value;
};

NumberType.prototype.getMin = function() {
  if (this._min) {
    if (typeof this._min === 'function') {
      return this._min();
    }
    if (typeof this._min === 'number') {
      return this._min;
    }
  }
  return undefined;
};

NumberType.prototype.getMax = function() {
  if (this._max) {
    if (typeof this._max === 'function') {
      return this._max();
    }
    if (typeof this._max === 'number') {
      return this._max;
    }
  }
  return undefined;
};

NumberType.prototype.parse = function(arg) {
  if (arg.text.replace(/^\s*-?/, '').length === 0) {
    return new Conversion(undefined, arg, Status.INCOMPLETE, '');
  }

  var value = parseInt(arg.text, 10);
  if (isNaN(value)) {
    return new Conversion(undefined, arg, Status.ERROR,
        l10n.lookupFormat('typesNumberNan', [ arg.text ]));
  }

  var max = this.getMax();
  if (max != null && value > max) {
    return new Conversion(undefined, arg, Status.ERROR,
        l10n.lookupFormat('typesNumberMax', [ value, max ]));
  }

  var min = this.getMin();
  if (min != null && value < min) {
    return new Conversion(undefined, arg, Status.ERROR,
        l10n.lookupFormat('typesNumberMin', [ value, min ]));
  }

  return new Conversion(value, arg);
};

NumberType.prototype.decrement = function(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return this.getMax() || 1;
  }
  var newValue = value - this._step;
  // Snap to the nearest incremental of the step
  newValue = Math.ceil(newValue / this._step) * this._step;
  return this._boundsCheck(newValue);
};

NumberType.prototype.increment = function(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    var min = this.getMin();
    return min != null ? min : 0;
  }
  var newValue = value + this._step;
  // Snap to the nearest incremental of the step
  newValue = Math.floor(newValue / this._step) * this._step;
  if (this.getMax() == null) {
    return newValue;
  }
  return this._boundsCheck(newValue);
};

/**
 * Return the input value so long as it is within the max/min bounds. If it is
 * lower than the minimum, return the minimum. If it is bigger than the maximum
 * then return the maximum.
 */
NumberType.prototype._boundsCheck = function(value) {
  var min = this.getMin();
  if (min != null && value < min) {
    return min;
  }
  var max = this.getMax();
  if (max != null && value > max) {
    return max;
  }
  return value;
};

NumberType.prototype.name = 'number';

exports.NumberType = NumberType;


/**
 * true/false values
 */
function BooleanType(typeSpec) {
}

BooleanType.prototype = Object.create(SelectionType.prototype);

BooleanType.prototype.lookup = [
  { name: 'false', value: false },
  { name: 'true', value: true }
];

BooleanType.prototype.parse = function(arg) {
  if (arg.type === 'TrueNamedArgument') {
    return new Conversion(true, arg);
  }
  if (arg.type === 'FalseNamedArgument') {
    return new Conversion(false, arg);
  }
  return SelectionType.prototype.parse.call(this, arg);
};

BooleanType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return '' + value;
};

BooleanType.prototype.getBlank = function() {
  return new Conversion(false, new BlankArgument(), Status.VALID, '', this.lookup);
};

BooleanType.prototype.name = 'boolean';

exports.BooleanType = BooleanType;


/**
 * A type for "we don't know right now, but hope to soon".
 */
function DeferredType(typeSpec) {
  if (typeof typeSpec.defer !== 'function') {
    throw new Error('Instances of DeferredType need typeSpec.defer to be a function that returns a type');
  }
  Object.keys(typeSpec).forEach(function(key) {
    this[key] = typeSpec[key];
  }, this);
}

DeferredType.prototype = Object.create(Type.prototype);

DeferredType.prototype.stringify = function(value) {
  return this.defer().stringify(value);
};

DeferredType.prototype.parse = function(arg) {
  return this.defer().parse(arg);
};

DeferredType.prototype.decrement = function(value) {
  var deferred = this.defer();
  return (deferred.decrement ? deferred.decrement(value) : undefined);
};

DeferredType.prototype.increment = function(value) {
  var deferred = this.defer();
  return (deferred.increment ? deferred.increment(value) : undefined);
};

DeferredType.prototype.increment = function(value) {
  var deferred = this.defer();
  return (deferred.increment ? deferred.increment(value) : undefined);
};

DeferredType.prototype.getType = function() {
  return this.defer();
};

Object.defineProperty(DeferredType.prototype, 'isImportant', {
  get: function() {
    return this.defer().isImportant;
  },
  enumerable: true
});

DeferredType.prototype.name = 'deferred';

exports.DeferredType = DeferredType;


/**
 * 'blank' is a type for use with DeferredType when we don't know yet.
 * It should not be used anywhere else.
 */
function BlankType(typeSpec) {
}

BlankType.prototype = Object.create(Type.prototype);

BlankType.prototype.stringify = function(value) {
  return '';
};

BlankType.prototype.parse = function(arg) {
  return new Conversion(undefined, arg);
};

BlankType.prototype.name = 'blank';

exports.BlankType = BlankType;


/**
 * A set of objects of the same type
 */
function ArrayType(typeSpec) {
  if (!typeSpec.subtype) {
    console.error('Array.typeSpec is missing subtype. Assuming string.' +
        JSON.stringify(typeSpec));
    typeSpec.subtype = 'string';
  }

  Object.keys(typeSpec).forEach(function(key) {
    this[key] = typeSpec[key];
  }, this);
  this.subtype = types.getType(this.subtype);
}

ArrayType.prototype = Object.create(Type.prototype);

ArrayType.prototype.stringify = function(values) {
  if (values == null) {
    return '';
  }
  // BUG 664204: Check for strings with spaces and add quotes
  return values.join(' ');
};

ArrayType.prototype.parse = function(arg) {
  if (arg.type === 'ArrayArgument') {
    var conversions = arg.getArguments().map(function(subArg) {
      var conversion = this.subtype.parse(subArg);
      // Hack alert. ArrayConversion needs to be able to answer questions
      // about the status of individual conversions in addition to the
      // overall state. This allows us to do that easily.
      subArg.conversion = conversion;
      return conversion;
    }, this);
    return new ArrayConversion(conversions, arg);
  }
  else {
    console.error('non ArrayArgument to ArrayType.parse', arg);
    throw new Error('non ArrayArgument to ArrayType.parse');
  }
};

ArrayType.prototype.getBlank = function(values) {
  return new ArrayConversion([], new ArrayArgument());
};

ArrayType.prototype.name = 'array';

exports.ArrayType = ArrayType;


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/types/selection', ['require', 'exports', 'module' , 'gcli/l10n', 'gcli/types', 'gcli/types/spell'], function(require, exports, module) {


var l10n = require('gcli/l10n');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var Speller = require('gcli/types/spell').Speller;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(SelectionType);
};

exports.shutdown = function() {
  types.unregisterType(SelectionType);
};


/**
 * A selection allows the user to pick a value from known set of options.
 * An option is made up of a name (which is what the user types) and a value
 * (which is passed to exec)
 * @param typeSpec Object containing properties that describe how this
 * selection functions. Properties include:
 * - lookup: An array of objects, one for each option, which contain name and
 *   value properties. lookup can be a function which returns this array
 * - data: An array of strings - alternative to 'lookup' where the valid values
 *   are strings. i.e. there is no mapping between what is typed and the value
 *   that is used by the program
 * - stringifyProperty: Conversion from value to string is generally a process
 *   of looking through all the valid options for a matching value, and using
 *   the associated name. However the name maybe available directly from the
 *   value using a property lookup. Setting 'stringifyProperty' allows
 *   SelectionType to take this shortcut.
 * - cacheable: If lookup is a function, then we normally assume that
 *   the values fetched can change. Setting 'cacheable:true' enables internal
 *   caching.
 */
function SelectionType(typeSpec) {
  if (typeSpec) {
    Object.keys(typeSpec).forEach(function(key) {
      this[key] = typeSpec[key];
    }, this);
  }
}

SelectionType.prototype = Object.create(Type.prototype);

SelectionType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  if (this.stringifyProperty != null) {
    return value[this.stringifyProperty];
  }
  var name = null;
  var lookup = this.getLookup();
  lookup.some(function(item) {
    if (item.value === value) {
      name = item.name;
      return true;
    }
    return false;
  }, this);
  return name;
};

/**
 * If typeSpec contained cacheable:true then calls to parse() work on cached
 * data. clearCache() enables the cache to be cleared.
 */
SelectionType.prototype.clearCache = function() {
  delete this._cachedLookup;
};

/**
 * There are several ways to get selection data. This unifies them into one
 * single function.
 * @return An array of objects with name and value properties.
 */
SelectionType.prototype.getLookup = function() {
  if (this._cachedLookup) {
    return this._cachedLookup;
  }

  if (this.lookup) {
    if (typeof this.lookup === 'function') {
      if (this.cacheable) {
        this._cachedLookup = this.lookup();
        return this._cachedLookup;
      }
      return this.lookup();
    }
    return this.lookup;
  }

  if (Array.isArray(this.data)) {
    this.lookup = this._dataToLookup(this.data);
    return this.lookup;
  }

  if (typeof(this.data) === 'function') {
    return this._dataToLookup(this.data());
  }

  throw new Error('SelectionType has no data');
};

/**
 * Selection can be provided with either a lookup object (in the 'lookup'
 * property) or an array of strings (in the 'data' property). Internally we
 * always use lookup, so we need a way to convert a 'data' array to a lookup.
 */
SelectionType.prototype._dataToLookup = function(data) {
  return data.map(function(option) {
    return { name: option, value: option };
  }, this);
};

/**
 * Return a list of possible completions for the given arg.
 * @param arg The initial input to match
 * @return A trimmed array of string:value pairs
 */
SelectionType.prototype._findPredictions = function(arg) {
  var predictions = [];
  var lookup = this.getLookup();
  var i, option;
  var maxPredictions = Conversion.maxPredictions;
  var match = arg.text.toLowerCase();

  // If the arg has a suffix then we're kind of 'done'. Only an exact match
  // will do.
  if (arg.suffix.length > 0) {
    for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
      option = lookup[i];
      if (option.name === arg.text) {
        this._addToPredictions(predictions, option, arg);
      }
    }

    return predictions;
  }

  // Cache lower case versions of all the option names
  for (i = 0; i < lookup.length; i++) {
    option = lookup[i];
    if (option._gcliLowerName == null) {
      option._gcliLowerName = option.name.toLowerCase();
    }
  }

  // Exact hidden matches. If 'hidden: true' then we only allow exact matches
  // All the tests after here check that !option.value.hidden
  for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
    option = lookup[i];
    if (option.name === arg.text) {
      this._addToPredictions(predictions, option, arg);
    }
  }

  // Start with prefix matching
  for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
    option = lookup[i];
    if (option._gcliLowerName.indexOf(match) === 0 && !option.value.hidden) {
      if (predictions.indexOf(option) === -1) {
        this._addToPredictions(predictions, option, arg);
      }
    }
  }

  // Try infix matching if we get less half max matched
  if (predictions.length < (maxPredictions / 2)) {
    for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
      option = lookup[i];
      if (option._gcliLowerName.indexOf(match) !== -1 && !option.value.hidden) {
        if (predictions.indexOf(option) === -1) {
          this._addToPredictions(predictions, option, arg);
        }
      }
    }
  }

  // Try fuzzy matching if we don't get a prefix match
  if (false && predictions.length === 0) {
    var speller = new Speller();
    var names = lookup.map(function(opt) {
      return opt.name;
    });
    speller.train(names);
    var corrected = speller.correct(match);
    if (corrected) {
      lookup.forEach(function(opt) {
        if (opt.name === corrected) {
          predictions.push(opt);
        }
      }, this);
    }
  }

  return predictions;
};

/**
 * Add an option to our list of predicted options.
 * We abstract out this portion of _findPredictions() because CommandType needs
 * to make an extra check before actually adding which SelectionType does not
 * need to make.
 */
SelectionType.prototype._addToPredictions = function(predictions, option, arg) {
  predictions.push(option);
};

SelectionType.prototype.parse = function(arg) {
  var predictions = this._findPredictions(arg);

  if (predictions.length === 0) {
    var msg = l10n.lookupFormat('typesSelectionNomatch', [ arg.text ]);
    return new Conversion(undefined, arg, Status.ERROR, msg, predictions);
  }

  // This is something of a hack it basically allows us to tell the
  // setting type to forget its last setting hack.
  if (this.noMatch) {
    this.noMatch();
  }

  if (predictions[0].name === arg.text) {
    var value = predictions[0].value;
    return new Conversion(value, arg, Status.VALID, '', predictions);
  }

  return new Conversion(undefined, arg, Status.INCOMPLETE, '', predictions);
};

/**
 * For selections, up is down and black is white. It's like this, given a list
 * [ a, b, c, d ], it's natural to think that it starts at the top and that
 * going up the list, moves towards 'a'. However 'a' has the lowest index, so
 * for SelectionType, up is down and down is up.
 * Sorry.
 */
SelectionType.prototype.decrement = function(value) {
  var lookup = this.getLookup();
  var index = this._findValue(lookup, value);
  if (index === -1) {
    index = 0;
  }
  index++;
  if (index >= lookup.length) {
    index = 0;
  }
  return lookup[index].value;
};

/**
 * See note on SelectionType.decrement()
 */
SelectionType.prototype.increment = function(value) {
  var lookup = this.getLookup();
  var index = this._findValue(lookup, value);
  if (index === -1) {
    // For an increment operation when there is nothing to start from, we
    // want to start from the top, i.e. index 0, so the value before we
    // 'increment' (see note above) must be 1.
    index = 1;
  }
  index--;
  if (index < 0) {
    index = lookup.length - 1;
  }
  return lookup[index].value;
};

/**
 * Walk through an array of { name:.., value:... } objects looking for a
 * matching value (using strict equality), returning the matched index (or -1
 * if not found).
 * @param lookup Array of objects with name/value properties to search through
 * @param value The value to search for
 * @return The index at which the match was found, or -1 if no match was found
 */
SelectionType.prototype._findValue = function(lookup, value) {
  var index = -1;
  for (var i = 0; i < lookup.length; i++) {
    var pair = lookup[i];
    if (pair.value === value) {
      index = i;
      break;
    }
  }
  return index;
};

SelectionType.prototype.name = 'selection';

exports.SelectionType = SelectionType;


});
/*
 * Copyright (c) 2009 Panagiotis Astithas
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

define('gcli/types/spell', ['require', 'exports', 'module' ], function(require, exports, module) {


/**
 * A spell-checker based on the statistical algorithm described by Peter Norvig
 * in http://norvig.com/spell-correct.html, and converted to JavaScript by Past
 * http://past.github.com/speller/
 *
 * Usage requires a two-step process:
 * 1) call speller.train() one or more times with a large text to train the
 *    language model
 * 2) call speller.correct(word) to retrieve the correction for the specified
 *    word
 */
function Speller() {
  // A map of words to the count of times they were encountered during training.
  this._nWords = {};
}

Speller.letters = "abcdefghijklmnopqrstuvwxyz".split("");

/**
 * A function that trains the language model with the words in the supplied
 * text. Multiple invocation of this function can extend the training of the
 * model.
 */
Speller.prototype.train = function(words) {
  words.forEach(function(word) {
    word = word.toLowerCase();
    this._nWords[word] = this._nWords.hasOwnProperty(word) ?
            this._nWords[word] + 1 :
            1;
  }, this);
};

/**
 * A function that returns the correction for the specified word.
 */
Speller.prototype.correct = function(word) {
  if (this._nWords.hasOwnProperty(word)) {
    return word;
  }

  var candidates = {};
  var list = this._edits(word);
  list.forEach(function(edit) {
    if (this._nWords.hasOwnProperty(edit)) {
      candidates[this._nWords[edit]] = edit;
    }
  }, this);

  if (this._countKeys(candidates) > 0) {
    return candidates[this._max(candidates)];
  }

  list.forEach(function(edit) {
    this._edits(edit).forEach(function(w) {
      if (this._nWords.hasOwnProperty(w)) {
        candidates[this._nWords[w]] = w;
      }
    }, this);
  }, this);

  return this._countKeys(candidates) > 0 ?
      candidates[this._max(candidates)] :
      null;
};

/**
 * A helper function that counts the keys in the supplied object.
 */
Speller.prototype._countKeys = function(object) {
  // return Object.keys(object).length; ?
  var count = 0;
  for (var attr in object) {
    if (object.hasOwnProperty(attr)) {
      count++;
    }
  }
  return count;
};

/**
 * A helper function that returns the word with the most occurrences in the
 * language model, among the supplied candidates.
 * @param candidates
 */
Speller.prototype._max = function(candidates) {
  var arr = [];
  for (var candidate in candidates) {
    if (candidates.hasOwnProperty(candidate)) {
      arr.push(candidate);
    }
  }
  return Math.max.apply(null, arr);
};

/**
 * A function that returns the set of possible corrections of the specified
 * word. The edits can be deletions, insertions, alterations or transpositions.
 */
Speller.prototype._edits = function(word) {
  var results = [];

  // Deletion
  for (var i = 0; i < word.length; i++) {
    results.push(word.slice(0, i) + word.slice(i + 1));
  }

  // Transposition
  for (i = 0; i < word.length - 1; i++) {
    results.push(word.slice(0, i) + word.slice(i + 1, i + 2)
            + word.slice(i, i + 1) + word.slice(i + 2));
  }

  // Alteration
  for (i = 0; i < word.length; i++) {
    Speller.letters.forEach(function(l) {
      results.push(word.slice(0, i) + l + word.slice(i + 1));
    }, this);
  }

  // Insertion
  for (i = 0; i <= word.length; i++) {
    Speller.letters.forEach(function(l) {
      results.push(word.slice(0, i) + l + word.slice(i));
    }, this);
  }

  return results;
};

exports.Speller = Speller;


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/types/command', ['require', 'exports', 'module' , 'gcli/canon', 'gcli/l10n', 'gcli/types', 'gcli/types/selection'], function(require, exports, module) {


var canon = require('gcli/canon');
var l10n = require('gcli/l10n');
var types = require('gcli/types');
var SelectionType = require('gcli/types/selection').SelectionType;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(CommandType);
  types.registerType(ParamType);
};

exports.shutdown = function() {
  types.unregisterType(CommandType);
  types.unregisterType(ParamType);
};


/**
 * Select from the available commands.
 * This is very similar to a SelectionType, however the level of hackery in
 * SelectionType to make it handle Commands correctly was to high, so we
 * simplified.
 * If you are making changes to this code, you should check there too.
 */
function ParamType(typeSpec) {
  this.requisition = typeSpec.requisition;
  this.isIncompleteName = typeSpec.isIncompleteName;
  this.stringifyProperty = 'name';
}

ParamType.prototype = Object.create(SelectionType.prototype);

ParamType.prototype.name = 'param';

ParamType.prototype.lookup = function() {
  var displayedParams = [];
  var command = this.requisition.commandAssignment.value;
  command.params.forEach(function(param) {
    var arg = this.requisition.getAssignment(param.name).arg;
    if (!param.isPositionalAllowed && arg.type === "BlankArgument") {
      displayedParams.push({ name: '--' + param.name, value: param });
    }
  }, this);
  return displayedParams;
};

ParamType.prototype.parse = function(arg) {
  return this.isIncompleteName ?
      SelectionType.prototype.parse.call(this, arg) :
      new Conversion(undefined, arg, Status.ERROR, l10n.lookup('cliUnusedArg'));
};


/**
 * Select from the available commands.
 * This is very similar to a SelectionType, however the level of hackery in
 * SelectionType to make it handle Commands correctly was to high, so we
 * simplified.
 * If you are making changes to this code, you should check there too.
 */
function CommandType() {
  this.stringifyProperty = 'name';
}

CommandType.prototype = Object.create(SelectionType.prototype);

CommandType.prototype.name = 'command';

CommandType.prototype.lookup = function() {
  var commands = canon.getCommands();
  commands.sort(function(c1, c2) {
    return c1.name.localeCompare(c2.name);
  });
  return commands.map(function(command) {
    return { name: command.name, value: command };
  }, this);
};

/**
 * Add an option to our list of predicted options
 */
CommandType.prototype._addToPredictions = function(predictions, option, arg) {
  // The command type needs to exclude sub-commands when the CLI
  // is blank, but include them when we're filtering. This hack
  // excludes matches when the filter text is '' and when the
  // name includes a space.
  if (arg.text.length !== 0 || option.name.indexOf(' ') === -1) {
    predictions.push(option);
  }
};

CommandType.prototype.parse = function(arg) {
  // Especially at startup, predictions live over the time that things change
  // so we provide a completion function rather than completion values
  var predictFunc = function() {
    return this._findPredictions(arg);
  }.bind(this);

  var predictions = this._findPredictions(arg);

  if (predictions.length === 0) {
    var msg = l10n.lookupFormat('typesSelectionNomatch', [ arg.text ]);
    return new Conversion(undefined, arg, Status.ERROR, msg, predictFunc);
  }

  var command = predictions[0].value;

  if (predictions.length === 1) {
    // Is it an exact match of an executable command,
    // or just the only possibility?
    if (command.name === arg.text && typeof command.exec === 'function') {
      return new Conversion(command, arg, Status.VALID, '');
    }
    return new Conversion(undefined, arg, Status.INCOMPLETE, '', predictFunc);
  }

  // It's valid if the text matches, even if there are several options
  if (predictions[0].name === arg.text) {
    return new Conversion(command, arg, Status.VALID, '', predictFunc);
  }

  return new Conversion(undefined, arg, Status.INCOMPLETE, '', predictFunc);
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/types/javascript', ['require', 'exports', 'module' , 'gcli/l10n', 'gcli/types'], function(require, exports, module) {


var l10n = require('gcli/l10n');
var types = require('gcli/types');

var Conversion = types.Conversion;
var Type = types.Type;
var Status = types.Status;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(JavascriptType);
};

exports.shutdown = function() {
  types.unregisterType(JavascriptType);
};

/**
 * The object against which we complete, which is usually 'window' if it exists
 * but could be something else in non-web-content environments.
 */
var globalObject;
if (typeof window !== 'undefined') {
  globalObject = window;
}

/**
 * Setter for the object against which JavaScript completions happen
 */
exports.setGlobalObject = function(obj) {
  globalObject = obj;
};

/**
 * Getter for the object against which JavaScript completions happen, for use
 * in testing
 */
exports.getGlobalObject = function() {
  return globalObject;
};

/**
 * Remove registration of object against which JavaScript completions happen
 */
exports.unsetGlobalObject = function() {
  globalObject = undefined;
};


/**
 * 'javascript' handles scripted input
 */
function JavascriptType(typeSpec) {
}

JavascriptType.prototype = Object.create(Type.prototype);

JavascriptType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return value;
};

/**
 * When sorting out completions, there is no point in displaying millions of
 * matches - this the number of matches that we aim for
 */
JavascriptType.MAX_COMPLETION_MATCHES = 10;

JavascriptType.prototype.parse = function(arg) {
  var typed = arg.text;
  var scope = globalObject;

  // No input is undefined
  if (typed === '') {
    return new Conversion(undefined, arg, Status.INCOMPLETE);
  }
  // Just accept numbers
  if (!isNaN(parseFloat(typed)) && isFinite(typed)) {
    return new Conversion(typed, arg);
  }
  // Just accept constants like true/false/null/etc
  if (typed.trim().match(/(null|undefined|NaN|Infinity|true|false)/)) {
    return new Conversion(typed, arg);
  }

  // Analyze the input text and find the beginning of the last part that
  // should be completed.
  var beginning = this._findCompletionBeginning(typed);

  // There was an error analyzing the string.
  if (beginning.err) {
    return new Conversion(typed, arg, Status.ERROR, beginning.err);
  }

  // If the current state is ParseState.COMPLEX, then we can't do completion.
  // so bail out now
  if (beginning.state === ParseState.COMPLEX) {
    return new Conversion(typed, arg);
  }

  // If the current state is not ParseState.NORMAL, then we are inside of a
  // string which means that no completion is possible.
  if (beginning.state !== ParseState.NORMAL) {
    return new Conversion(typed, arg, Status.INCOMPLETE, '');
  }

  var completionPart = typed.substring(beginning.startPos);
  var properties = completionPart.split('.');
  var matchProp;
  var prop;

  if (properties.length > 1) {
    matchProp = properties.pop().trimLeft();
    for (var i = 0; i < properties.length; i++) {
      prop = properties[i].trim();

      // We can't complete on null.foo, so bail out
      if (scope == null) {
        return new Conversion(typed, arg, Status.ERROR,
                l10n.lookup('jstypeParseScope'));
      }

      if (prop === '') {
        return new Conversion(typed, arg, Status.INCOMPLETE, '');
      }

      // Check if prop is a getter function on 'scope'. Functions can change
      // other stuff so we can't execute them to get the next object. Stop here.
      if (this._isSafeProperty(scope, prop)) {
        return new Conversion(typed, arg);
      }

      try {
        scope = scope[prop];
      }
      catch (ex) {
        // It would be nice to be able to report this error in some way but
        // as it can happen just when someone types '{sessionStorage.', it
        // almost doesn't really count as an error, so we ignore it
        return new Conversion(typed, arg, Status.VALID, '');
      }
    }
  }
  else {
    matchProp = properties[0].trimLeft();
  }

  // If the reason we just stopped adjusting the scope was a non-simple string,
  // then we're not sure if the input is valid or invalid, so accept it
  if (prop && !prop.match(/^[0-9A-Za-z]*$/)) {
    return new Conversion(typed, arg);
  }

  // However if the prop was a simple string, it is an error
  if (scope == null) {
    return new Conversion(typed, arg, Status.ERROR,
        l10n.lookupFormat('jstypeParseMissing', [ prop ]));
  }

  // If the thing we're looking for isn't a simple string, then we're not going
  // to find it, but we're not sure if it's valid or invalid, so accept it
  if (!matchProp.match(/^[0-9A-Za-z]*$/)) {
    return new Conversion(typed, arg);
  }

  // Skip Iterators and Generators.
  if (this._isIteratorOrGenerator(scope)) {
    return null;
  }

  var matchLen = matchProp.length;
  var prefix = matchLen === 0 ? typed : typed.slice(0, -matchLen);
  var status = Status.INCOMPLETE;
  var message = '';

  // We really want an array of matches (for sorting) but it's easier to
  // detect existing members if we're using a map initially
  var matches = {};

  // We only display a maximum of MAX_COMPLETION_MATCHES, so there is no point
  // in digging up the prototype chain for matches that we're never going to
  // use. Initially look for matches directly on the object itself and then
  // look up the chain to find more
  var distUpPrototypeChain = 0;
  var root = scope;
  try {
    while (root != null &&
        Object.keys(matches).length < JavascriptType.MAX_COMPLETION_MATCHES) {

      Object.keys(root).forEach(function(property) {
        // Only add matching properties. Also, as we're walking up the
        // prototype chain, properties on 'higher' prototypes don't override
        // similarly named properties lower down
        if (property.indexOf(matchProp) === 0 && !(property in matches)) {
          matches[property] = {
            prop: property,
            distUpPrototypeChain: distUpPrototypeChain
          };
        }
      });

      distUpPrototypeChain++;
      root = Object.getPrototypeOf(root);
    }
  }
  catch (ex) {
    return new Conversion(typed, arg, Status.INCOMPLETE, '');
  }

  // Convert to an array for sorting, and while we're at it, note if we got
  // an exact match so we know that this input is valid
  matches = Object.keys(matches).map(function(property) {
    if (property === matchProp) {
      status = Status.VALID;
    }
    return matches[property];
  });

  // The sort keys are:
  // - Being on the object itself, not in the prototype chain
  // - The lack of existence of a vendor prefix
  // - The name
  matches.sort(function(m1, m2) {
    if (m1.distUpPrototypeChain !== m2.distUpPrototypeChain) {
      return m1.distUpPrototypeChain - m2.distUpPrototypeChain;
    }
    // Push all vendor prefixes to the bottom of the list
    return isVendorPrefixed(m1.prop) ?
      (isVendorPrefixed(m2.prop) ? m1.prop.localeCompare(m2.prop) : 1) :
      (isVendorPrefixed(m2.prop) ? -1 : m1.prop.localeCompare(m2.prop));
  });

  // Trim to size. There is a bug for doing a better job of finding matches
  // (bug 682694), but in the mean time there is a performance problem
  // associated with creating a large number of DOM nodes that few people will
  // ever read, so trim ...
  if (matches.length > JavascriptType.MAX_COMPLETION_MATCHES) {
    matches = matches.slice(0, JavascriptType.MAX_COMPLETION_MATCHES - 1);
  }

  // Decorate the matches with:
  // - a description
  // - a value (for the menu) and,
  // - an incomplete flag which reports if we should assume that the user isn't
  //   going to carry on the JS expression with this input so far
  var predictions = matches.map(function(match) {
    var description;
    var incomplete = true;

    if (this._isSafeProperty(scope, match.prop)) {
      description = '(property getter)';
    }
    else {
      try {
        var value = scope[match.prop];

        if (typeof value === 'function') {
          description = '(function)';
        }
        else if (typeof value === 'boolean' || typeof value === 'number') {
          description = '= ' + value;
          incomplete = false;
        }
        else if (typeof value === 'string') {
          if (value.length > 40) {
            value = value.substring(0, 37) + '…';
          }
          description = '= \'' + value + '\'';
          incomplete = false;
        }
        else {
          description = '(' + typeof value + ')';
        }
      }
      catch (ex) {
        description = '(' + l10n.lookup('jstypeParseError') + ')';
      }
    }

    return {
      name: prefix + match.prop,
      value: {
        name: prefix + match.prop,
        description: description
      },
      description: description,
      incomplete: incomplete
    };
  }, this);

  if (predictions.length === 0) {
    status = Status.ERROR;
    message = l10n.lookupFormat('jstypeParseMissing', [ matchProp ]);
  }

  // If the match is the only one possible, and its VALID, predict nothing
  if (predictions.length === 1 && status === Status.VALID) {
    predictions = undefined;
  }

  return new Conversion(typed, arg, status, message, predictions);
};

/**
 * Does the given property have a prefix that indicates that it is vendor
 * specific?
 */
function isVendorPrefixed(name) {
  return name.indexOf('moz') === 0 ||
         name.indexOf('webkit') === 0 ||
         name.indexOf('ms') === 0;
}

/**
 * Constants used in return value of _findCompletionBeginning()
 */
var ParseState = {
  /**
   * We have simple input like window.foo, without any punctuation that makes
   * completion prediction be confusing or wrong
   */
  NORMAL: 0,

  /**
   * The cursor is in some Javascript that makes completion hard to predict,
   * like console.log(
   */
  COMPLEX: 1,

  /**
   * The cursor is inside single quotes (')
   */
  QUOTE: 2,

  /**
   * The cursor is inside single quotes (")
   */
  DQUOTE: 3
};

var OPEN_BODY = '{[('.split('');
var CLOSE_BODY = '}])'.split('');
var OPEN_CLOSE_BODY = {
  '{': '}',
  '[': ']',
  '(': ')'
};

/**
 * How we distinguish between simple and complex JS input. We attempt
 * completion against simple JS.
 */
var simpleChars = /[a-zA-Z0-9.]/;

/**
 * Analyzes a given string to find the last statement that is interesting for
 * later completion.
 * @param text A string to analyze
 * @return If there was an error in the string detected, then a object like
 *   { err: 'ErrorMesssage' }
 * is returned, otherwise a object like
 *   {
 *     state: ParseState.NORMAL|ParseState.QUOTE|ParseState.DQUOTE,
 *     startPos: index of where the last statement begins
 *   }
 */
JavascriptType.prototype._findCompletionBeginning = function(text) {
  var bodyStack = [];

  var state = ParseState.NORMAL;
  var start = 0;
  var c;
  var complex = false;

  for (var i = 0; i < text.length; i++) {
    c = text[i];
    if (!simpleChars.test(c)) {
      complex = true;
    }

    switch (state) {
      // Normal JS state.
      case ParseState.NORMAL:
        if (c === '"') {
          state = ParseState.DQUOTE;
        }
        else if (c === '\'') {
          state = ParseState.QUOTE;
        }
        else if (c === ';') {
          start = i + 1;
        }
        else if (c === ' ') {
          start = i + 1;
        }
        else if (OPEN_BODY.indexOf(c) != -1) {
          bodyStack.push({
            token: c,
            start: start
          });
          start = i + 1;
        }
        else if (CLOSE_BODY.indexOf(c) != -1) {
          var last = bodyStack.pop();
          if (!last || OPEN_CLOSE_BODY[last.token] != c) {
            return { err: l10n.lookup('jstypeBeginSyntax') };
          }
          if (c === '}') {
            start = i + 1;
          }
          else {
            start = last.start;
          }
        }
        break;

      // Double quote state > " <
      case ParseState.DQUOTE:
        if (c === '\\') {
          i ++;
        }
        else if (c === '\n') {
          return { err: l10n.lookup('jstypeBeginUnterm') };
        }
        else if (c === '"') {
          state = ParseState.NORMAL;
        }
        break;

      // Single quote state > ' <
      case ParseState.QUOTE:
        if (c === '\\') {
          i ++;
        }
        else if (c === '\n') {
          return { err: l10n.lookup('jstypeBeginUnterm') };
        }
        else if (c === '\'') {
          state = ParseState.NORMAL;
        }
        break;
    }
  }

  if (state === ParseState.NORMAL && complex) {
    state = ParseState.COMPLEX;
  }

  return {
    state: state,
    startPos: start
  };
};

/**
 * Return true if the passed object is either an iterator or a generator, and
 * false otherwise
 * @param obj The object to check
 */
JavascriptType.prototype._isIteratorOrGenerator = function(obj) {
  if (obj === null) {
    return false;
  }

  if (typeof aObject === 'object') {
    if (typeof obj.__iterator__ === 'function' ||
        obj.constructor && obj.constructor.name === 'Iterator') {
      return true;
    }

    try {
      var str = obj.toString();
      if (typeof obj.next === 'function' &&
          str.indexOf('[object Generator') === 0) {
        return true;
      }
    }
    catch (ex) {
      // window.history.next throws in the typeof check above.
      return false;
    }
  }

  return false;
};

/**
 * Would calling 'scope[prop]' cause the invocation of a non-native (i.e. user
 * defined) function property?
 * Since calling functions can have side effects, it's only safe to do that if
 * explicitly requested, rather than because we're trying things out for the
 * purposes of completion.
 */
JavascriptType.prototype._isSafeProperty = function(scope, prop) {
  if (typeof scope !== 'object') {
    return false;
  }

  // Walk up the prototype chain of 'scope' looking for a property descriptor
  // for 'prop'
  var propDesc;
  while (scope) {
    try {
      propDesc = Object.getOwnPropertyDescriptor(scope, prop);
      if (propDesc) {
        break;
      }
    }
    catch (ex) {
      // Native getters throw here. See bug 520882.
      if (ex.name === 'NS_ERROR_XPC_BAD_CONVERT_JS' ||
          ex.name === 'NS_ERROR_XPC_BAD_OP_ON_WN_PROTO') {
        return false;
      }
      return true;
    }
    scope = Object.getPrototypeOf(scope);
  }

  if (!propDesc) {
    return false;
  }

  if (!propDesc.get) {
    return false;
  }

  // The property is safe if 'get' isn't a function or if the function has a
  // prototype (in which case it's native)
  return typeof propDesc.get !== 'function' || 'prototype' in propDesc.get;
};

JavascriptType.prototype.name = 'javascript';

exports.JavascriptType = JavascriptType;


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/types/node', ['require', 'exports', 'module' , 'gcli/host', 'gcli/l10n', 'gcli/types', 'gcli/argument'], function(require, exports, module) {


var host = require('gcli/host');
var l10n = require('gcli/l10n');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var BlankArgument = require('gcli/argument').BlankArgument;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(NodeType);
  types.registerType(NodeListType);
};

exports.shutdown = function() {
  types.unregisterType(NodeType);
  types.unregisterType(NodeListType);
};

/**
 * The object against which we complete, which is usually 'window' if it exists
 * but could be something else in non-web-content environments.
 */
var doc;
if (typeof document !== 'undefined') {
  doc = document;
}

/**
 * For testing only.
 * The fake empty NodeList used when there are no matches, we replace this with
 * something that looks better as soon as we have a document, so not only
 * should you not use this, but you shouldn't cache it either.
 */
exports._empty = [];

/**
 * Setter for the document that contains the nodes we're matching
 */
exports.setDocument = function(document) {
  doc = document;
  exports._empty = doc.querySelectorAll('x>:root');
};

/**
 * Undo the effects of setDocument()
 */
exports.unsetDocument = function() {
  doc = undefined;
};

/**
 * Getter for the document that contains the nodes we're matching
 * Most for changing things back to how they were for unit testing
 */
exports.getDocument = function() {
  return doc;
};


/**
 * A CSS expression that refers to a single node
 */
function NodeType(typeSpec) {
}

NodeType.prototype = Object.create(Type.prototype);

NodeType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return value.__gcliQuery || 'Error';
};

NodeType.prototype.parse = function(arg) {
  if (arg.text === '') {
    return new Conversion(undefined, arg, Status.INCOMPLETE);
  }

  var nodes;
  try {
    nodes = doc.querySelectorAll(arg.text);
  }
  catch (ex) {
    return new Conversion(undefined, arg, Status.ERROR,
            l10n.lookup('nodeParseSyntax'));
  }

  if (nodes.length === 0) {
    return new Conversion(undefined, arg, Status.INCOMPLETE,
        l10n.lookup('nodeParseNone'));
  }

  if (nodes.length === 1) {
    var node = nodes.item(0);
    node.__gcliQuery = arg.text;

    host.flashNodes(node, true);

    return new Conversion(node, arg, Status.VALID, '');
  }

  host.flashNodes(nodes, false);

  return new Conversion(undefined, arg, Status.ERROR,
          l10n.lookupFormat('nodeParseMultiple', [ nodes.length ]));
};

NodeType.prototype.name = 'node';



/**
 * A CSS expression that refers to a node list.
 *
 * The 'allowEmpty' option ensures that we do not complain if the entered CSS
 * selector is valid, but does not match any nodes. There is some overlap
 * between this option and 'defaultValue'. What the user wants, in most cases,
 * would be to use 'defaultText' (i.e. what is typed rather than the value that
 * it represents). However this isn't a concept that exists yet and should
 * probably be a part of GCLI if/when it does.
 * All NodeListTypes have an automatic defaultValue of an empty NodeList so
 * they can easily be used in named parameters.
 */
function NodeListType(typeSpec) {
  if ('allowEmpty' in typeSpec && typeof typeSpec.allowEmpty !== 'boolean') {
    throw new Error('Legal values for allowEmpty are [true|false]');
  }

  this.allowEmpty = typeSpec.allowEmpty;
}

NodeListType.prototype = Object.create(Type.prototype);

NodeListType.prototype.getBlank = function() {
  return new Conversion(exports._empty, new BlankArgument(), Status.VALID);
};

NodeListType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return value.__gcliQuery || 'Error';
};

NodeListType.prototype.parse = function(arg) {
  if (arg.text === '') {
    return new Conversion(undefined, arg, Status.INCOMPLETE);
  }

  var nodes;
  try {
    nodes = doc.querySelectorAll(arg.text);
  }
  catch (ex) {
    return new Conversion(undefined, arg, Status.ERROR,
            l10n.lookup('nodeParseSyntax'));
  }

  if (nodes.length === 0 && !this.allowEmpty) {
    return new Conversion(undefined, arg, Status.INCOMPLETE,
        l10n.lookup('nodeParseNone'));
  }

  host.flashNodes(nodes, false);
  return new Conversion(nodes, arg, Status.VALID, '');
};

NodeListType.prototype.name = 'nodelist';


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/host', ['require', 'exports', 'module' ], function(require, exports, module) {


/**
 * Helper to turn a set of nodes background another color for 0.5 seconds.
 * There is likely a better way to do this, but this will do for now.
 */
exports.flashNodes = function(nodes, match) {
  if (nodes.style) {
    flashNode(nodes, match);
  }
  else {
    Array.prototype.forEach.call(nodes, function(node) {
      flashNode(node, match);
    });
  }
};

/**
 * Internal helper to turn a single nodes background another color for 0.5
 * second. There is likely a better way to do this, but this will do for now.
 */
function flashNode(node, match) {
  if (!node.__gcliHighlighting) {
    node.__gcliHighlighting = true;
    var original = node.style.background;
    node.style.background = match ? 'green' : 'red';
    setTimeout(function() {
      node.style.background = original;
      delete node.__gcliHighlighting;
    }, 500);
  }
}

/**
 * Helper to execute an arbitrary OS-level command.
 * @param promise the thing we resolve/reject on completion
 * @param execSpec Object containing some of the following properties:
 * - cmd (string): The command to execute (required)
 * - args (string[]): The arguments to pass to the command (default: [])
 * - cwd: (string): The current working directory
 * - env: (object): A map of properties to append to the default environment
 */
exports.exec = function(promise, execSpec) {
  var data = JSON.stringify(execSpec);

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/exec/', true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
  xhr.setRequestHeader('Content-Length', data.length);

  xhr.onreadystatechange = function(event) {
    if (xhr.readyState == 4) {
      if (xhr.status >= 300 || xhr.status < 200) {
        promise.reject(xhr.responseText);
        return;
      }

      promise.resolve(xhr.responseText);
    }
  };

  xhr.send(data);
};

/**
 * Helper to execute an arbitrary server-side JS function.
 * @param promise the thing we resolve/reject on completion
 * @param funcSpec Object containing some of the following properties:
 * - func (string): The function to execute (required)
 * - args (string[]): The arguments to pass to the command (default: [])
 */
exports.func = function(promise, funcSpec) {
  var data = JSON.stringify(funcSpec);

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/func/', true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
  xhr.setRequestHeader('Content-Length', data.length);

  xhr.onreadystatechange = function(event) {
    if (xhr.readyState == 4) {
      if (xhr.status >= 300 || xhr.status < 200) {
        promise.reject(JSON.parse(xhr.responseText));
        return;
      }

      promise.resolve(JSON.parse(xhr.responseText));
    }
  };

  xhr.send(data);
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/types/resource', ['require', 'exports', 'module' , 'gcli/types', 'gcli/types/selection'], function(require, exports, module) {


var types = require('gcli/types');
var SelectionType = require('gcli/types/selection').SelectionType;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(ResourceType);
};

exports.shutdown = function() {
  types.unregisterType(ResourceType);
  exports.clearResourceCache();
};

exports.clearResourceCache = function() {
  ResourceCache.clear();
};

/**
 * The object against which we complete, which is usually 'window' if it exists
 * but could be something else in non-web-content environments.
 */
var doc;
if (typeof document !== 'undefined') {
  doc = document;
}

/**
 * Setter for the document that contains the nodes we're matching
 */
exports.setDocument = function(document) {
  doc = document;
};

/**
 * Undo the effects of setDocument()
 */
exports.unsetDocument = function() {
  ResourceCache.clear();
  doc = undefined;
};

/**
 * Getter for the document that contains the nodes we're matching
 * Most for changing things back to how they were for unit testing
 */
exports.getDocument = function() {
  return doc;
};

/**
 * Resources are bits of CSS and JavaScript that the page either includes
 * directly or as a result of reading some remote resource.
 * Resource should not be used directly, but instead through a sub-class like
 * CssResource or ScriptResource.
 */
function Resource(name, type, inline, element) {
  this.name = name;
  this.type = type;
  this.inline = inline;
  this.element = element;
}

/**
 * Get the contents of the given resource as a string.
 * The base Resource leaves this unimplemented.
 */
Resource.prototype.getContents = function() {
  throw new Error('not implemented');
};

Resource.TYPE_SCRIPT = 'text/javascript';
Resource.TYPE_CSS = 'text/css';

/**
 * A CssResource provides an implementation of Resource that works for both
 * [style] elements and [link type='text/css'] elements in the [head].
 */
function CssResource(domSheet) {
  this.name = domSheet.href;
  if (!this.name) {
    this.name = domSheet.ownerNode.id ?
            'css#' + domSheet.ownerNode.id :
            'inline-css';
  }

  this.inline = (domSheet.href == null);
  this.type = Resource.TYPE_CSS;
  this.element = domSheet;
}

CssResource.prototype = Object.create(Resource.prototype);

CssResource.prototype.loadContents = function(callback) {
  callback(this.element.ownerNode.innerHTML);
};

CssResource._getAllStyles = function() {
  var resources = [];
  if (doc == null) {
    return resources;
  }

  Array.prototype.forEach.call(doc.styleSheets, function(domSheet) {
    CssResource._getStyle(domSheet, resources);
  });

  dedupe(resources, function(clones) {
    for (var i = 0; i < clones.length; i++) {
      clones[i].name = clones[i].name + '-' + i;
    }
  });

  return resources;
};

CssResource._getStyle = function(domSheet, resources) {
  var resource = ResourceCache.get(domSheet);
  if (!resource) {
    resource = new CssResource(domSheet);
    ResourceCache.add(domSheet, resource);
  }
  resources.push(resource);

  // Look for imported stylesheets
  try {
    Array.prototype.forEach.call(domSheet.cssRules, function(domRule) {
      if (domRule.type == CSSRule.IMPORT_RULE && domRule.styleSheet) {
        CssResource._getStyle(domRule.styleSheet, resources);
      }
    }, this);
  }
  catch (ex) {
    // For system stylesheets
  }
};

/**
 * A ScriptResource provides an implementation of Resource that works for
 * [script] elements (both with a src attribute, and used directly).
 */
function ScriptResource(scriptNode) {
  this.name = scriptNode.src;
  if (!this.name) {
    this.name = scriptNode.id ?
            'script#' + scriptNode.id :
            'inline-script';
  }

  this.inline = (scriptNode.src === '' || scriptNode.src == null);
  this.type = Resource.TYPE_SCRIPT;
  this.element = scriptNode;
}

ScriptResource.prototype = Object.create(Resource.prototype);

ScriptResource.prototype.loadContents = function(callback) {
  if (this.inline) {
    callback(this.element.innerHTML);
  }
  else {
    // It would be good if there was a better way to get the script source
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== xhr.DONE) {
        return;
      }
      callback(xhr.responseText);
    };
    xhr.open('GET', this.element.src, true);
    xhr.send();
  }
};

ScriptResource._getAllScripts = function() {
  if (doc == null) {
    return [];
  }

  var scriptNodes = doc.querySelectorAll('script');
  var resources = Array.prototype.map.call(scriptNodes, function(scriptNode) {
    var resource = ResourceCache.get(scriptNode);
    if (!resource) {
      resource = new ScriptResource(scriptNode);
      ResourceCache.add(scriptNode, resource);
    }
    return resource;
  });

  dedupe(resources, function(clones) {
    for (var i = 0; i < clones.length; i++) {
      clones[i].name = clones[i].name + '-' + i;
    }
  });

  return resources;
};

/**
 * Find resources with the same name, and call onDupe to change the names
 */
function dedupe(resources, onDupe) {
  // first create a map of name->[array of resources with same name]
  var names = {};
  resources.forEach(function(scriptResource) {
    if (names[scriptResource.name] == null) {
      names[scriptResource.name] = [];
    }
    names[scriptResource.name].push(scriptResource);
  });

  // Call the de-dupe function for each set of dupes
  Object.keys(names).forEach(function(name) {
    var clones = names[name];
    if (clones.length > 1) {
      onDupe(clones);
    }
  });
}

/**
 * Use the Resource implementations to create a type based on SelectionType
 */
function ResourceType(typeSpec) {
  this.include = typeSpec.include;
  if (this.include !== Resource.TYPE_SCRIPT &&
      this.include !== Resource.TYPE_CSS &&
      this.include != null) {
    throw new Error('invalid include property: ' + this.include);
  }
}

ResourceType.prototype = Object.create(SelectionType.prototype);

/**
 * There are several ways to get selection data. This unifies them into one
 * single function.
 * @return A map of names to values.
 */
ResourceType.prototype.getLookup = function() {
  var resources = [];
  if (this.include !== Resource.TYPE_SCRIPT) {
    Array.prototype.push.apply(resources, CssResource._getAllStyles());
  }
  if (this.include !== Resource.TYPE_CSS) {
    Array.prototype.push.apply(resources, ScriptResource._getAllScripts());
  }

  return resources.map(function(resource) {
    return { name: resource.name, value: resource };
  });
};

ResourceType.prototype.name = 'resource';


/**
 * A quick cache of resources against nodes
 * TODO: Potential memory leak when the target document has css or script
 * resources repeatedly added and removed. Solution might be to use a weak
 * hash map or some such.
 */
var ResourceCache = {
  _cached: [],

  /**
   * Do we already have a resource that was created for the given node
   */
  get: function(node) {
    for (var i = 0; i < ResourceCache._cached.length; i++) {
      if (ResourceCache._cached[i].node === node) {
        return ResourceCache._cached[i].resource;
      }
    }
    return null;
  },

  /**
   * Add a resource for a given node
   */
  add: function(node, resource) {
    ResourceCache._cached.push({ node: node, resource: resource });
  },

  /**
   * Drop all cache entries. Helpful to prevent memory leaks
   */
  clear: function() {
    ResourceCache._cached = [];
  }
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/types/setting', ['require', 'exports', 'module' , 'gcli/settings', 'gcli/types', 'gcli/types/selection', 'gcli/types/basic'], function(require, exports, module) {


var settings = require('gcli/settings');
var types = require('gcli/types');
var SelectionType = require('gcli/types/selection').SelectionType;
var DeferredType = require('gcli/types/basic').DeferredType;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(SettingType);
  types.registerType(SettingValueType);
};

exports.shutdown = function() {
  types.unregisterType(SettingType);
  types.unregisterType(SettingValueType);
};

/**
 * This is a whole new level of nasty. 'setting' and 'settingValue' are a pair
 * for obvious reasons. settingValue is a deferred type - it defers to the type
 * of the setting, but how do we implement the defer function - how does it
 * work out its paired setting?
 * In another parallel universe we pass the requisition to all the parse
 * methods so we can extract the args in SettingValueType.parse, however that
 * seems like a lot of churn for a simple way to connect 2 things. So we're
 * hacking. SettingType tries to keep 'lastSetting' up to date.
 */
var lastSetting = null;

/**
 * A type for selecting a known setting
 */
function SettingType(typeSpec) {
  settings.onChange.add(function(ev) {
    this.clearCache();
  }, this);
}

SettingType.prototype = new SelectionType({ cacheable: true });

SettingType.prototype.lookup = function() {
  return settings.getAll().map(function(setting) {
    return { name: setting.name, value: setting };
  });
};

SettingType.prototype.noMatch = function() {
  lastSetting = null;
};

SettingType.prototype.stringify = function(option) {
  lastSetting = option;
  return SelectionType.prototype.stringify.call(this, option);
};

SettingType.prototype.parse = function(arg) {
  var conversion = SelectionType.prototype.parse.call(this, arg);
  lastSetting = conversion.value;
  return conversion;
};

SettingType.prototype.name = 'setting';


/**
 * A type for entering the value of a known setting
 */
function SettingValueType(typeSpec) {
}

SettingValueType.prototype = Object.create(DeferredType.prototype);

SettingValueType.prototype.defer = function() {
  if (lastSetting != null) {
    return lastSetting.type;
  }
  else {
    return types.getType('blank');
  }
};

SettingValueType.prototype.name = 'settingValue';


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/settings', ['require', 'exports', 'module' , 'gcli/util', 'gcli/types'], function(require, exports, module) {


var util = require('gcli/util');
var types = require('gcli/types');


/**
 * Where we store the settings that we've created
 */
var settings = {};

/**
 * Where the values for the settings are stored while in use.
 */
var settingValues = {};

/**
 * Where the values for the settings are persisted for next use.
 */
var settingStorage;

/**
 * Allow a system to setup a different set of defaults from what GCLI provides
 */
exports.setDefaults = function(newValues) {
  Object.keys(newValues).forEach(function(name) {
    if (settingValues[name] === undefined) {
      settingValues[name] = newValues[name];
    }
  });
};

/**
 * Initialize the settingValues store from localStorage
 */
exports.startup = function() {
  settingStorage = new LocalSettingStorage();
  settingStorage.load(settingValues);
};

exports.shutdown = function() {
};

/**
 * 'static' function to get an array containing all known Settings
 */
exports.getAll = function(filter) {
  var all = [];
  Object.keys(settings).forEach(function(name) {
    if (filter == null || name.indexOf(filter) !== -1) {
      all.push(settings[name]);
    }
  }.bind(this));
  all.sort(function(s1, s2) {
    return s1.name.localeCompare(s2.name);
  }.bind(this));
  return all;
};

/**
 * Add a new setting
 * @return The new Setting object
 */
exports.addSetting = function(prefSpec) {
  var type = types.getType(prefSpec.type);
  var setting = new Setting(prefSpec.name, type, prefSpec.description,
                            prefSpec.defaultValue);
  settings[setting.name] = setting;
  exports.onChange({ added: setting.name });
  return setting;
};

/**
 * Getter for an existing setting. Generally use of this function should be
 * avoided. Systems that define a setting should export it if they wish it to
 * be available to the outside, or not otherwise. Use of this function breaks
 * that boundary and also hides dependencies. Acceptable uses include testing
 * and embedded uses of GCLI that pre-define all settings (e.g. Firefox)
 * @param name The name of the setting to fetch
 * @return The found Setting object, or undefined if the setting was not found
 */
exports.getSetting = function(name) {
  return settings[name];
};

/**
 * Remove a setting
 */
exports.removeSetting = function(nameOrSpec) {
  var name = typeof nameOrPrefSpec === 'string' ? nameOrSpec : nameOrSpec.name;
  delete settings[name];
  exports.onChange({ removed: name });
};

/**
 * Event for use to detect when the list of settings changes
 */
exports.onChange = util.createEvent('Settings.onChange');

/**
 * Implement the load() and save() functions to write a JSON string blob to
 * localStorage
 */
function LocalSettingStorage() {
}

LocalSettingStorage.prototype.load = function(values) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  var gcliSettings = localStorage.getItem('gcli-settings');
  if (gcliSettings != null) {
    var parsed = JSON.parse(gcliSettings);
    Object.keys(parsed).forEach(function(name) {
      values[name] = parsed[name];
    });
  }
};

LocalSettingStorage.prototype.save = function(values) {
  if (typeof localStorage !== 'undefined') {
    var json = JSON.stringify(values);
    localStorage.setItem('gcli-settings', json);
  }
};

exports.LocalSettingStorage = LocalSettingStorage;


/**
 * A class to wrap up the properties of a Setting.
 * @see toolkit/components/viewconfig/content/config.js
 */
function Setting(name, type, description, defaultValue) {
  this.name = name;
  this.type = type;
  this.description = description;
  this._defaultValue = defaultValue;

  this.onChange = util.createEvent('Setting.onChange');
  this.setDefault();
}

/**
 * Reset this setting to it's initial default value
 */
Setting.prototype.setDefault = function() {
  this.value = this._defaultValue;
};

/**
 * All settings 'value's are saved in the settingValues object
 */
Object.defineProperty(Setting.prototype, 'value', {
  get: function() {
    return settingValues[this.name];
  },

  set: function(value) {
    settingValues[this.name] = value;
    settingStorage.save(settingValues);
    this.onChange({ setting: this, value: value });
  },

  enumerable: true
});


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/cli', ['require', 'exports', 'module' , 'gcli/util', 'gcli/ui/view', 'gcli/l10n', 'gcli/canon', 'gcli/promise', 'gcli/types', 'gcli/types/basic', 'gcli/argument'], function(require, exports, module) {


var util = require('gcli/util');
var view = require('gcli/ui/view');
var l10n = require('gcli/l10n');

var canon = require('gcli/canon');
var Promise = require('gcli/promise').Promise;

var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var ArrayType = require('gcli/types/basic').ArrayType;
var StringType = require('gcli/types/basic').StringType;
var BooleanType = require('gcli/types/basic').BooleanType;
var NumberType = require('gcli/types/basic').NumberType;

var Argument = require('gcli/argument').Argument;
var ArrayArgument = require('gcli/argument').ArrayArgument;
var NamedArgument = require('gcli/argument').NamedArgument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var MergedArgument = require('gcli/argument').MergedArgument;
var ScriptArgument = require('gcli/argument').ScriptArgument;

var evalCommand;

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  evalCommand = canon.addCommand(evalCommandSpec);
};

exports.shutdown = function() {
  canon.removeCommand(evalCommandSpec.name);
  evalCommand = undefined;
};


/**
 * Assignment is a link between a parameter and the data for that parameter.
 * The data for the parameter is available as in the preferred type and as
 * an Argument for the CLI.
 * <p>We also record validity information where applicable.
 * <p>For values, null and undefined have distinct definitions. null means
 * that a value has been provided, undefined means that it has not.
 * Thus, null is a valid default value, and common because it identifies an
 * parameter that is optional. undefined means there is no value from
 * the command line.
 *
 * <h2>Events<h2>
 * Assignment publishes the following event:<ul>
 * <li>onAssignmentChange: Either the value or the text has changed. It is
 * likely that any UI component displaying this argument will need to be
 * updated.
 * The event object looks like:
 * <tt>{ assignment: ..., conversion: ..., oldConversion: ... }</tt>
 * @constructor
 */
function Assignment(param, paramIndex) {
  // The parameter that we are assigning to
  this.param = param;

  this.conversion = undefined;

  // The index of this parameter in the parent Requisition. paramIndex === -1
  // is the command assignment although this should not be relied upon, it is
  // better to test param instanceof CommandAssignment
  this.paramIndex = paramIndex;

  this.onAssignmentChange = util.createEvent('Assignment.onAssignmentChange');

  this.setBlank();
}

/**
 * Easy accessor for conversion.arg.
 * This is a read-only property because writes to arg should be done through
 * the 'conversion' property.
 */
Object.defineProperty(Assignment.prototype, 'arg', {
  get: function() {
    return this.conversion.arg;
  },
  enumerable: true
});

/**
 * Easy accessor for conversion.value.
 * This is a read-only property because writes to value should be done through
 * the 'conversion' property.
 */
Object.defineProperty(Assignment.prototype, 'value', {
  get: function() {
    return this.conversion.value;
  },
  enumerable: true
});

/**
 * Easy (and safe) accessor for conversion.message
 */
Assignment.prototype.getMessage = function() {
  return this.conversion.message ? this.conversion.message : '';
};

/**
 * Easy (and safe) accessor for conversion.getPredictions()
 * @return An array of objects with name and value elements. For example:
 * [ { name:'bestmatch', value:foo1 }, { name:'next', value:foo2 }, ... ]
 */
Assignment.prototype.getPredictions = function() {
  return this.conversion.getPredictions();
};

/**
 * Accessor for a prediction by index.
 * This is useful above <tt>getPredictions()[index]</tt> because it normalizes
 * index to be within the bounds of the predictions, which means that the UI
 * can maintain an index of which prediction to choose without caring how many
 * predictions there are.
 * @param index The index of the prediction to choose
 */
Assignment.prototype.getPredictionAt = function(index) {
  if (index == null) {
    index = 0;
  }

  if (this.isInName()) {
    return undefined;
  }

  var predictions = this.getPredictions();
  if (predictions.length === 0) {
    return undefined;
  }

  index = index % predictions.length;
  if (index < 0) {
    index = predictions.length + index;
  }
  return predictions[index];
};

/**
 * Some places want to take special action if we are in the name part of a
 * named argument (i.e. the '--foo' bit).
 * Currently this does not take actual cursor position into account, it just
 * assumes that the cursor is at the end. In the future we will probably want
 * to take this into account.
 */
Assignment.prototype.isInName = function() {
  return this.conversion.arg.type === 'NamedArgument' &&
         this.conversion.arg.prefix.slice(-1) !== ' ';
};

/**
 * Report on the status of the last parse() conversion.
 * We force mutations to happen through this method rather than have
 * setValue and setArgument functions to help maintain integrity when we
 * have ArrayArguments and don't want to get confused. This way assignments
 * are just containers for a conversion rather than things that store
 * a connection between an arg/value.
 * @see types.Conversion
 */
Assignment.prototype.setConversion = function(conversion) {
  var oldConversion = this.conversion;

  this.conversion = conversion;
  this.conversion.assign(this);

  if (this.conversion.equals(oldConversion)) {
    return;
  }

  this.onAssignmentChange({
    assignment: this,
    conversion: this.conversion,
    oldConversion: oldConversion
  });
};

/**
 * Setup an empty value for the conversion by parsing an empty argument.
 */
Assignment.prototype.setBlank = function() {
  this.setConversion(this.param.type.getBlank());
};

/**
 * Make sure that there is some content for this argument by using an
 * Argument of '' if needed.
 */
Assignment.prototype.ensureVisibleArgument = function() {
  // It isn't clear if we should be sending events from this method.
  // It should only be called when structural changes are happening in which
  // case we're going to ignore the event anyway. But on the other hand
  // perhaps this function shouldn't need to know how it is used, and should
  // do the inefficient thing.
  if (this.conversion.arg.type !== 'BlankArgument') {
    return false;
  }

  var arg = this.conversion.arg.beget({
    text: '',
    prefixSpace: this.param instanceof CommandAssignment
  });
  this.conversion = this.param.type.parse(arg);
  this.conversion.assign(this);

  return true;
};

/**
 * Work out what the status of the current conversion is which involves looking
 * not only at the conversion, but also checking if data has been provided
 * where it should.
 * @param arg For assignments with multiple args (e.g. array assignments) we
 * can narrow the search for status to a single argument.
 */
Assignment.prototype.getStatus = function(arg) {
  if (this.param.isDataRequired && !this.conversion.isDataProvided()) {
    return Status.INCOMPLETE;
  }

  // Selection/Boolean types with a defined range of values will say that
  // '' is INCOMPLETE, but the parameter may be optional, so we don't ask
  // if the user doesn't need to enter something and hasn't done so.
  if (!this.param.isDataRequired && this.arg.type === 'BlankArgument') {
    return Status.VALID;
  }

  return this.conversion.getStatus(arg);
};

/**
 * Helper when we're rebuilding command lines.
 */
Assignment.prototype.toString = function() {
  return this.conversion.toString();
};

/**
 * For test/debug use only. The output from this function is subject to wanton
 * random change without notice, and should not be relied upon to even exist
 * at some later date.
 */
Object.defineProperty(Assignment.prototype, '_summaryJson', {
  get: function() {
    return {
      param: this.param.name + '/' + this.param.type.name,
      defaultValue: this.param.defaultValue,
      arg: this.conversion.arg._summaryJson,
      value: this.value,
      message: this.getMessage(),
      status: this.getStatus().toString(),
      predictionCount: this.getPredictions().length
    };
  },
  enumerable: true
});

exports.Assignment = Assignment;


/**
 * How to dynamically execute JavaScript code
 */
var customEval = eval;

/**
 * Setup a function to be called in place of 'eval', generally for security
 * reasons
 */
exports.setEvalFunction = function(newCustomEval) {
  customEval = newCustomEval;
};

/**
 * Remove the binding done by setEvalFunction().
 * We purposely set customEval to undefined rather than to 'eval' because there
 * is an implication of setEvalFunction that we're in a security sensitive
 * situation. What if we can trick GCLI into calling unsetEvalFunction() at the
 * wrong time?
 * So to properly undo the effects of setEvalFunction(), you need to call
 * setEvalFunction(eval) rather than unsetEvalFunction(), however the latter is
 * preferred in most cases.
 */
exports.unsetEvalFunction = function() {
  customEval = undefined;
};

/**
 * 'eval' command
 */
var evalCommandSpec = {
  name: '{',
  params: [
    {
      name: 'javascript',
      type: 'javascript',
      description: ''
    }
  ],
  hidden: true,
  returnType: 'object',
  description: { key: 'cliEvalJavascript' },
  exec: function(args, context) {
    return customEval(args.javascript);
  },
  evalRegexp: /^\s*{\s*/
};


/**
 * This is a special assignment to reflect the command itself.
 */
function CommandAssignment() {
  var commandParamMetadata = { name: '__command', type: 'command' };
  // This is a hack so that rather than reply with a generic description of the
  // command assignment, we reply with the description of the assigned command,
  // (using a generic term if there is no assigned command)
  var self = this;
  Object.defineProperty(commandParamMetadata, 'description', {
    get: function() {
      var value = self.value;
      return value && value.description ?
          value.description :
          'The command to execute';
    },
    enumerable: true
  });
  this.param = new canon.Parameter(commandParamMetadata);
  this.paramIndex = -1;
  this.onAssignmentChange = util.createEvent('CommandAssignment.onAssignmentChange');

  this.setBlank();
}

CommandAssignment.prototype = Object.create(Assignment.prototype);

CommandAssignment.prototype.getStatus = function(arg) {
  return Status.combine(
    Assignment.prototype.getStatus.call(this, arg),
    this.conversion.value && this.conversion.value.exec ?
            Status.VALID : Status.INCOMPLETE
  );
};

exports.CommandAssignment = CommandAssignment;


/**
 * Special assignment used when ignoring parameters that don't have a home
 */
function UnassignedAssignment(requisition, arg) {
  this.param = new canon.Parameter({
    name: '__unassigned',
    description: l10n.lookup('cliOptions'),
    type: {
      name: 'param',
      requisition: requisition,
      isIncompleteName: (arg.text.charAt(0) === '-')
    },
  });
  this.paramIndex = -1;
  this.onAssignmentChange = util.createEvent('UnassignedAssignment.onAssignmentChange');

  this.conversion = this.param.type.parse(arg);
  this.conversion.assign(this);
}

UnassignedAssignment.prototype = Object.create(Assignment.prototype);

UnassignedAssignment.prototype.getStatus = function(arg) {
  return this.conversion.getStatus();
};


/**
 * A Requisition collects the information needed to execute a command.
 *
 * (For a definition of the term, see http://en.wikipedia.org/wiki/Requisition)
 * This term is used because carries the notion of a work-flow, or process to
 * getting the information to execute a command correct.
 * There is little point in a requisition for parameter-less commands because
 * there is no information to collect. A Requisition is a collection of
 * assignments of values to parameters, each handled by an instance of
 * Assignment.
 *
 * <h2>Events<h2>
 * <p>Requisition publishes the following events:
 * <ul>
 * <li>onAssignmentChange: This is a forward of the onAssignmentChange event on
 * Assignment. It is fired when any assignment (except the commandAssignment)
 * changes.
 * <li>onTextChange: The text to be mirrored in a command line has changed.
 * </ul>
 *
 * @param environment An optional opaque object passed to commands in the
 * Execution Context.
 * @param doc A DOM Document passed to commands using the Execution Context in
 * order to allow creation of DOM nodes. If missing Requisition will use the
 * global 'document'.
 * @constructor
 */
function Requisition(environment, doc) {
  this.environment = environment;
  this.document = doc;
  if (this.document == null) {
    try {
      this.document = document;
    }
    catch (ex) {
      // Ignore
    }
  }

  // The command that we are about to execute.
  // @see setCommandConversion()
  this.commandAssignment = new CommandAssignment();

  // The object that stores of Assignment objects that we are filling out.
  // The Assignment objects are stored under their param.name for named
  // lookup. Note: We make use of the property of Javascript objects that
  // they are not just hashmaps, but linked-list hashmaps which iterate in
  // insertion order.
  // _assignments excludes the commandAssignment.
  this._assignments = {};

  // The count of assignments. Excludes the commandAssignment
  this.assignmentCount = 0;

  // Used to store cli arguments in the order entered on the cli
  this._args = [];

  // Used to store cli arguments that were not assigned to parameters
  this._unassigned = [];

  // Temporarily set this to true to prevent _assignmentChanged resetting
  // argument positions
  this._structuralChangeInProgress = false;

  this.commandAssignment.onAssignmentChange.add(this._commandAssignmentChanged, this);
  this.commandAssignment.onAssignmentChange.add(this._assignmentChanged, this);

  this.commandOutputManager = canon.commandOutputManager;

  this.onAssignmentChange = util.createEvent('Requisition.onAssignmentChange');
  this.onTextChange = util.createEvent('Requisition.onTextChange');
}

/**
 * Avoid memory leaks
 */
Requisition.prototype.destroy = function() {
  this.commandAssignment.onAssignmentChange.remove(this._commandAssignmentChanged, this);
  this.commandAssignment.onAssignmentChange.remove(this._assignmentChanged, this);

  delete this.document;
  delete this.environment;
};

/**
 * When any assignment changes, we might need to update the _args array to
 * match and inform people of changes to the typed input text.
 */
Requisition.prototype._assignmentChanged = function(ev) {
  // Don't report an event if the value is unchanged
  if (ev.oldConversion != null &&
      ev.conversion.valueEquals(ev.oldConversion)) {
    return;
  }

  if (this._structuralChangeInProgress) {
    return;
  }

  this.onAssignmentChange(ev);

  // Both for argument position and the onTextChange event, we only care
  // about changes to the argument.
  if (ev.conversion.argEquals(ev.oldConversion)) {
    return;
  }

  this.onTextChange();
};

/**
 * When the command changes, we need to keep a bunch of stuff in sync
 */
Requisition.prototype._commandAssignmentChanged = function(ev) {
  // Assignments fire AssignmentChange events on any change, including minor
  // things like whitespace change in arg prefix, so we ignore anything but
  // an actual value change
  if (ev.conversion.valueEquals(ev.oldConversion)) {
    return;
  }

  this._assignments = {};

  var command = this.commandAssignment.value;
  if (command) {
    for (var i = 0; i < command.params.length; i++) {
      var param = command.params[i];
      var assignment = new Assignment(param, i);
      assignment.onAssignmentChange.add(this._assignmentChanged, this);
      this._assignments[param.name] = assignment;
    }
  }
  this.assignmentCount = Object.keys(this._assignments).length;
};

/**
 * Assignments have an order, so we need to store them in an array.
 * But we also need named access ...
 * @return The found assignment, or undefined, if no match was found
 */
Requisition.prototype.getAssignment = function(nameOrNumber) {
  var name = (typeof nameOrNumber === 'string') ?
    nameOrNumber :
    Object.keys(this._assignments)[nameOrNumber];
  return this._assignments[name] || undefined;
};

/**
 * There are a few places where we need to know what the 'next thing' is. What
 * is the user going to be filling out next (assuming they don't enter a named
 * argument). The next argument is the first in line that is both blank, and
 * that can be filled in positionally.
 * @return The next assignment to be used, or null if all the positional
 * parameters have values.
 */
Requisition.prototype._getFirstBlankPositionalAssignment = function() {
  var reply = null;
  Object.keys(this._assignments).some(function(name) {
    var assignment = this.getAssignment(name);
    if (assignment.arg.type === 'BlankArgument' &&
            assignment.param.isPositionalAllowed) {
      reply = assignment;
      return true; // i.e. break
    }
    return false;
  }, this);
  return reply;
};

/**
 * Where parameter name == assignment names - they are the same
 */
Requisition.prototype.getParameterNames = function() {
  return Object.keys(this._assignments);
};

/**
 * A *shallow* clone of the assignments.
 * This is useful for systems that wish to go over all the assignments
 * finding values one way or another and wish to trim an array as they go.
 */
Requisition.prototype.cloneAssignments = function() {
  return Object.keys(this._assignments).map(function(name) {
    return this._assignments[name];
  }, this);
};

/**
 * The overall status is the most severe status.
 * There is no such thing as an INCOMPLETE overall status because the
 * definition of INCOMPLETE takes into account the cursor position to say 'this
 * isn't quite ERROR because the user can fix it by typing', however overall,
 * this is still an error status.
 */
Requisition.prototype.getStatus = function() {
  var status = Status.VALID;
  if (this._unassigned.length !== 0) {
    var isAllIncomplete = true;
    this._unassigned.forEach(function(assignment) {
      if (!assignment.param.type.isIncompleteName) {
        isAllIncomplete = false;
      }
    });
    status = isAllIncomplete ? Status.INCOMPLETE : Status.ERROR;
  }

  this.getAssignments(true).forEach(function(assignment) {
    var assignStatus = assignment.getStatus();
    if (assignStatus > status) {
      status = assignStatus;
    }
  }, this);
  if (status === Status.INCOMPLETE) {
    status = Status.ERROR;
  }
  return status;
};

/**
 * Extract the names and values of all the assignments, and return as
 * an object.
 */
Requisition.prototype.getArgsObject = function() {
  var args = {};
  this.getAssignments().forEach(function(assignment) {
    args[assignment.param.name] = assignment.conversion.isDataProvided() ?
            assignment.value :
            assignment.param.defaultValue;
  }, this);
  return args;
};

/**
 * Access the arguments as an array.
 * @param includeCommand By default only the parameter arguments are
 * returned unless (includeCommand === true), in which case the list is
 * prepended with commandAssignment.arg
 */
Requisition.prototype.getAssignments = function(includeCommand) {
  var assignments = [];
  if (includeCommand === true) {
    assignments.push(this.commandAssignment);
  }
  Object.keys(this._assignments).forEach(function(name) {
    assignments.push(this.getAssignment(name));
  }, this);
  return assignments;
};

/**
 * Alter the given assignment using the given arg. This function is better than
 * calling assignment.setConversion(assignment.param.type.parse(arg)) because
 * it adjusts the args in this requisition to keep things up to date
 */
Requisition.prototype.setAssignment = function(assignment, arg) {
  var originalArgs = assignment.arg.getArgs();
  var conversion = assignment.param.type.parse(arg);
  assignment.setConversion(conversion);

  var replacementArgs = arg.getArgs();
  var maxLen = Math.max(originalArgs.length, replacementArgs.length);
  for (var i = 0; i < maxLen; i++) {
    // If there are no more original args, or if the original arg was blank
    // (i.e. not typed by the user), we'll just need to add at the end
    if (i >= originalArgs.length || originalArgs[i].type === 'BlankArgument') {
      this._args.push(replacementArgs[i]);
      continue;
    }

    var index = this._args.indexOf(originalArgs[i]);
    if (index === -1) {
      console.error('Couldn\'t find ', originalArgs[i], ' in ', this._args);
      throw new Error('Couldn\'t find ' + originalArgs[i]);
    }

    // If there are no more replacement args, we just remove the original args
    // Otherwise swap original args and replacements
    if (i >= replacementArgs.length) {
      this._args.splice(index, 1);
    }
    else {
      this._args[index] = replacementArgs[i];
    }
  }
};

/**
 * Reset all the assignments to their default values
 */
Requisition.prototype.setBlankArguments = function() {
  this.getAssignments().forEach(function(assignment) {
    assignment.setBlank();
  }, this);
};

/**
 * Complete the argument at <tt>cursor</tt>.
 * Basically the same as:
 *   assignment = getAssignmentAt(cursor);
 *   assignment.value = assignment.conversion.predictions[0];
 * Except it's done safely, and with particular care to where we place the
 * space, which is complex, and annoying if we get it wrong.
 * @param cursor The cursor configuration. Should have start and end properties
 * which should be set to start and end of the selection.
 * @param predictionChoice The index of the prediction that we should choose.
 * This number is not bounded by the size of the prediction array, we take the
 * modulus to get it within bounds
 */
Requisition.prototype.complete = function(cursor, predictionChoice) {
  var assignment = this.getAssignmentAt(cursor.start);

  this.onTextChange.holdFire();

  var prediction = assignment.getPredictionAt(predictionChoice);
  if (prediction == null) {
    // No predictions generally means we shouldn't change anything on TAB, but
    // TAB has the connotation of 'next thing' and when we're at the end of
    // a thing that implies that we should add a space. i.e.
    // 'help<TAB>' -> 'help '
    // But we should only do this if the thing that we're 'completing' is valid
    // and doesn't already end in a space.
    if (assignment.arg.suffix.slice(-1) !== ' ' &&
            assignment.getStatus() === Status.VALID) {
      this._addSpace(assignment);
    }

    // Also add a space if we are in the name part of an assignment, however
    // this time we don't want the 'push the space to the next assignment'
    // logic, so we don't use addSpace
    if (assignment.isInName()) {
      var newArg = assignment.conversion.arg.beget({ prefixPostSpace: true });
      this.setAssignment(assignment, newArg);
    }
  }
  else {
    // Mutate this argument to hold the completion
    var arg = assignment.arg.beget({ text: prediction.name });
    this.setAssignment(assignment, arg);

    if (!prediction.incomplete) {
      // The prediction is complete, add a space to let the user move-on
      this._addSpace(assignment);

      // Bug 779443 - Remove or explain the reparse
      if (assignment instanceof UnassignedAssignment) {
        this.update(this.toString());
      }
    }
  }

  this.onTextChange();
  this.onTextChange.resumeFire();
};

/**
 * Pressing TAB sometimes requires that we add a space to denote that we're on
 * to the 'next thing'.
 * @param assignment The assignment to which to append the space
 */
Requisition.prototype._addSpace = function(assignment) {
  var arg = assignment.conversion.arg.beget({ suffixSpace: true });
  if (arg !== assignment.conversion.arg) {
    this.setAssignment(assignment, arg);
  }
};

/**
 * Replace the current value with the lower value if such a concept exists.
 */
Requisition.prototype.decrement = function(assignment) {
  var replacement = assignment.param.type.decrement(assignment.conversion.value);
  if (replacement != null) {
    var str = assignment.param.type.stringify(replacement);
    var arg = assignment.conversion.arg.beget({ text: str });
    this.setAssignment(assignment, arg);
  }
};

/**
 * Replace the current value with the higher value if such a concept exists.
 */
Requisition.prototype.increment = function(assignment) {
  var replacement = assignment.param.type.increment(assignment.conversion.value);
  if (replacement != null) {
    var str = assignment.param.type.stringify(replacement);
    var arg = assignment.conversion.arg.beget({ text: str });
    this.setAssignment(assignment, arg);
  }
};

/**
 * Extract a canonical version of the input
 */
Requisition.prototype.toCanonicalString = function() {
  var line = [];

  var cmd = this.commandAssignment.value ?
      this.commandAssignment.value.name :
      this.commandAssignment.arg.text;
  line.push(cmd);

  Object.keys(this._assignments).forEach(function(name) {
    var assignment = this._assignments[name];
    var type = assignment.param.type;
    // Bug 664377: This will cause problems if there is a non-default value
    // after a default value. Also we need to decide when to use
    // named parameters in place of positional params. Both can wait.
    if (assignment.value !== assignment.param.defaultValue) {
      line.push(' ');
      line.push(type.stringify(assignment.value));
    }
  }, this);

  // Canonically, if we've opened with a { then we should have a } to close
  if (cmd === '{') {
    if (this.getAssignment(0).arg.suffix.indexOf('}') === -1) {
      line.push(' }');
    }
  }

  return line.join('');
};

/**
 * Input trace gives us an array of Argument tracing objects, one for each
 * character in the typed input, from which we can derive information about how
 * to display this typed input. It's a bit like toString on steroids.
 * <p>
 * The returned object has the following members:<ul>
 * <li>char: The character to which this arg trace refers.
 * <li>arg: The Argument to which this character is assigned.
 * <li>part: One of ['prefix'|'text'|suffix'] - how was this char understood
 * </ul>
 * <p>
 * The Argument objects are as output from #_tokenize() rather than as applied
 * to Assignments by #_assign() (i.e. they are not instances of NamedArgument,
 * ArrayArgument, etc).
 * <p>
 * To get at the arguments applied to the assignments simply call
 * <tt>arg.assignment.arg</tt>. If <tt>arg.assignment.arg !== arg</tt> then
 * the arg applied to the assignment will contain the original arg.
 * See #_assign() for details.
 */
Requisition.prototype.createInputArgTrace = function() {
  if (!this._args) {
    throw new Error('createInputMap requires a command line. See source.');
    // If this is a problem then we can fake command line input using
    // something like the code in #toCanonicalString().
  }

  var args = [];
  var i;
  this._args.forEach(function(arg) {
    for (i = 0; i < arg.prefix.length; i++) {
      args.push({ arg: arg, char: arg.prefix[i], part: 'prefix' });
    }
    for (i = 0; i < arg.text.length; i++) {
      args.push({ arg: arg, char: arg.text[i], part: 'text' });
    }
    for (i = 0; i < arg.suffix.length; i++) {
      args.push({ arg: arg, char: arg.suffix[i], part: 'suffix' });
    }
  });

  return args;
};

/**
 * Reconstitute the input from the args
 */
Requisition.prototype.toString = function() {
  if (this._args) {
    return this._args.map(function(arg) {
      return arg.toString();
    }).join('');
  }

  return this.toCanonicalString();
};

/**
 * If the last character is whitespace then things that we suggest to add to
 * the end don't need a space prefix.
 * While this is quite a niche function, it has 2 benefits:
 * - it's more correct because we can distinguish between final whitespace that
 *   is part of an unclosed string, and parameter separating whitespace.
 * - also it's faster than toString() the whole thing and checking the end char
 * @return true iff the last character is interpreted as parameter separating
 * whitespace
 */
Requisition.prototype.typedEndsWithSeparator = function() {
  // This is not as easy as doing (this.toString().slice(-1) === ' ')
  // See the doc comments above; We're checking for separators, not spaces
  if (this._args) {
    var lastArg = this._args.slice(-1)[0];
    if (lastArg.suffix.slice(-1) === ' ') {
      return true;
    }
    return lastArg.text === '' && lastArg.suffix === ''
        && lastArg.prefix.slice(-1) === ' ';
  }

  return this.toCanonicalString().slice(-1) === ' ';
};

/**
 * Return an array of Status scores so we can create a marked up
 * version of the command line input.
 * @param cursor We only take a status of INCOMPLETE to be INCOMPLETE when the
 * cursor is actually in the argument. Otherwise it's an error.
 * @return Array of objects each containing <tt>status</tt> property and a
 * <tt>string</tt> property containing the characters to which the status
 * applies. Concatenating the strings in order gives the original input.
 */
Requisition.prototype.getInputStatusMarkup = function(cursor) {
  var argTraces = this.createInputArgTrace();
  // Generally the 'argument at the cursor' is the argument before the cursor
  // unless it is before the first char, in which case we take the first.
  cursor = cursor === 0 ? 0 : cursor - 1;
  var cTrace = argTraces[cursor];

  var markup = [];
  for (var i = 0; i < argTraces.length; i++) {
    var argTrace = argTraces[i];
    var arg = argTrace.arg;
    var status = Status.VALID;
    if (argTrace.part === 'text') {
      status = arg.assignment.getStatus(arg);
      // Promote INCOMPLETE to ERROR  ...
      if (status === Status.INCOMPLETE) {
        // If the cursor is in the prefix or suffix of an argument then we
        // don't consider it in the argument for the purposes of preventing
        // the escalation to ERROR. However if this is a NamedArgument, then we
        // allow the suffix (as space between 2 parts of the argument) to be in.
        // We use arg.assignment.arg not arg because we're looking at the arg
        // that got put into the assignment not as returned by tokenize()
        var isNamed = (cTrace.arg.assignment.arg.type === 'NamedArgument');
        var isInside = cTrace.part === 'text' ||
                        (isNamed && cTrace.part === 'suffix');
        if (arg.assignment !== cTrace.arg.assignment || !isInside) {
          // And if we're not in the command
          if (!(arg.assignment instanceof CommandAssignment)) {
            status = Status.ERROR;
          }
        }
      }
    }

    markup.push({ status: status, string: argTrace.char });
  }

  // De-dupe: merge entries where 2 adjacent have same status
  var i = 0;
  while (i < markup.length - 1) {
    if (markup[i].status === markup[i + 1].status) {
      markup[i].string += markup[i + 1].string;
      markup.splice(i + 1, 1);
    }
    else {
      i++;
    }
  }

  return markup;
};

/**
 * Look through the arguments attached to our assignments for the assignment
 * at the given position.
 * @param {number} cursor The cursor position to query
 */
Requisition.prototype.getAssignmentAt = function(cursor) {
  if (!this._args) {
    console.trace();
    throw new Error('Missing args');
  }

  // We short circuit this one because we may have no args, or no args with
  // any size and the alg below only finds arguments with size.
  if (cursor === 0) {
    return this.commandAssignment;
  }

  var assignForPos = [];
  var i, j;
  for (i = 0; i < this._args.length; i++) {
    var arg = this._args[i];
    var assignment = arg.assignment;

    // prefix and text are clearly part of the argument
    for (j = 0; j < arg.prefix.length; j++) {
      assignForPos.push(assignment);
    }
    for (j = 0; j < arg.text.length; j++) {
      assignForPos.push(assignment);
    }

    // suffix is part of the argument only if this is a named parameter,
    // otherwise it looks forwards
    if (arg.assignment.arg.type === 'NamedArgument') {
      // leave the argument as it is
    }
    else if (this._args.length > i + 1) {
      // first to the next argument
      assignment = this._args[i + 1].assignment;
    }
    else {
      // then to the first blank positional parameter, leaving 'as is' if none
      var nextAssignment = this._getFirstBlankPositionalAssignment();
      if (nextAssignment != null) {
        assignment = nextAssignment;
      }
    }

    for (j = 0; j < arg.suffix.length; j++) {
      assignForPos.push(assignment);
    }
  }

  // Possible shortcut, we don't really need to go through all the args
  // to work out the solution to this

  var reply = assignForPos[cursor - 1];

  if (!reply) {
    throw new Error('Missing assignment.' +
        ' cursor=' + cursor + ' text=' + this.toString());
  }

  return reply;
};

/**
 * Entry point for keyboard accelerators or anything else that wants to execute
 * a command. There are 3 ways to call <tt>exec()</tt>:
 * 1. Without any parameters. This assumes that the command to be executed has
 *    already been parsed by the requisition using <tt>update()</tt>.
 * 2. With a string parameter, or an object with a 'typed' property. This is
 *    effectively a shortcut for calling <tt>update(typed); exec();</tt>
 * 3. With input having a 'command' property which is either a command object
 *    (i.e. from canon.getCommand) or a string which can be passed to
 *    canon.getCommand() plus and optional 'args' property which contains the
 *    argument values as passed to command.exec. This method is significantly
 *    faster, and designed for use from keyboard shortcuts.
 * In addition to these properties, the input parameter can contain a 'hidden'
 * property which can be set to true to hide the output from the
 * CommandOutputManager.
 * @param input (optional) The command to execute. See above.
 */
Requisition.prototype.exec = function(input) {
  var command;
  var args;
  var hidden = false;
  if (input && input.hidden) {
    hidden = true;
  }

  if (input) {
    if (typeof input === 'string') {
      this.update(input);
    }
    else if (typeof input.typed === 'string') {
      this.update(input.typed);
    }
    else if (input.command != null) {
      // Fast track by looking up the command directly since passed args
      // means there is no command line to parse.
      command = canon.getCommand(input.command);
      if (!command) {
        console.error('Command not found: ' + input.command);
      }
      args = input.args;
    }
  }

  if (!command) {
    command = this.commandAssignment.value;
    args = this.getArgsObject();
  }

  if (!command) {
    throw new Error('Unknown command');
  }

  // Display JavaScript input without the initial { or closing }
  var typed = this.toString();
  if (evalCommandSpec.evalRegexp.test(typed)) {
    typed = typed.replace(evalCommandSpec.evalRegexp, '');
    // Bug 717763: What if the JavaScript naturally ends with a }?
    typed = typed.replace(/\s*}\s*$/, '');
  }

  var output = new Output({
    command: command,
    args: args,
    typed: typed,
    canonical: this.toCanonicalString(),
    hidden: hidden
  });

  this.commandOutputManager.onOutput({ output: output });

  try {
    var context = exports.createExecutionContext(this);
    var reply = command.exec(args, context);

    if (reply != null && typeof reply.then === 'function') {
      reply.then(
          function(data) { output.complete(data); },
          function(error) { output.error = true; output.complete(error); });

      output.promise = reply;
      // Add progress to our promise and add a handler for it here
      // See bug 659300
    }
    else {
      output.complete(reply);
    }
  }
  catch (ex) {
    console.error(ex);
    output.error = true;
    output.complete(ex);
  }

  this.update('');
  return output;
};

/**
 * Called by the UI when ever the user interacts with a command line input
 * @param typed The contents of the input field
 */
Requisition.prototype.update = function(typed) {
  this._structuralChangeInProgress = true;

  this._args = this._tokenize(typed);
  var args = this._args.slice(0); // i.e. clone
  this._split(args);
  this._assign(args);

  this._structuralChangeInProgress = false;
  this.onTextChange();
};

/**
 * For test/debug use only. The output from this function is subject to wanton
 * random change without notice, and should not be relied upon to even exist
 * at some later date.
 */
Object.defineProperty(Requisition.prototype, '_summaryJson', {
  get: function() {
    var summary = {
      $args: this._args.map(function(arg) {
        return arg._summaryJson;
      }),
      _command: this.commandAssignment._summaryJson,
      _unassigned: this._unassigned.forEach(function(assignment) {
        return assignment._summaryJson;
      })
    };

    Object.keys(this._assignments).forEach(function(name) {
      summary[name] = this.getAssignment(name)._summaryJson;
    }.bind(this));

    return summary;
  },
  enumerable: true
});

/**
 * Requisition._tokenize() is a state machine. These are the states.
 */
var In = {
  /**
   * The last character was ' '.
   * Typing a ' ' character will not change the mode
   * Typing one of '"{ will change mode to SINGLE_Q, DOUBLE_Q or SCRIPT.
   * Anything else goes into SIMPLE mode.
   */
  WHITESPACE: 1,

  /**
   * The last character was part of a parameter.
   * Typing ' ' returns to WHITESPACE mode. Any other character
   * (including '"{} which are otherwise special) does not change the mode.
   */
  SIMPLE: 2,

  /**
   * We're inside single quotes: '
   * Typing ' returns to WHITESPACE mode. Other characters do not change mode.
   */
  SINGLE_Q: 3,

  /**
   * We're inside double quotes: "
   * Typing " returns to WHITESPACE mode. Other characters do not change mode.
   */
  DOUBLE_Q: 4,

  /**
   * We're inside { and }
   * Typing } returns to WHITESPACE mode. Other characters do not change mode.
   * SCRIPT mode is slightly different from other modes in that spaces between
   * the {/} delimiters and the actual input are not considered significant.
   * e.g: " x " is a 3 character string, delimited by double quotes, however
   * { x } is a 1 character JavaScript surrounded by whitespace and {}
   * delimiters.
   * In the short term we assume that the JS routines can make sense of the
   * extra whitespace, however at some stage we may need to move the space into
   * the Argument prefix/suffix.
   * Also we don't attempt to handle nested {}. See bug 678961
   */
  SCRIPT: 5
};

/**
 * Split up the input taking into account ', " and {.
 * We don't consider \t or other classical whitespace characters to split
 * arguments apart. For one thing these characters are hard to type, but also
 * if the user has gone to the trouble of pasting a TAB character into the
 * input field (or whatever it takes), they probably mean it.
 */
Requisition.prototype._tokenize = function(typed) {
  // For blank input, place a dummy empty argument into the list
  if (typed == null || typed.length === 0) {
    return [ new Argument('', '', '') ];
  }

  if (isSimple(typed)) {
    return [ new Argument(typed, '', '') ];
  }

  var mode = In.WHITESPACE;

  // First we un-escape. This list was taken from:
  // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Core_Language_Features#Unicode
  // We are generally converting to their real values except for the strings
  // '\'', '\"', '\ ', '{' and '}' which we are converting to unicode private
  // characters so we can distinguish them from '"', ' ', '{', '}' and ''',
  // which are special. They need swapping back post-split - see unescape2()
  typed = typed
      .replace(/\\\\/g, '\\')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\v/g, '\v')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\ /g, '\uF000')
      .replace(/\\'/g, '\uF001')
      .replace(/\\"/g, '\uF002')
      .replace(/\\{/g, '\uF003')
      .replace(/\\}/g, '\uF004');

  function unescape2(escaped) {
    return escaped
        .replace(/\uF000/g, ' ')
        .replace(/\uF001/g, '\'')
        .replace(/\uF002/g, '"')
        .replace(/\uF003/g, '{')
        .replace(/\uF004/g, '}');
  }

  var i = 0;          // The index of the current character
  var start = 0;      // Where did this section start?
  var prefix = '';    // Stuff that comes before the current argument
  var args = [];      // The array that we're creating
  var blockDepth = 0; // For JS with nested {}

  // This is just a state machine. We're going through the string char by char
  // The 'mode' is one of the 'In' states. As we go, we're adding Arguments
  // to the 'args' array.

  while (true) {
    var c = typed[i];
    var str;
    switch (mode) {
      case In.WHITESPACE:
        if (c === '\'') {
          prefix = typed.substring(start, i + 1);
          mode = In.SINGLE_Q;
          start = i + 1;
        }
        else if (c === '"') {
          prefix = typed.substring(start, i + 1);
          mode = In.DOUBLE_Q;
          start = i + 1;
        }
        else if (c === '{') {
          prefix = typed.substring(start, i + 1);
          mode = In.SCRIPT;
          blockDepth++;
          start = i + 1;
        }
        else if (/ /.test(c)) {
          // Still whitespace, do nothing
        }
        else {
          prefix = typed.substring(start, i);
          mode = In.SIMPLE;
          start = i;
        }
        break;

      case In.SIMPLE:
        // There is an edge case of xx'xx which we are assuming to
        // be a single parameter (and same with ")
        if (c === ' ') {
          str = unescape2(typed.substring(start, i));
          args.push(new Argument(str, prefix, ''));
          mode = In.WHITESPACE;
          start = i;
          prefix = '';
        }
        break;

      case In.SINGLE_Q:
        if (c === '\'') {
          str = unescape2(typed.substring(start, i));
          args.push(new Argument(str, prefix, c));
          mode = In.WHITESPACE;
          start = i + 1;
          prefix = '';
        }
        break;

      case In.DOUBLE_Q:
        if (c === '"') {
          str = unescape2(typed.substring(start, i));
          args.push(new Argument(str, prefix, c));
          mode = In.WHITESPACE;
          start = i + 1;
          prefix = '';
        }
        break;

      case In.SCRIPT:
        if (c === '{') {
          blockDepth++;
        }
        else if (c === '}') {
          blockDepth--;
          if (blockDepth === 0) {
            str = unescape2(typed.substring(start, i));
            args.push(new ScriptArgument(str, prefix, c));
            mode = In.WHITESPACE;
            start = i + 1;
            prefix = '';
          }
        }
        break;
    }

    i++;

    if (i >= typed.length) {
      // There is nothing else to read - tidy up
      if (mode === In.WHITESPACE) {
        if (i !== start) {
          // There's whitespace at the end of the typed string. Add it to the
          // last argument's suffix, creating an empty argument if needed.
          var extra = typed.substring(start, i);
          var lastArg = args[args.length - 1];
          if (!lastArg) {
            args.push(new Argument('', extra, ''));
          }
          else {
            lastArg.suffix += extra;
          }
        }
      }
      else if (mode === In.SCRIPT) {
        str = unescape2(typed.substring(start, i + 1));
        args.push(new ScriptArgument(str, prefix, ''));
      }
      else {
        str = unescape2(typed.substring(start, i + 1));
        args.push(new Argument(str, prefix, ''));
      }
      break;
    }
  }

  return args;
};

/**
 * If the input has no spaces, quotes, braces or escapes,
 * we can take the fast track.
 */
function isSimple(typed) {
   for (var i = 0; i < typed.length; i++) {
     var c = typed.charAt(i);
     if (c === ' ' || c === '"' || c === '\'' ||
         c === '{' || c === '}' || c === '\\') {
       return false;
     }
   }
   return true;
}

/**
 * Looks in the canon for a command extension that matches what has been
 * typed at the command line.
 */
Requisition.prototype._split = function(args) {
  // Handle the special case of the user typing { javascript(); }
  // We use the hidden 'eval' command directly rather than shift()ing one of
  // the parameters, and parse()ing it.
  var conversion;
  if (args[0].type === 'ScriptArgument') {
    // Special case: if the user enters { console.log('foo'); } then we need to
    // use the hidden 'eval' command
    conversion = new Conversion(evalCommand, new ScriptArgument());
    this.commandAssignment.setConversion(conversion);
    return;
  }

  var argsUsed = 1;

  while (argsUsed <= args.length) {
    var arg = (argsUsed === 1) ?
      args[0] :
      new MergedArgument(args, 0, argsUsed);
    conversion = this.commandAssignment.param.type.parse(arg);

    // We only want to carry on if this command is a parent command,
    // which means that there is a commandAssignment, but not one with
    // an exec function.
    if (!conversion.value || conversion.value.exec) {
      break;
    }

    // Previously we needed a way to hide commands depending context.
    // We have not resurrected that feature yet, but if we do we should
    // insert code here to ignore certain commands depending on the
    // context/environment

    argsUsed++;
  }

  this.commandAssignment.setConversion(conversion);

  for (var i = 0; i < argsUsed; i++) {
    args.shift();
  }

  // This could probably be re-written to consume args as we go
};

/**
 * Add all the passed args to the list of unassigned assignments.
 */
Requisition.prototype._addUnassignedArgs = function(args) {
  args.forEach(function(arg) {
    this._unassigned.push(new UnassignedAssignment(this, arg));
  }.bind(this));
};

/**
 * Work out which arguments are applicable to which parameters.
 */
Requisition.prototype._assign = function(args) {
  this._unassigned = [];

  if (!this.commandAssignment.value) {
    this._addUnassignedArgs(args);
    return;
  }

  if (args.length === 0) {
    this.setBlankArguments();
    return;
  }

  // Create an error if the command does not take parameters, but we have
  // been given them ...
  if (this.assignmentCount === 0) {
    this._addUnassignedArgs(args);
    return;
  }

  // Special case: if there is only 1 parameter, and that's of type
  // text, then we put all the params into the first param
  if (this.assignmentCount === 1) {
    var assignment = this.getAssignment(0);
    if (assignment.param.type instanceof StringType) {
      var arg = (args.length === 1) ?
        args[0] :
        new MergedArgument(args);
      var conversion = assignment.param.type.parse(arg);
      assignment.setConversion(conversion);
      return;
    }
  }

  // Positional arguments can still be specified by name, but if they are
  // then we need to ignore them when working them out positionally
  var unassignedParams = this.getParameterNames();

  // We collect the arguments used in arrays here before assigning
  var arrayArgs = {};

  // Extract all the named parameters
  this.getAssignments(false).forEach(function(assignment) {
    // Loop over the arguments
    // Using while rather than loop because we remove args as we go
    var i = 0;
    while (i < args.length) {
      if (assignment.param.isKnownAs(args[i].text)) {
        var arg = args.splice(i, 1)[0];
        unassignedParams = unassignedParams.filter(function(test) {
          return test !== assignment.param.name;
        });

        // boolean parameters don't have values, default to false
        if (assignment.param.type instanceof BooleanType) {
          arg = new TrueNamedArgument(arg);
        }
        else {
          var valueArg = null;
          if (i + 1 <= args.length) {
            valueArg = args.splice(i, 1)[0];
          }
          arg = new NamedArgument(arg, valueArg);
        }

        if (assignment.param.type instanceof ArrayType) {
          var arrayArg = arrayArgs[assignment.param.name];
          if (!arrayArg) {
            arrayArg = new ArrayArgument();
            arrayArgs[assignment.param.name] = arrayArg;
          }
          arrayArg.addArgument(arg);
        }
        else {
          var conversion = assignment.param.type.parse(arg);
          assignment.setConversion(conversion);
        }
      }
      else {
        // Skip this parameter and handle as a positional parameter
        i++;
      }
    }
  }, this);

  // What's left are positional parameters assign in order
  unassignedParams.forEach(function(name) {
    var assignment = this.getAssignment(name);

    // If not set positionally, and we can't set it non-positionally,
    // we have to default it to prevent previous values surviving
    if (!assignment.param.isPositionalAllowed) {
      assignment.setBlank();
      return;
    }

    // If this is a positional array argument, then it swallows the
    // rest of the arguments.
    if (assignment.param.type instanceof ArrayType) {
      var arrayArg = arrayArgs[assignment.param.name];
      if (!arrayArg) {
        arrayArg = new ArrayArgument();
        arrayArgs[assignment.param.name] = arrayArg;
      }
      arrayArg.addArguments(args);
      args = [];
    }
    else {
      if (args.length === 0) {
        assignment.setBlank();
      }
      else {
        var arg = args.splice(0, 1)[0];
        // --foo and -f are named parameters, -4 is a number. So '-' is either
        // the start of a named parameter or a number depending on the context
        var isIncompleteName = assignment.param.type instanceof NumberType ?
            /-[-a-zA-Z_]/.test(arg.text) :
            arg.text.charAt(0) === '-';

        if (isIncompleteName) {
          this._unassigned.push(new UnassignedAssignment(this, arg));
        }
        else {
          var conversion = assignment.param.type.parse(arg);
          assignment.setConversion(conversion);
        }
      }
    }
  }, this);

  // Now we need to assign the array argument (if any)
  Object.keys(arrayArgs).forEach(function(name) {
    var assignment = this.getAssignment(name);
    var conversion = assignment.param.type.parse(arrayArgs[name]);
    assignment.setConversion(conversion);
  }, this);

  // What's left is can't be assigned, but we need to extract
  this._addUnassignedArgs(args);
};

exports.Requisition = Requisition;

/**
 * A simple object to hold information about the output of a command
 */
function Output(options) {
  options = options || {};
  this.command = options.command || '';
  this.args = options.args || {};
  this.typed = options.typed || '';
  this.canonical = options.canonical || '';
  this.hidden = options.hidden === true ? true : false;

  this.data = undefined;
  this.completed = false;
  this.error = false;
  this.start = new Date();

  this.onClose = util.createEvent('Output.onClose');
  this.onChange = util.createEvent('Output.onChange');
}

/**
 * Called when there is data to display
 * @param data
 */
Output.prototype.complete = function(data) {
  this.data = data;

  this.end = new Date();
  this.duration = this.end.getTime() - this.start.getTime();
  this.completed = true;

  this.onChange({ output: this });
};

/**
 * Convert to a DOM element for display.
 * @param element The DOM node to which the data should be written. Existing
 * content of 'element' will be removed before 'outputData' is added.
 */
Output.prototype.toDom = function(element) {
  util.clearElement(element);
  var document = element.ownerDocument;

  var output = this.data;
  if (output == null) {
    return;
  }

  var node;
  if (typeof HTMLElement !== 'undefined' && output instanceof HTMLElement) {
    node = output;
  }
  else if (output.isView) {
    node = output.toDom(document);
  }
  else {
    if (this.command.returnType === 'terminal') {
      if (Array.isArray(output)) {
        node = util.createElement(document, 'div');
        output.forEach(function() {
          var child = util.createElement(document, 'textarea');
          child.classList.add('gcli-row-subterminal');
          child.readOnly = true;

          node.appendChild(child);
        });
      }
      else {
        node = util.createElement(document, 'textarea');
        node.classList.add('gcli-row-terminal');
        node.readOnly = true;
      }
    }
    else {
      node = util.createElement(document, 'p');
    }

    util.setContents(node, output.toString());
  }

  // Make sure that links open in a new window.
  var links = node.querySelectorAll('*[href]');
  for (var i = 0; i < links.length; i++) {
    links[i].setAttribute('target', '_blank');
  }

  element.appendChild(node);
};

/**
 * Convert this object to a string so GCLI can be used in traditional character
 * based terminals.
 */
Output.prototype.toString = function(document) {
  var output = this.data;
  if (output == null) {
    return '';
  }

  if (typeof HTMLElement !== 'undefined' && output instanceof HTMLElement) {
    return output.textContent;
  }

  if (output.isView) {
    return output.toDom(document).textContent;
  }

  return output.toString();
};

exports.Output = Output;

/**
 * Functions and data related to the execution of a command
 */
exports.createExecutionContext = function(requisition) {
  return {
    exec: requisition.exec.bind(requisition),
    update: requisition.update.bind(requisition),
    document: requisition.document,
    environment: requisition.environment,
    createView: view.createView,
    createPromise: function() {
      return new Promise();
    }
  };
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/view', ['require', 'exports', 'module' , 'gcli/util', 'gcli/ui/domtemplate'], function(require, exports, module) {


var util = require('gcli/util');
var domtemplate = require('gcli/ui/domtemplate');


/**
 * We want to avoid commands having to create DOM structures because that's
 * messy and because we're going to need to have command output displayed in
 * different documents. A View is a way to wrap an HTML template (for
 * domtemplate) in with the data and options to render the template, so anyone
 * can later run the template in the context of any document.
 * View also cuts out a chunk of boiler place code.
 * @param options The information needed to create the DOM from HTML. Includes:
 * - html (required): The HTML source, probably from a call to require
 * - options (default={}): The domtemplate options. See domtemplate for details
 * - data (default={}): The data to domtemplate. See domtemplate for details.
 * - css (default=none): Some CSS to be added to the final document. If 'css'
 *   is used, use of cssId is strongly recommended.
 * - cssId (default=none): An ID to prevent multiple CSS additions. See
 *   util.importCss for more details.
 * @return An object containing a single function 'appendTo()' which runs the
 * template adding the result to the specified element. Takes 2 parameters:
 * - element (required): the element to add to
 * - clear (default=false): if clear===true then remove all pre-existing
 *   children of 'element' before appending the results of this template.
 */
exports.createView = function(options) {
  if (options.html == null) {
    throw new Error('options.html is missing');
  }

  return {
    /**
     * RTTI. Yeah.
     */
    isView: true,

    /**
     * Run the template against the document to which element belongs.
     * @param element The element to append the result to
     * @param clear Set clear===true to remove all children of element
     */
    appendTo: function(element, clear) {
      // Strict check on the off-chance that we later think of other options
      // and want to replace 'clear' with an 'options' parameter, but want to
      // support backwards compat.
      if (clear === true) {
        util.clearElement(element);
      }

      element.appendChild(this.toDom(element.ownerDocument));
    },

    /**
     * Actually convert the view data into a DOM suitable to be appended to
     * an element
     * @param document to use in realizing the template
     */
    toDom: function(document) {
      if (options.css) {
        util.importCss(options.css, document, options.cssId);
      }

      var child = util.toDom(document, options.html);
      domtemplate.template(child, options.data || {}, options.options || {});
      return child;
    }
  };
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/domtemplate', ['require', 'exports', 'module' ], function(require, exports, module) {


/**
 * For full documentation, see:
 * https://github.com/mozilla/domtemplate/blob/master/README.md
 */

// WARNING: do not 'use_strict' without reading the notes in _envEval();

/**
 * Begin a new templating process.
 * @param node A DOM element or string referring to an element's id
 * @param data Data to use in filling out the template
 * @param options Options to customize the template processing. One of:
 * - allowEval: boolean (default false) Basic template interpolations are
 *   either property paths (e.g. ${a.b.c.d}), or if allowEval=true then we
 *   allow arbitrary JavaScript
 * - stack: string or array of strings (default empty array) The template
 *   engine maintains a stack of tasks to help debug where it is. This allows
 *   this stack to be prefixed with a template name
 * - blankNullUndefined: By default DOMTemplate exports null and undefined
 *   values using the strings 'null' and 'undefined', which can be helpful for
 *   debugging, but can introduce unnecessary extra logic in a template to
 *   convert null/undefined to ''. By setting blankNullUndefined:true, this
 *   conversion is handled by DOMTemplate
 */
function template(node, data, options) {
  var template = new Templater(options || {});
  template.processNode(node, data);
  return template;
}

/**
 * Construct a Templater object. Use template() in preference to this ctor.
 * @deprecated Use template(node, data, options);
 */
function Templater(options) {
  if (options == null) {
    options = { allowEval: true };
  }
  this.options = options;
  if (options.stack && Array.isArray(options.stack)) {
    this.stack = options.stack;
  }
  else if (typeof options.stack === 'string') {
    this.stack = [ options.stack ];
  }
  else {
    this.stack = [];
  }
  this.nodes = [];
}

/**
 * Cached regex used to find ${...} sections in some text.
 * Performance note: This regex uses ( and ) to capture the 'script' for
 * further processing. Not all of the uses of this regex use this feature so
 * if use of the capturing group is a performance drain then we should split
 * this regex in two.
 */
Templater.prototype._templateRegion = /\$\{([^}]*)\}/g;

/**
 * Cached regex used to split a string using the unicode chars F001 and F002.
 * See Templater._processTextNode() for details.
 */
Templater.prototype._splitSpecial = /\uF001|\uF002/;

/**
 * Cached regex used to detect if a script is capable of being interpreted
 * using Template._property() or if we need to use Template._envEval()
 */
Templater.prototype._isPropertyScript = /^[_a-zA-Z0-9.]*$/;

/**
 * Recursive function to walk the tree processing the attributes as it goes.
 * @param node the node to process. If you pass a string in instead of a DOM
 * element, it is assumed to be an id for use with document.getElementById()
 * @param data the data to use for node processing.
 */
Templater.prototype.processNode = function(node, data) {
  if (typeof node === 'string') {
    node = document.getElementById(node);
  }
  if (data == null) {
    data = {};
  }
  this.stack.push(node.nodeName + (node.id ? '#' + node.id : ''));
  var pushedNode = false;
  try {
    // Process attributes
    if (node.attributes && node.attributes.length) {
      // We need to handle 'foreach' and 'if' first because they might stop
      // some types of processing from happening, and foreach must come first
      // because it defines new data on which 'if' might depend.
      if (node.hasAttribute('foreach')) {
        this._processForEach(node, data);
        return;
      }
      if (node.hasAttribute('if')) {
        if (!this._processIf(node, data)) {
          return;
        }
      }
      // Only make the node available once we know it's not going away
      this.nodes.push(data.__element);
      data.__element = node;
      pushedNode = true;
      // It's good to clean up the attributes when we've processed them,
      // but if we do it straight away, we mess up the array index
      var attrs = Array.prototype.slice.call(node.attributes);
      for (var i = 0; i < attrs.length; i++) {
        var value = attrs[i].value;
        var name = attrs[i].name;
        this.stack.push(name);
        try {
          if (name === 'save') {
            // Save attributes are a setter using the node
            value = this._stripBraces(value);
            this._property(value, data, node);
            node.removeAttribute('save');
          } else if (name.substring(0, 2) === 'on') {
            // Event registration relies on property doing a bind
            value = this._stripBraces(value);
            var func = this._property(value, data);
            if (typeof func !== 'function') {
              this._handleError('Expected ' + value +
                ' to resolve to a function, but got ' + typeof func);
            }
            node.removeAttribute(name);
            var capture = node.hasAttribute('capture' + name.substring(2));
            node.addEventListener(name.substring(2), func, capture);
            if (capture) {
              node.removeAttribute('capture' + name.substring(2));
            }
          } else {
            // Replace references in all other attributes
            var newValue = value.replace(this._templateRegion, function(path) {
              var insert = this._envEval(path.slice(2, -1), data, value);
              if (this.options.blankNullUndefined && insert == null) {
                insert = '';
              }
              return insert;
            }.bind(this));
            // Remove '_' prefix of attribute names so the DOM won't try
            // to use them before we've processed the template
            if (name.charAt(0) === '_') {
              node.removeAttribute(name);
              node.setAttribute(name.substring(1), newValue);
            } else if (value !== newValue) {
              attrs[i].value = newValue;
            }
          }
        } finally {
          this.stack.pop();
        }
      }
    }

    // Loop through our children calling processNode. First clone them, so the
    // set of nodes that we visit will be unaffected by additions or removals.
    var childNodes = Array.prototype.slice.call(node.childNodes);
    for (var j = 0; j < childNodes.length; j++) {
      this.processNode(childNodes[j], data);
    }

    if (node.nodeType === 3 /*Node.TEXT_NODE*/) {
      this._processTextNode(node, data);
    }
  } finally {
    if (pushedNode) {
      data.__element = this.nodes.pop();
    }
    this.stack.pop();
  }
};

/**
 * Handle <x if="${...}">
 * @param node An element with an 'if' attribute
 * @param data The data to use with _envEval()
 * @returns true if processing should continue, false otherwise
 */
Templater.prototype._processIf = function(node, data) {
  this.stack.push('if');
  try {
    var originalValue = node.getAttribute('if');
    var value = this._stripBraces(originalValue);
    var recurse = true;
    try {
      var reply = this._envEval(value, data, originalValue);
      recurse = !!reply;
    } catch (ex) {
      this._handleError('Error with \'' + value + '\'', ex);
      recurse = false;
    }
    if (!recurse) {
      node.parentNode.removeChild(node);
    }
    node.removeAttribute('if');
    return recurse;
  } finally {
    this.stack.pop();
  }
};

/**
 * Handle <x foreach="param in ${array}"> and the special case of
 * <loop foreach="param in ${array}">.
 * This function is responsible for extracting what it has to do from the
 * attributes, and getting the data to work on (including resolving promises
 * in getting the array). It delegates to _processForEachLoop to actually
 * unroll the data.
 * @param node An element with a 'foreach' attribute
 * @param data The data to use with _envEval()
 */
Templater.prototype._processForEach = function(node, data) {
  this.stack.push('foreach');
  try {
    var originalValue = node.getAttribute('foreach');
    var value = originalValue;

    var paramName = 'param';
    if (value.charAt(0) === '$') {
      // No custom loop variable name. Use the default: 'param'
      value = this._stripBraces(value);
    } else {
      // Extract the loop variable name from 'NAME in ${ARRAY}'
      var nameArr = value.split(' in ');
      paramName = nameArr[0].trim();
      value = this._stripBraces(nameArr[1].trim());
    }
    node.removeAttribute('foreach');
    try {
      var evaled = this._envEval(value, data, originalValue);
      this._handleAsync(evaled, node, function(reply, siblingNode) {
        this._processForEachLoop(reply, node, siblingNode, data, paramName);
      }.bind(this));
      node.parentNode.removeChild(node);
    } catch (ex) {
      this._handleError('Error with \'' + value + '\'', ex);
    }
  } finally {
    this.stack.pop();
  }
};

/**
 * Called by _processForEach to handle looping over the data in a foreach loop.
 * This works with both arrays and objects.
 * Calls _processForEachMember() for each member of 'set'
 * @param set The object containing the data to loop over
 * @param template The node to copy for each set member
 * @param sibling The sibling node to which we add things
 * @param data the data to use for node processing
 * @param paramName foreach loops have a name for the parameter currently being
 * processed. The default is 'param'. e.g. <loop foreach="param in ${x}">...
 */
Templater.prototype._processForEachLoop = function(set, template, sibling, data, paramName) {
  if (Array.isArray(set)) {
    set.forEach(function(member, i) {
      this._processForEachMember(member, template, sibling, data, paramName, '' + i);
    }, this);
  } else {
    for (var member in set) {
      if (set.hasOwnProperty(member)) {
        this._processForEachMember(member, template, sibling, data, paramName, member);
      }
    }
  }
};

/**
 * Called by _processForEachLoop() to resolve any promises in the array (the
 * array itself can also be a promise, but that is resolved by
 * _processForEach()). Handle <LOOP> elements (which are taken out of the DOM),
 * clone the template, and pass the processing on to processNode().
 * @param member The data item to use in templating
 * @param template The node to copy for each set member
 * @param siblingNode The parent node to which we add things
 * @param data the data to use for node processing
 * @param paramName The name given to 'member' by the foreach attribute
 * @param frame A name to push on the stack for debugging
 */
Templater.prototype._processForEachMember = function(member, template, siblingNode, data, paramName, frame) {
  this.stack.push(frame);
  try {
    this._handleAsync(member, siblingNode, function(reply, node) {
      data[paramName] = reply;
      if (template.nodeName.toLowerCase() === 'loop') {
        for (var i = 0; i < template.childNodes.length; i++) {
          var clone = template.childNodes[i].cloneNode(true);
          node.parentNode.insertBefore(clone, node);
          this.processNode(clone, data);
        }
      } else {
        var clone = template.cloneNode(true);
        clone.removeAttribute('foreach');
        node.parentNode.insertBefore(clone, node);
        this.processNode(clone, data);
      }
      delete data[paramName];
    }.bind(this));
  } finally {
    this.stack.pop();
  }
};

/**
 * Take a text node and replace it with another text node with the ${...}
 * sections parsed out. We replace the node by altering node.parentNode but
 * we could probably use a DOM Text API to achieve the same thing.
 * @param node The Text node to work on
 * @param data The data to use in calls to _envEval()
 */
Templater.prototype._processTextNode = function(node, data) {
  // Replace references in other attributes
  var value = node.data;
  // We can't use the string.replace() with function trick (see generic
  // attribute processing in processNode()) because we need to support
  // functions that return DOM nodes, so we can't have the conversion to a
  // string.
  // Instead we process the string as an array of parts. In order to split
  // the string up, we first replace '${' with '\uF001$' and '}' with '\uF002'
  // We can then split using \uF001 or \uF002 to get an array of strings
  // where scripts are prefixed with $.
  // \uF001 and \uF002 are just unicode chars reserved for private use.
  value = value.replace(this._templateRegion, '\uF001$$$1\uF002');
  var parts = value.split(this._splitSpecial);
  if (parts.length > 1) {
    parts.forEach(function(part) {
      if (part === null || part === undefined || part === '') {
        return;
      }
      if (part.charAt(0) === '$') {
        part = this._envEval(part.slice(1), data, node.data);
      }
      this._handleAsync(part, node, function(reply, siblingNode) {
        var doc = siblingNode.ownerDocument;
        if (reply == null) {
          reply = this.options.blankNullUndefined ? '' : '' + reply;
        }
        if (typeof reply.cloneNode === 'function') {
          // i.e. if (reply instanceof Element) { ...
          reply = this._maybeImportNode(reply, doc);
          siblingNode.parentNode.insertBefore(reply, siblingNode);
        } else if (typeof reply.item === 'function' && reply.length) {
          // NodeLists can be live, in which case _maybeImportNode can
          // remove them from the document, and thus the NodeList, which in
          // turn breaks iteration. So first we clone the list
          var list = Array.prototype.slice.call(reply, 0);
          list.forEach(function(child) {
            var imported = this._maybeImportNode(child, doc);
            siblingNode.parentNode.insertBefore(imported, siblingNode);
          }.bind(this));
        }
        else {
          // if thing isn't a DOM element then wrap its string value in one
          reply = doc.createTextNode(reply.toString());
          siblingNode.parentNode.insertBefore(reply, siblingNode);
        }

      }.bind(this));
    }, this);
    node.parentNode.removeChild(node);
  }
};

/**
 * Return node or a import of node, if it's not in the given document
 * @param node The node that we want to be properly owned
 * @param doc The document that the given node should belong to
 * @return A node that belongs to the given document
 */
Templater.prototype._maybeImportNode = function(node, doc) {
  return node.ownerDocument === doc ? node : doc.importNode(node, true);
};

/**
 * A function to handle the fact that some nodes can be promises, so we check
 * and resolve if needed using a marker node to keep our place before calling
 * an inserter function.
 * @param thing The object which could be real data or a promise of real data
 * we use it directly if it's not a promise, or resolve it if it is.
 * @param siblingNode The element before which we insert new elements.
 * @param inserter The function to to the insertion. If thing is not a promise
 * then _handleAsync() is just 'inserter(thing, siblingNode)'
 */
Templater.prototype._handleAsync = function(thing, siblingNode, inserter) {
  if (thing != null && typeof thing.then === 'function') {
    // Placeholder element to be replaced once we have the real data
    var tempNode = siblingNode.ownerDocument.createElement('span');
    siblingNode.parentNode.insertBefore(tempNode, siblingNode);
    thing.then(function(delayed) {
      inserter(delayed, tempNode);
      tempNode.parentNode.removeChild(tempNode);
    }.bind(this));
  }
  else {
    inserter(thing, siblingNode);
  }
};

/**
 * Warn of string does not begin '${' and end '}'
 * @param str the string to check.
 * @return The string stripped of ${ and }, or untouched if it does not match
 */
Templater.prototype._stripBraces = function(str) {
  if (!str.match(this._templateRegion)) {
    this._handleError('Expected ' + str + ' to match ${...}');
    return str;
  }
  return str.slice(2, -1);
};

/**
 * Combined getter and setter that works with a path through some data set.
 * For example:
 * <ul>
 * <li>_property('a.b', { a: { b: 99 }}); // returns 99
 * <li>_property('a', { a: { b: 99 }}); // returns { b: 99 }
 * <li>_property('a', { a: { b: 99 }}, 42); // returns 99 and alters the
 * input data to be { a: { b: 42 }}
 * </ul>
 * @param path An array of strings indicating the path through the data, or
 * a string to be cut into an array using <tt>split('.')</tt>
 * @param data the data to use for node processing
 * @param newValue (optional) If defined, this value will replace the
 * original value for the data at the path specified.
 * @return The value pointed to by <tt>path</tt> before any
 * <tt>newValue</tt> is applied.
 */
Templater.prototype._property = function(path, data, newValue) {
  try {
    if (typeof path === 'string') {
      path = path.split('.');
    }
    var value = data[path[0]];
    if (path.length === 1) {
      if (newValue !== undefined) {
        data[path[0]] = newValue;
      }
      if (typeof value === 'function') {
        return value.bind(data);
      }
      return value;
    }
    if (!value) {
      this._handleError('"' + path[0] + '" is undefined');
      return null;
    }
    return this._property(path.slice(1), value, newValue);
  } catch (ex) {
    this._handleError('Path error with \'' + path + '\'', ex);
    return '${' + path + '}';
  }
};

/**
 * Like eval, but that creates a context of the variables in <tt>env</tt> in
 * which the script is evaluated.
 * WARNING: This script uses 'with' which is generally regarded to be evil.
 * The alternative is to create a Function at runtime that takes X parameters
 * according to the X keys in the env object, and then call that function using
 * the values in the env object. This is likely to be slow, but workable.
 * @param script The string to be evaluated.
 * @param data The environment in which to eval the script.
 * @param frame Optional debugging string in case of failure.
 * @return The return value of the script, or the error message if the script
 * execution failed.
 */
Templater.prototype._envEval = function(script, data, frame) {
  try {
    this.stack.push(frame.replace(/\s+/g, ' '));
    if (this._isPropertyScript.test(script)) {
      return this._property(script, data);
    } else {
      if (!this.options.allowEval) {
        this._handleError('allowEval is not set, however \'' + script + '\'' +
            ' can not be resolved using a simple property path.');
        return '${' + script + '}';
      }
      with (data) {
        return eval(script);
      }
    }
  } catch (ex) {
    this._handleError('Template error evaluating \'' + script + '\'', ex);
    return '${' + script + '}';
  } finally {
    this.stack.pop();
  }
};

/**
 * A generic way of reporting errors, for easy overloading in different
 * environments.
 * @param message the error message to report.
 * @param ex optional associated exception.
 */
Templater.prototype._handleError = function(message, ex) {
  this._logError(message + ' (In: ' + this.stack.join(' > ') + ')');
  if (ex) {
    this._logError(ex);
  }
};


/**
 * A generic way of reporting errors, for easy overloading in different
 * environments.
 * @param message the error message to report.
 */
Templater.prototype._logError = function(message) {
  console.log(message);
};

exports.Templater = Templater;
exports.template = template;


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/promise', ['require', 'exports', 'module' ], function(require, exports, module) {


/**
 * Create an unfulfilled promise
 * @constructor
 */
function Promise() {
  this._status = Promise.PENDING;
  this._value = undefined;
  this._onSuccessHandlers = [];
  this._onErrorHandlers = [];

  // Debugging help
  this._id = Promise._nextId++;
  Promise._outstanding[this._id] = this;
}

/**
 * We give promises and ID so we can track which are outstanding
 */
Promise._nextId = 0;

/**
 * Outstanding promises. Handy list for debugging only
 */
Promise._outstanding = [];

/**
 * Recently resolved promises. Also for debugging only
 */
Promise._recent = [];

/**
 * A promise can be in one of 2 states.
 * The ERROR and SUCCESS states are terminal, the PENDING state is the only
 * start state.
 */
Promise.ERROR = -1;
Promise.PENDING = 0;
Promise.SUCCESS = 1;

/**
 * Yeay for RTTI
 */
Promise.prototype.isPromise = true;

/**
 * Have we either been resolve()ed or reject()ed?
 */
Promise.prototype.isComplete = function() {
  return this._status != Promise.PENDING;
};

/**
 * Have we resolve()ed?
 */
Promise.prototype.isResolved = function() {
  return this._status == Promise.SUCCESS;
};

/**
 * Have we reject()ed?
 */
Promise.prototype.isRejected = function() {
  return this._status == Promise.ERROR;
};

/**
 * Take the specified action of fulfillment of a promise, and (optionally)
 * a different action on promise rejection
 */
Promise.prototype.then = function(onSuccess, onError) {
  if (typeof onSuccess === 'function') {
    if (this._status === Promise.SUCCESS) {
      onSuccess.call(null, this._value);
    }
    else if (this._status === Promise.PENDING) {
      this._onSuccessHandlers.push(onSuccess);
    }
  }

  if (typeof onError === 'function') {
    if (this._status === Promise.ERROR) {
      onError.call(null, this._value);
    }
    else if (this._status === Promise.PENDING) {
      this._onErrorHandlers.push(onError);
    }
  }

  return this;
};

/**
 * Like then() except that rather than returning <tt>this</tt> we return
 * a promise which resolves when the original promise resolves
 */
Promise.prototype.chainPromise = function(onSuccess) {
  var chain = new Promise();
  chain._chainedFrom = this;
  this.then(function(data) {
    try {
      chain.resolve(onSuccess(data));
    }
    catch (ex) {
      chain.reject(ex);
    }
  }, function(ex) {
    chain.reject(ex);
  });
  return chain;
};

/**
 * Supply the fulfillment of a promise
 */
Promise.prototype.resolve = function(data) {
  return this._complete(this._onSuccessHandlers,
                        Promise.SUCCESS, data, 'resolve');
};

/**
 * Renege on a promise
 */
Promise.prototype.reject = function(data) {
  return this._complete(this._onErrorHandlers, Promise.ERROR, data, 'reject');
};

/**
 * Internal method to be called on resolve() or reject()
 */
Promise.prototype._complete = function(list, status, data, name) {
  // Complain if we've already been completed
  if (this._status != Promise.PENDING) {
    Promise._error('Promise complete. Attempted ' + name + '() with ', data);
    Promise._error('Prev status = ', this._status, ', value = ', this._value);
    throw new Error('Promise already complete');
  }
  else if (list.length == 0 && status == Promise.ERROR) {
    // Complain if a rejection is ignored
    // (this is the equivalent of an empty catch-all clause)
    Promise._error("Promise rejection ignored and silently dropped");
    Promise._error(data);
    var frame;
    if (data.stack) {
      // This is an exception or an exception-like value
      Promise._error("Printing original stack");
      for (frame = data.stack; frame; frame = frame.caller) {
        Promise._error(frame);
      }
    }
    else if (data.fileName && data.lineNumber) {
      Promise._error("Error originating at " + data.fileName + ", line "
           + data.lineNumber);
    }
    else if (typeof Components !== "undefined") {
      try {
        if (Components.stack) {
          Promise._error("Original stack not available. Printing current stack");
          for (frame = Components.stack; frame; frame = frame.caller) {
            Promise._error(frame);
          }
        }
      }
      catch (ex) {
        // Ignore failure to read Components.stack
      }
    }
  }

  Promise._setTimeout(function() {
    this._status = status;
    this._value = data;

    // Call all the handlers, and then delete them
    list.forEach(function(handler) {
      handler.call(null, this._value);
    }, this);
    delete this._onSuccessHandlers;
    delete this._onErrorHandlers;

    // Remove the given {promise} from the _outstanding list, and add it to the
    // _recent list, pruning more than 20 recent promises from that list
    delete Promise._outstanding[this._id];
    // The web version of this code includes this very useful debugging aid,
    // however there is concern that it will create a memory leak, so we leave it
    // out when embedded in Mozilla.
    //*
    Promise._recent.push(this);
    while (Promise._recent.length > 20) {
      Promise._recent.shift();
    }
    //*/
  }.bind(this), 1);

  return this;
};

/**
 * Minimal debugging.
 */
Promise.prototype.toString = function() {
  return "[Promise " + this._id + "]";
};

/**
 * Takes an array of promises and returns a promise that that is fulfilled once
 * all the promises in the array are fulfilled
 * @param promiseList The array of promises
 * @return the promise that is fulfilled when all the array is fulfilled
 */
Promise.group = function(promiseList) {
  if (!Array.isArray(promiseList)) {
    promiseList = Array.prototype.slice.call(arguments);
  }

  // If the original array has nothing in it, return now to avoid waiting
  if (promiseList.length === 0) {
    return new Promise().resolve([]);
  }

  var groupPromise = new Promise();
  var results = [];
  var fulfilled = 0;

  var onSuccessFactory = function(index) {
    return function(data) {
      results[index] = data;
      fulfilled++;
      // If the group has already failed, silently drop extra results
      if (groupPromise._status !== Promise.ERROR) {
        if (fulfilled === promiseList.length) {
          groupPromise.resolve(results);
        }
      }
    };
  };

  promiseList.forEach(function(promise, index) {
    var onSuccess = onSuccessFactory(index);
    var onError = groupPromise.reject.bind(groupPromise);
    promise.then(onSuccess, onError);
  });

  return groupPromise;
};

/**
 * Executes a code snippet or a function after specified delay.
 * @param callback is the function you want to execute after the delay.
 * @param delay is the number of milliseconds that the function call should
 * be delayed by. Note that the actual delay may be longer, see Notes below.
 * @return the ID of the timeout
 */
Promise._setTimeout = function(callback, delay) {
  return setTimeout(callback, delay);
};

/**
 * This implementation of promise also runs in a browser.
 * Promise._error allows us to redirect error messages to the console with
 * minimal changes.
 */
Promise._error = function() { console.warn(arguments); };


exports.Promise = Promise;

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/intro', ['require', 'exports', 'module' , 'gcli/settings', 'gcli/l10n', 'gcli/util', 'gcli/ui/view', 'gcli/cli', 'text!gcli/ui/intro.html'], function(require, exports, module) {

  var settings = require('gcli/settings');
  var l10n = require('gcli/l10n');
  var util = require('gcli/util');
  var view = require('gcli/ui/view');
  var Output = require('gcli/cli').Output;

  /**
   * Record if the user has clicked on 'Got It!'
   */
  var hideIntroSettingSpec = {
    name: 'hideIntro',
    type: 'boolean',
    description: l10n.lookup('hideIntroDesc'),
    defaultValue: false
  };
  var hideIntro;

  /**
   * Register (and unregister) the hide-intro setting
   */
  exports.startup = function() {
    hideIntro = settings.addSetting(hideIntroSettingSpec);
  };

  exports.shutdown = function() {
    settings.removeSetting(hideIntroSettingSpec);
    hideIntro = undefined;
  };

  /**
   * Called when the UI is ready to add a welcome message to the output
   */
  exports.maybeShowIntro = function(commandOutputManager, context) {
    if (hideIntro.value) {
      return;
    }

    var output = new Output();
    commandOutputManager.onOutput({ output: output });

    var viewData = this.createView(context, output);

    output.complete(viewData);
  };

  /**
   * Called when the UI is ready to add a welcome message to the output
   */
  exports.createView = function(context, output) {
    return view.createView({
      html: require('text!gcli/ui/intro.html'),
      options: { stack: 'intro.html' },
      data: {
        l10n: l10n.propertyLookup,
        onclick: function(ev) {
          util.updateCommand(ev.currentTarget, context);
        },
        ondblclick: function(ev) {
          util.executeCommand(ev.currentTarget, context);
        },
        showHideButton: (output != null),
        onGotIt: function(ev) {
          hideIntro.value = true;
          output.onClose();
        }
      }
    });
  };
});
define("text!gcli/ui/intro.html", [], "\n" +
  "<div>\n" +
  "  <p>${l10n.introTextOpening}</p>\n" +
  "\n" +
  "  <p>\n" +
  "    ${l10n.introTextCommands}\n" +
  "    <span class=\"gcli-out-shortcut\" onclick=\"${onclick}\"\n" +
  "        ondblclick=\"${ondblclick}\" data-command=\"help\">help</span>,\n" +
  "    ${l10n.introTextKeys} <code>${l10n.introTextF1Escape}</code>.\n" +
  "  </p>\n" +
  "\n" +
  "  <button onclick=\"${onGotIt}\" if=\"${showHideButton}\">${l10n.introTextGo}</button>\n" +
  "</div>\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/focus', ['require', 'exports', 'module' , 'gcli/util', 'gcli/settings', 'gcli/l10n', 'gcli/canon'], function(require, exports, module) {


var util = require('gcli/util');
var settings = require('gcli/settings');
var l10n = require('gcli/l10n');
var canon = require('gcli/canon');

/**
 * Record how much help the user wants from the tooltip
 */
var Eagerness = {
  NEVER: 1,
  SOMETIMES: 2,
  ALWAYS: 3
};
var eagerHelperSettingSpec = {
  name: 'eagerHelper',
  type: {
    name: 'selection',
    lookup: [
      { name: 'never', value: Eagerness.NEVER },
      { name: 'sometimes', value: Eagerness.SOMETIMES },
      { name: 'always', value: Eagerness.ALWAYS },
    ]
  },
  defaultValue: Eagerness.SOMETIMES,
  description: l10n.lookup('eagerHelperDesc'),
  ignoreTypeDifference: true
};
var eagerHelper;

/**
 * Register (and unregister) the hide-intro setting
 */
exports.startup = function() {
  eagerHelper = settings.addSetting(eagerHelperSettingSpec);
};

exports.shutdown = function() {
  settings.removeSetting(eagerHelperSettingSpec);
  eagerHelper = undefined;
};

/**
 * FocusManager solves the problem of tracking focus among a set of nodes.
 * The specific problem we are solving is when the hint element must be visible
 * if either the command line or any of the inputs in the hint element has the
 * focus, and invisible at other times, without hiding and showing the hint
 * element even briefly as the focus changes between them.
 * It does this simply by postponing the hide events by 250ms to see if
 * something else takes focus.
 * @param options Object containing user customization properties, including:
 * - blurDelay (default=150ms)
 * - debug (default=false)
 * - commandOutputManager (default=canon.commandOutputManager)
 * @param components Object that links to other UI components. GCLI provided:
 * - document
 */
function FocusManager(options, components) {
  options = options || {};

  this._document = components.document || document;
  this._debug = options.debug || false;
  this._blurDelay = options.blurDelay || 150;
  this._window = this._document.defaultView;

  this._commandOutputManager = options.commandOutputManager ||
      canon.commandOutputManager;
  this._commandOutputManager.onOutput.add(this._outputted, this);

  this._blurDelayTimeout = null; // Result of setTimeout in delaying a blur
  this._monitoredElements = [];  // See addMonitoredElement()

  this._isError = false;
  this._hasFocus = false;
  this._helpRequested = false;
  this._recentOutput = false;

  this.onVisibilityChange = util.createEvent('FocusManager.onVisibilityChange');

  this._focused = this._focused.bind(this);
  this._document.addEventListener('focus', this._focused, true);

  eagerHelper.onChange.add(this._eagerHelperChanged, this);

  this.isTooltipVisible = undefined;
  this.isOutputVisible = undefined;
  this._checkShow();
}

/**
 * Avoid memory leaks
 */
FocusManager.prototype.destroy = function() {
  eagerHelper.onChange.remove(this._eagerHelperChanged, this);

  this._document.removeEventListener('focus', this._focused, true);
  this._commandOutputManager.onOutput.remove(this._outputted, this);

  for (var i = 0; i < this._monitoredElements.length; i++) {
    var monitor = this._monitoredElements[i];
    console.error('Hanging monitored element: ', monitor.element);

    monitor.element.removeEventListener('focus', monitor.onFocus, true);
    monitor.element.removeEventListener('blur', monitor.onBlur, true);
  }

  if (this._blurDelayTimeout) {
    this._window.clearTimeout(this._blurDelayTimeout);
    this._blurDelayTimeout = null;
  }

  delete this._focused;
  delete this._document;
  delete this._window;
  delete this._commandOutputManager;
};

/**
 * The easy way to include an element in the set of things that are part of the
 * aggregate focus. Using [add|remove]MonitoredElement() is a simpler way of
 * option than calling report[Focus|Blur]()
 * @param element The element on which to track focus|blur events
 * @param where Optional source string for debugging only
 */
FocusManager.prototype.addMonitoredElement = function(element, where) {
  if (this._debug) {
    console.log('FocusManager.addMonitoredElement(' + (where || 'unknown') + ')');
  }

  var monitor = {
    element: element,
    where: where,
    onFocus: function() { this._reportFocus(where); }.bind(this),
    onBlur: function() { this._reportBlur(where); }.bind(this)
  };

  element.addEventListener('focus', monitor.onFocus, true);
  element.addEventListener('blur', monitor.onBlur, true);

  if (this._document.activeElement === element) {
    this._reportFocus(where);
  }

  this._monitoredElements.push(monitor);
};

/**
 * Undo the effects of addMonitoredElement()
 * @param element The element to stop tracking
 * @param where Optional source string for debugging only
 */
FocusManager.prototype.removeMonitoredElement = function(element, where) {
  if (this._debug) {
    console.log('FocusManager.removeMonitoredElement(' + (where || 'unknown') + ')');
  }

  var newMonitoredElements = this._monitoredElements.filter(function(monitor) {
    if (monitor.element === element) {
      element.removeEventListener('focus', monitor.onFocus, true);
      element.removeEventListener('blur', monitor.onBlur, true);
      return false;
    }
    return true;
  });

  this._monitoredElements = newMonitoredElements;
};

/**
 * Monitor for new command executions
 */
FocusManager.prototype.updatePosition = function(dimensions) {
  var ev = {
    tooltipVisible: this.isTooltipVisible,
    outputVisible: this.isOutputVisible,
    dimensions: dimensions
  };
  this.onVisibilityChange(ev);
};

/**
 * Monitor for new command executions
 */
FocusManager.prototype._outputted = function(ev) {
  this._recentOutput = true;
  this._helpRequested = false;
  this._checkShow();
};

/**
 * We take a focus event anywhere to be an indication that we might be about
 * to lose focus
 */
FocusManager.prototype._focused = function() {
  this._reportBlur('document');
};

/**
 * Some component has received a 'focus' event. This sets the internal status
 * straight away and informs the listeners
 * @param where Optional source string for debugging only
 */
FocusManager.prototype._reportFocus = function(where) {
  if (this._debug) {
    console.log('FocusManager._reportFocus(' + (where || 'unknown') + ')');
  }

  if (this._blurDelayTimeout) {
    if (this._debug) {
      console.log('FocusManager.cancelBlur');
    }
    this._window.clearTimeout(this._blurDelayTimeout);
    this._blurDelayTimeout = null;
  }

  if (!this._hasFocus) {
    this._hasFocus = true;
  }
  this._checkShow();
};

/**
 * Some component has received a 'blur' event. This waits for a while to see if
 * we are going to get any subsequent 'focus' events and then sets the internal
 * status and informs the listeners
 * @param where Optional source string for debugging only
 */
FocusManager.prototype._reportBlur = function(where) {
  if (this._debug) {
    console.log('FocusManager._reportBlur(' + where + ')');
  }

  if (this._hasFocus) {
    if (this._blurDelayTimeout) {
      if (this._debug) {
        console.log('FocusManager.blurPending');
      }
      return;
    }

    this._blurDelayTimeout = this._window.setTimeout(function() {
      if (this._debug) {
        console.log('FocusManager.blur');
      }
      this._hasFocus = false;
      this._checkShow();
      this._blurDelayTimeout = null;
    }.bind(this), this._blurDelay);
  }
};

/**
 * The setting has changed
 */
FocusManager.prototype._eagerHelperChanged = function() {
  this._checkShow();
};

/**
 * The inputter tells us about keyboard events so we can decide to delay
 * showing the tooltip element
 */
FocusManager.prototype.onInputChange = function() {
  this._recentOutput = false;
  this._checkShow();
};

/**
 * Generally called for something like a F1 key press, when the user explicitly
 * wants help
 */
FocusManager.prototype.helpRequest = function() {
  if (this._debug) {
    console.log('FocusManager.helpRequest');
  }

  this._helpRequested = true;
  this._recentOutput = false;
  this._checkShow();
};

/**
 * Generally called for something like a ESC key press, when the user explicitly
 * wants to get rid of the help
 */
FocusManager.prototype.removeHelp = function() {
  if (this._debug) {
    console.log('FocusManager.removeHelp');
  }

  this._importantFieldFlag = false;
  this._isError = false;
  this._helpRequested = false;
  this._recentOutput = false;
  this._checkShow();
};

/**
 * Set to true whenever a field thinks it's output is important
 */
FocusManager.prototype.setImportantFieldFlag = function(flag) {
  if (this._debug) {
    console.log('FocusManager.setImportantFieldFlag', flag);
  }
  this._importantFieldFlag = flag;
  this._checkShow();
};

/**
 * Set to true whenever a field thinks it's output is important
 */
FocusManager.prototype.setError = function(isError) {
  if (this._debug) {
    console.log('FocusManager._isError', isError);
  }
  this._isError = isError;
  this._checkShow();
};

/**
 * Helper to compare the current showing state with the value calculated by
 * _shouldShow() and take appropriate action
 */
FocusManager.prototype._checkShow = function() {
  var fire = false;
  var ev = {
    tooltipVisible: this.isTooltipVisible,
    outputVisible: this.isOutputVisible
  };

  var showTooltip = this._shouldShowTooltip();
  if (this.isTooltipVisible !== showTooltip.visible) {
    ev.tooltipVisible = this.isTooltipVisible = showTooltip.visible;
    fire = true;
  }

  var showOutput = this._shouldShowOutput();
  if (this.isOutputVisible !== showOutput.visible) {
    ev.outputVisible = this.isOutputVisible = showOutput.visible;
    fire = true;
  }

  if (fire) {
    if (this._debug) {
      console.debug('FocusManager.onVisibilityChange', ev);
    }
    this.onVisibilityChange(ev);
  }
};

/**
 * Calculate if we should be showing or hidden taking into account all the
 * available inputs
 */
FocusManager.prototype._shouldShowTooltip = function() {
  if (!this._hasFocus) {
    return { visible: false, reason: 'notHasFocus' };
  }

  if (eagerHelper.value === Eagerness.NEVER) {
    return { visible: false, reason: 'eagerHelperNever' };
  }

  if (eagerHelper.value === Eagerness.ALWAYS) {
    return { visible: true, reason: 'eagerHelperAlways' };
  }

  if (this._isError) {
    return { visible: true, reason: 'isError' };
  }

  if (this._helpRequested) {
    return { visible: true, reason: 'helpRequested' };
  }

  if (this._importantFieldFlag) {
    return { visible: true, reason: 'importantFieldFlag' };
  }

  return { visible: false, reason: 'default' };
};

/**
 * Calculate if we should be showing or hidden taking into account all the
 * available inputs
 */
FocusManager.prototype._shouldShowOutput = function() {
  if (!this._hasFocus) {
    return { visible: false, reason: 'notHasFocus' };
  }

  if (this._recentOutput) {
    return { visible: true, reason: 'recentOutput' };
  }

  return { visible: false, reason: 'default' };
};

exports.FocusManager = FocusManager;


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/fields/basic', ['require', 'exports', 'module' , 'gcli/util', 'gcli/l10n', 'gcli/argument', 'gcli/types', 'gcli/types/basic', 'gcli/ui/fields'], function(require, exports, module) {


var util = require('gcli/util');
var l10n = require('gcli/l10n');

var Argument = require('gcli/argument').Argument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var FalseNamedArgument = require('gcli/argument').FalseNamedArgument;
var ArrayArgument = require('gcli/argument').ArrayArgument;

var Conversion = require('gcli/types').Conversion;
var ArrayConversion = require('gcli/types').ArrayConversion;

var StringType = require('gcli/types/basic').StringType;
var NumberType = require('gcli/types/basic').NumberType;
var BooleanType = require('gcli/types/basic').BooleanType;
var DeferredType = require('gcli/types/basic').DeferredType;
var ArrayType = require('gcli/types/basic').ArrayType;

var Field = require('gcli/ui/fields').Field;
var fields = require('gcli/ui/fields');


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  fields.addField(StringField);
  fields.addField(NumberField);
  fields.addField(BooleanField);
  fields.addField(DeferredField);
  fields.addField(ArrayField);
};

exports.shutdown = function() {
  fields.removeField(StringField);
  fields.removeField(NumberField);
  fields.removeField(BooleanField);
  fields.removeField(DeferredField);
  fields.removeField(ArrayField);
};


/**
 * A field that allows editing of strings
 */
function StringField(type, options) {
  Field.call(this, type, options);
  this.arg = new Argument();

  this.element = util.createElement(this.document, 'input');
  this.element.type = 'text';
  this.element.classList.add('gcli-field');

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('keyup', this.onInputChange, false);

  this.onFieldChange = util.createEvent('StringField.onFieldChange');
}

StringField.prototype = Object.create(Field.prototype);

StringField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('keyup', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
};

StringField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.element.value = conversion.arg.text;
  this.setMessage(conversion.message);
};

StringField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = this.arg.beget({ text: this.element.value, prefixSpace: true });
  return this.type.parse(this.arg);
};

StringField.claim = function(type) {
  return type instanceof StringType ? Field.MATCH : Field.BASIC;
};


/**
 * A field that allows editing of numbers using an [input type=number] field
 */
function NumberField(type, options) {
  Field.call(this, type, options);
  this.arg = new Argument();

  this.element = util.createElement(this.document, 'input');
  this.element.type = 'number';
  if (this.type.max) {
    this.element.max = this.type.max;
  }
  if (this.type.min) {
    this.element.min = this.type.min;
  }
  if (this.type.step) {
    this.element.step = this.type.step;
  }

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('keyup', this.onInputChange, false);

  this.onFieldChange = util.createEvent('NumberField.onFieldChange');
}

NumberField.prototype = Object.create(Field.prototype);

NumberField.claim = function(type) {
  return type instanceof NumberType ? Field.MATCH : Field.NO_MATCH;
};

NumberField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('keyup', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
};

NumberField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.element.value = conversion.arg.text;
  this.setMessage(conversion.message);
};

NumberField.prototype.getConversion = function() {
  this.arg = this.arg.beget({ text: this.element.value, prefixSpace: true });
  return this.type.parse(this.arg);
};


/**
 * A field that uses a checkbox to toggle a boolean field
 */
function BooleanField(type, options) {
  Field.call(this, type, options);

  this.name = options.name;
  this.named = options.named;

  this.element = util.createElement(this.document, 'input');
  this.element.type = 'checkbox';
  this.element.id = 'gcliForm' + this.name;

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('change', this.onInputChange, false);

  this.onFieldChange = util.createEvent('BooleanField.onFieldChange');
}

BooleanField.prototype = Object.create(Field.prototype);

BooleanField.claim = function(type) {
  return type instanceof BooleanType ? Field.MATCH : Field.NO_MATCH;
};

BooleanField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('change', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
};

BooleanField.prototype.setConversion = function(conversion) {
  this.element.checked = conversion.value;
  this.setMessage(conversion.message);
};

BooleanField.prototype.getConversion = function() {
  var arg;
  if (this.named) {
    arg = this.element.checked ?
            new TrueNamedArgument(new Argument(' --' + this.name)) :
            new FalseNamedArgument();
  }
  else {
    arg = new Argument(' ' + this.element.checked);
  }
  return this.type.parse(arg);
};


/**
 * A field that works with deferred types by delaying resolution until that
 * last possible time
 */
function DeferredField(type, options) {
  Field.call(this, type, options);
  this.options = options;
  this.requisition.onAssignmentChange.add(this.update, this);

  this.element = util.createElement(this.document, 'div');
  this.update();

  this.onFieldChange = util.createEvent('DeferredField.onFieldChange');
}

DeferredField.prototype = Object.create(Field.prototype);

DeferredField.prototype.update = function() {
  var subtype = this.type.defer();
  if (subtype === this.subtype) {
    return;
  }

  if (this.field) {
    this.field.onFieldChange.remove(this.fieldChanged, this);
    this.field.destroy();
  }

  this.subtype = subtype;
  this.field = fields.getField(subtype, this.options);
  this.field.onFieldChange.add(this.fieldChanged, this);

  util.clearElement(this.element);
  this.element.appendChild(this.field.element);
};

DeferredField.claim = function(type) {
  return type instanceof DeferredType ? Field.MATCH : Field.NO_MATCH;
};

DeferredField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.requisition.onAssignmentChange.remove(this.update, this);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
};

DeferredField.prototype.setConversion = function(conversion) {
  this.field.setConversion(conversion);
};

DeferredField.prototype.getConversion = function() {
  return this.field.getConversion();
};

Object.defineProperty(DeferredField.prototype, 'isImportant', {
  get: function() {
    return this.field.isImportant;
  },
  enumerable: true
});


/**
 * Adds add/delete buttons to a normal field allowing there to be many values
 * given for a parameter.
 */
function ArrayField(type, options) {
  Field.call(this, type, options);
  this.options = options;

  this._onAdd = this._onAdd.bind(this);
  this.members = [];

  // <div class=gcliArrayParent save="${element}">
  this.element = util.createElement(this.document, 'div');
  this.element.classList.add('gcli-array-parent');

  // <button class=gcliArrayMbrAdd onclick="${_onAdd}" save="${addButton}">Add
  this.addButton = util.createElement(this.document, 'button');
  this.addButton.classList.add('gcli-array-member-add');
  this.addButton.addEventListener('click', this._onAdd, false);
  this.addButton.innerHTML = l10n.lookup('fieldArrayAdd');
  this.element.appendChild(this.addButton);

  // <div class=gcliArrayMbrs save="${mbrElement}">
  this.container = util.createElement(this.document, 'div');
  this.container.classList.add('gcli-array-members');
  this.element.appendChild(this.container);

  this.onInputChange = this.onInputChange.bind(this);

  this.onFieldChange = util.createEvent('ArrayField.onFieldChange');
}

ArrayField.prototype = Object.create(Field.prototype);

ArrayField.claim = function(type) {
  return type instanceof ArrayType ? Field.MATCH : Field.NO_MATCH;
};

ArrayField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.addButton.removeEventListener('click', this._onAdd, false);
};

ArrayField.prototype.setConversion = function(conversion) {
  // BUG 653568: this is too brutal - it removes focus from any the current field
  util.clearElement(this.container);
  this.members = [];

  conversion.conversions.forEach(function(subConversion) {
    this._onAdd(null, subConversion);
  }, this);
};

ArrayField.prototype.getConversion = function() {
  var conversions = [];
  var arrayArg = new ArrayArgument();
  for (var i = 0; i < this.members.length; i++) {
    var conversion = this.members[i].field.getConversion();
    conversions.push(conversion);
    arrayArg.addArgument(conversion.arg);
  }
  return new ArrayConversion(conversions, arrayArg);
};

ArrayField.prototype._onAdd = function(ev, subConversion) {
  // <div class=gcliArrayMbr save="${element}">
  var element = util.createElement(this.document, 'div');
  element.classList.add('gcli-array-member');
  this.container.appendChild(element);

  // ${field.element}
  var field = fields.getField(this.type.subtype, this.options);
  field.onFieldChange.add(function() {
    var conversion = this.getConversion();
    this.onFieldChange({ conversion: conversion });
    this.setMessage(conversion.message);
  }, this);

  if (subConversion) {
    field.setConversion(subConversion);
  }
  element.appendChild(field.element);

  // <div class=gcliArrayMbrDel onclick="${_onDel}">
  var delButton = util.createElement(this.document, 'button');
  delButton.classList.add('gcli-array-member-del');
  delButton.addEventListener('click', this._onDel, false);
  delButton.innerHTML = l10n.lookup('fieldArrayDel');
  element.appendChild(delButton);

  var member = {
    element: element,
    field: field,
    parent: this
  };
  member.onDelete = function() {
    this.parent.container.removeChild(this.element);
    this.parent.members = this.parent.members.filter(function(test) {
      return test !== this;
    });
    this.parent.onInputChange();
  }.bind(member);
  delButton.addEventListener('click', member.onDelete, false);

  this.members.push(member);
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/fields', ['require', 'exports', 'module' , 'gcli/util', 'gcli/types/basic'], function(require, exports, module) {


var util = require('gcli/util');
var KeyEvent = require('gcli/util').KeyEvent;

var BlankType = require('gcli/types/basic').BlankType;

/**
 * A Field is a way to get input for a single parameter.
 * This class is designed to be inherited from. It's important that all
 * subclasses have a similar constructor signature because they are created
 * via getField(...)
 * @param type The type to use in conversions
 * @param options A set of properties to help fields configure themselves:
 * - document: The document we use in calling createElement
 * - named: Is this parameter named? That is to say, are positional
 *         arguments disallowed, if true, then we need to provide updates to
 *         the command line that explicitly name the parameter in use
 *         (e.g. --verbose, or --name Fred rather than just true or Fred)
 * - name: If this parameter is named, what name should we use
 * - requisition: The requisition that we're attached to
 * - required: Boolean to indicate if this is a mandatory field
 */
function Field(type, options) {
  this.type = type;
  this.document = options.document;
  this.requisition = options.requisition;
}

/**
 * Subclasses should assign their element with the DOM node that gets added
 * to the 'form'. It doesn't have to be an input node, just something that
 * contains it.
 */
Field.prototype.element = undefined;

/**
 * Indicates that this field should drop any resources that it has created
 */
Field.prototype.destroy = function() {
  delete this.messageElement;
};

/**
 * Update this field display with the value from this conversion.
 * Subclasses should provide an implementation of this function.
 */
Field.prototype.setConversion = function(conversion) {
  throw new Error('Field should not be used directly');
};

/**
 * Extract a conversion from the values in this field.
 * Subclasses should provide an implementation of this function.
 */
Field.prototype.getConversion = function() {
  throw new Error('Field should not be used directly');
};

/**
 * Set the element where messages and validation errors will be displayed
 * @see setMessage()
 */
Field.prototype.setMessageElement = function(element) {
  this.messageElement = element;
};

/**
 * Display a validation message in the UI
 */
Field.prototype.setMessage = function(message) {
  if (this.messageElement) {
    if (message == null) {
      message = '';
    }
    util.setContents(this.messageElement, message);
  }
};

/**
 * Method to be called by subclasses when their input changes, which allows us
 * to properly pass on the onFieldChange event.
 */
Field.prototype.onInputChange = function(ev) {
  var conversion = this.getConversion();
  this.onFieldChange({ conversion: conversion });
  this.setMessage(conversion.message);

  if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
    this.requisition.exec();
  }
};

/**
 * Some fields contain information that is more important to the user, for
 * example error messages and completion menus.
 */
Field.prototype.isImportant = false;

/**
 * 'static/abstract' method to allow implementations of Field to lay a claim
 * to a type. This allows claims of various strength to be weighted up.
 * See the Field.*MATCH values.
 */
Field.claim = function() {
  throw new Error('Field should not be used directly');
};

/**
 * About minimalism - If we're producing a dialog, we want a field for every
 * parameter. If we're providing a quick tooltip, we only want a field when
 * it's really going to help.
 * The getField() function takes an option of 'tooltip: true'. Fields are
 * expected to reply with a TOOLTIP_* constant if they should be shown in the
 * tooltip case.
 */
Field.TOOLTIP_MATCH = 5;   // A best match, that works for a tooltip
Field.TOOLTIP_DEFAULT = 4; // A default match that should show in a tooltip
Field.MATCH = 3;           // Match, but ignorable if we're being minimalist
Field.DEFAULT = 2;         // This is a default (non-minimalist) match
Field.BASIC = 1;           // OK in an emergency. i.e. assume Strings
Field.NO_MATCH = 0;        // This field can't help with the given type

exports.Field = Field;


/**
 * Internal array of known fields
 */
var fieldCtors = [];

/**
 * Add a field definition by field constructor
 * @param fieldCtor Constructor function of new Field
 */
exports.addField = function(fieldCtor) {
  if (typeof fieldCtor !== 'function') {
    console.error('addField erroring on ', fieldCtor);
    throw new Error('addField requires a Field constructor');
  }
  fieldCtors.push(fieldCtor);
};

/**
 * Remove a Field definition
 * @param field A previously registered field, specified either with a field
 * name or from the field name
 */
exports.removeField = function(field) {
  if (typeof field !== 'string') {
    fields = fields.filter(function(test) {
      return test !== field;
    });
    delete fields[field];
  }
  else if (field instanceof Field) {
    removeField(field.name);
  }
  else {
    console.error('removeField erroring on ', field);
    throw new Error('removeField requires an instance of Field');
  }
};

/**
 * Find the best possible matching field from the specification of the type
 * of field required.
 * @param type An instance of Type that we will represent
 * @param options A set of properties that we should attempt to match, and use
 * in the construction of the new field object:
 * - document: The document to use in creating new elements
 * - name: The parameter name, (i.e. assignment.param.name)
 * - requisition: The requisition we're monitoring,
 * - required: Is this a required parameter (i.e. param.isDataRequired)
 * - named: Is this a named parameters (i.e. !param.isPositionalAllowed)
 * @return A newly constructed field that best matches the input options
 */
exports.getField = function(type, options) {
  var ctor;
  var highestClaim = -1;
  fieldCtors.forEach(function(fieldCtor) {
    var claim = fieldCtor.claim(type);
    if (claim > highestClaim) {
      highestClaim = claim;
      ctor = fieldCtor;
    }
  });

  if (!ctor) {
    console.error('Unknown field type ', type, ' in ', fieldCtors);
    throw new Error('Can\'t find field for ' + type);
  }

  if (options.tooltip && highestClaim < Field.TOOLTIP_DEFAULT) {
    return new BlankField(type, options);
  }

  return new ctor(type, options);
};


/**
 * For use with deferred types that do not yet have anything to resolve to.
 * BlankFields are not for general use.
 */
function BlankField(type, options) {
  Field.call(this, type, options);

  this.element = util.createElement(this.document, 'div');

  this.onFieldChange = util.createEvent('BlankField.onFieldChange');
}

BlankField.prototype = Object.create(Field.prototype);

BlankField.claim = function(type) {
  return type instanceof BlankType ? Field.MATCH : Field.NO_MATCH;
};

BlankField.prototype.setConversion = function(conversion) {
  this.setMessage(conversion.message);
};

BlankField.prototype.getConversion = function() {
  return this.type.parse(new Argument());
};

exports.addField(BlankField);


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/fields/javascript', ['require', 'exports', 'module' , 'gcli/util', 'gcli/argument', 'gcli/types/javascript', 'gcli/ui/fields/menu', 'gcli/ui/fields'], function(require, exports, module) {


var util = require('gcli/util');

var ScriptArgument = require('gcli/argument').ScriptArgument;
var JavascriptType = require('gcli/types/javascript').JavascriptType;

var Menu = require('gcli/ui/fields/menu').Menu;
var Field = require('gcli/ui/fields').Field;
var fields = require('gcli/ui/fields');


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  fields.addField(JavascriptField);
};

exports.shutdown = function() {
  fields.removeField(JavascriptField);
};


/**
 * A field that allows editing of javascript
 */
function JavascriptField(type, options) {
  Field.call(this, type, options);

  this.onInputChange = this.onInputChange.bind(this);
  this.arg = new ScriptArgument('', '{ ', ' }');

  this.element = util.createElement(this.document, 'div');

  this.input = util.createElement(this.document, 'input');
  this.input.type = 'text';
  this.input.addEventListener('keyup', this.onInputChange, false);
  this.input.classList.add('gcli-field');
  this.input.classList.add('gcli-field-javascript');
  this.element.appendChild(this.input);

  this.menu = new Menu({
    document: this.document,
    field: true,
    type: type
  });
  this.element.appendChild(this.menu.element);

  this.setConversion(this.type.parse(new ScriptArgument('')));

  this.onFieldChange = util.createEvent('JavascriptField.onFieldChange');

  // i.e. Register this.onItemClick as the default action for a menu click
  this.menu.onItemClick.add(this.itemClicked, this);
}

JavascriptField.prototype = Object.create(Field.prototype);

JavascriptField.claim = function(type) {
  return type instanceof JavascriptType ? Field.TOOLTIP_MATCH : Field.NO_MATCH;
};

JavascriptField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.input.removeEventListener('keyup', this.onInputChange, false);
  this.menu.onItemClick.remove(this.itemClicked, this);
  this.menu.destroy();
  delete this.element;
  delete this.input;
  delete this.menu;
  delete this.document;
  delete this.onInputChange;
};

JavascriptField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.input.value = conversion.arg.text;

  var prefixLen = 0;
  if (this.type instanceof JavascriptType) {
    var typed = conversion.arg.text;
    var lastDot = typed.lastIndexOf('.');
    if (lastDot !== -1) {
      prefixLen = lastDot;
    }
  }

  var items = [];
  var predictions = conversion.getPredictions();
  predictions.forEach(function(item) {
    // Commands can be hidden
    if (!item.hidden) {
      items.push({
        name: item.name.substring(prefixLen),
        complete: item.name,
        description: item.description || ''
      });
    }
  }, this);

  this.menu.show(items);
  this.setMessage(conversion.message);
};

JavascriptField.prototype.itemClicked = function(ev) {
  this.onFieldChange(ev);
  this.setMessage(ev.conversion.message);
};

JavascriptField.prototype.onInputChange = function(ev) {
  this.item = ev.currentTarget.item;
  var conversion = this.getConversion();
  this.onFieldChange({ conversion: conversion });
  this.setMessage(conversion.message);
};

JavascriptField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = new ScriptArgument(this.input.value, '{ ', ' }');
  return this.type.parse(this.arg);
};

JavascriptField.DEFAULT_VALUE = '__JavascriptField.DEFAULT_VALUE';


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/fields/menu', ['require', 'exports', 'module' , 'gcli/util', 'gcli/l10n', 'gcli/argument', 'gcli/types', 'gcli/canon', 'gcli/ui/domtemplate', 'text!gcli/ui/fields/menu.css', 'text!gcli/ui/fields/menu.html'], function(require, exports, module) {


var util = require('gcli/util');
var l10n = require('gcli/l10n');

var Argument = require('gcli/argument').Argument;
var Conversion = require('gcli/types').Conversion;
var canon = require('gcli/canon');

var domtemplate = require('gcli/ui/domtemplate');

var menuCss = require('text!gcli/ui/fields/menu.css');
var menuHtml = require('text!gcli/ui/fields/menu.html');


/**
 * Menu is a display of the commands that are possible given the state of a
 * requisition.
 * @param options A way to customize the menu display. Valid options are:
 * - field: [boolean] Turns the menu display into a drop-down for use inside a
 *   JavascriptField.
 * - document: The document to use in creating widgets
 * - menuClass: Custom class name when generating the top level element
 *   which allows different layout systems
 * - type: The version of SelectionType that we're picking an option from
 */
function Menu(options) {
  options = options || {};
  this.document = options.document || document;
  this.type = options.type;

  // FF can be really hard to debug if doc is null, so we check early on
  if (!this.document) {
    throw new Error('No document');
  }

  this.element =  util.createElement(this.document, 'div');
  this.element.classList.add(options.menuClass || 'gcli-menu');
  if (options && options.field) {
    this.element.classList.add(options.menuFieldClass || 'gcli-menu-field');
  }

  // Pull the HTML into the DOM, but don't add it to the document
  if (menuCss != null) {
    util.importCss(menuCss, this.document, 'gcli-menu');
  }

  this.template = util.toDom(this.document, menuHtml);
  this.templateOptions = { blankNullUndefined: true, stack: 'menu.html' };

  // Contains the items that should be displayed
  this.items = null;

  this.onItemClick = util.createEvent('Menu.onItemClick');
}

/**
 * Allow the template engine to get at localization strings
 */
Menu.prototype.l10n = l10n.propertyLookup;

/**
 * Avoid memory leaks
 */
Menu.prototype.destroy = function() {
  delete this.element;
  delete this.template;
  delete this.document;
};

/**
 * The default is to do nothing when someone clicks on the menu.
 * This is called from template.html
 * @param ev The click event from the browser
 */
Menu.prototype.onItemClickInternal = function(ev) {
  var name = ev.currentTarget.querySelector('.gcli-menu-name').innerHTML;
  var arg = new Argument(name);
  arg.suffix = ' ';

  var conversion = this.type.parse(arg);
  this.onItemClick({ conversion: conversion });
};

/**
 * Display a number of items in the menu (or hide the menu if there is nothing
 * to display)
 * @param items The items to show in the menu
 * @param match Matching text to highlight in the output
 */
Menu.prototype.show = function(items, match) {
  this.items = items.filter(function(item) {
    return item.hidden === undefined || item.hidden !== true;
  }.bind(this));

  if (match) {
    this.items = this.items.map(function(item) {
      return gethighlightingProxy(item, match, this.template.ownerDocument);
    }.bind(this));
  }

  if (this.items.length === 0) {
    this.element.style.display = 'none';
    return;
  }

  if (this.items.length >= Conversion.maxPredictions) {
    this.items.splice(-1);
    this.items.hasMore = true;
  }

  var options = this.template.cloneNode(true);
  domtemplate.template(options, this, this.templateOptions);

  util.clearElement(this.element);
  this.element.appendChild(options);

  this.element.style.display = 'block';
};

/**
 * Create a proxy around an item that highlights matching text
 */
function gethighlightingProxy(item, match, document) {
  if (typeof Proxy === 'undefined') {
    return item;
  }
  return Proxy.create({
    get: function(rcvr, name) {
      var value = item[name];
      if (name !== 'name') {
        return value;
      }

      var startMatch = value.indexOf(match);
      if (startMatch === -1) {
        return value;
      }

      var before = value.substr(0, startMatch);
      var after = value.substr(startMatch + match.length);
      var parent = document.createElement('span');
      parent.appendChild(document.createTextNode(before));
      var highlight = document.createElement('span');
      highlight.classList.add('gcli-menu-typed');
      highlight.appendChild(document.createTextNode(match));
      parent.appendChild(highlight);
      parent.appendChild(document.createTextNode(after));
      return parent;
    }
  });
}

/**
 * Highlight a given option
 */
Menu.prototype.setChoiceIndex = function(choice) {
  var nodes = this.element.querySelectorAll('.gcli-menu-option');
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].classList.remove('gcli-menu-highlight');
  }

  if (choice == null) {
    return;
  }

  if (nodes.length <= choice) {
    console.error('Cant highlight ' + choice + '. Only ' + nodes.length + ' options');
    return;
  }

  nodes.item(choice).classList.add('gcli-menu-highlight');
};

/**
 * Allow the inputter to use RETURN to chose the current menu item when
 * it can't execute the command line
 * @return true if an item was 'clicked', false otherwise
 */
Menu.prototype.selectChoice = function() {
  var selected = this.element.querySelector('.gcli-menu-highlight .gcli-menu-name');
  if (!selected) {
    return false;
  }

  var name = selected.innerHTML;
  var arg = new Argument(name);
  arg.suffix = ' ';

  var conversion = this.type.parse(arg);
  this.onItemClick({ conversion: conversion });
  return true;
};

/**
 * Hide the menu
 */
Menu.prototype.hide = function() {
  this.element.style.display = 'none';
};

/**
 * Change how much vertical space this menu can take up
 */
Menu.prototype.setMaxHeight = function(height) {
  this.element.style.maxHeight = height + 'px';
};

exports.Menu = Menu;


});
define("text!gcli/ui/fields/menu.css", [], "\n" +
  ".gcli-menu {\n" +
  "  width: 100%;\n" +
  "  overflow: hidden;\n" +
  "  font-size: 90%;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-field {\n" +
  "  border: 1px solid #aaa;\n" +
  "  border-top: 0;\n" +
  "  border-bottom-right-radius: 5px;\n" +
  "  border-bottom-left-radius: 5px;\n" +
  "  max-height: 300px;\n" +
  "  margin: 0 3px;\n" +
  "  padding: 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-template {\n" +
  "  border-collapse: collapse;\n" +
  "  width: 100%;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-option {\n" +
  "  overflow: hidden;\n" +
  "  white-space: nowrap;\n" +
  "  cursor: pointer;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-option:hover {\n" +
  "  background-image: -moz-linear-gradient(top, #f8f8f8, #ccc);\n" +
  "  background-color: #ddd;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-name {\n" +
  "  padding: 2px 3px;\n" +
  "  -moz-padding-start: 8px;\n" +
  "  -webkit-padding-start: 8px;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-desc {\n" +
  "  color: #777;\n" +
  "  padding: 0 3px;\n" +
  "  -moz-padding-end: 8px;\n" +
  "  -webkit-padding-end: 8px;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-highlight,\n" +
  ".gcli-menu-highlight.gcli-menu-option:hover {\n" +
  "  background-image: -moz-linear-gradient(top, #eee, #b8b8b8);\n" +
  "  background-color: #c8c8c8;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-typed {\n" +
  "  color: #FF6600;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-more {\n" +
  "  font-size: 80%;\n" +
  "  text-align: right;\n" +
  "  -moz-padding-end: 8px;\n" +
  "  -webkit-padding-end: 8px;\n" +
  "}\n" +
  "");

define("text!gcli/ui/fields/menu.html", [], "\n" +
  "<div>\n" +
  "  <table class=\"gcli-menu-template\" aria-live=\"polite\">\n" +
  "    <tr class=\"gcli-menu-option\" foreach=\"item in ${items}\"\n" +
  "        onclick=\"${onItemClickInternal}\" title=\"${item.manual}\">\n" +
  "      <td class=\"gcli-menu-name\">${item.name}</td>\n" +
  "      <td class=\"gcli-menu-desc\">${item.description}</td>\n" +
  "    </tr>\n" +
  "  </table>\n" +
  "  <div class=\"gcli-menu-more\" if=\"${items.hasMore}\">${l10n.fieldMenuMore}</div>\n" +
  "</div>\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/fields/selection', ['require', 'exports', 'module' , 'gcli/util', 'gcli/l10n', 'gcli/argument', 'gcli/types', 'gcli/types/basic', 'gcli/types/selection', 'gcli/ui/fields/menu', 'gcli/ui/fields'], function(require, exports, module) {


var util = require('gcli/util');
var l10n = require('gcli/l10n');

var Argument = require('gcli/argument').Argument;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var BooleanType = require('gcli/types/basic').BooleanType;
var SelectionType = require('gcli/types/selection').SelectionType;

var Menu = require('gcli/ui/fields/menu').Menu;
var Field = require('gcli/ui/fields').Field;
var fields = require('gcli/ui/fields');


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  fields.addField(SelectionField);
  fields.addField(SelectionTooltipField);
};

exports.shutdown = function() {
  fields.removeField(SelectionField);
  fields.removeField(SelectionTooltipField);
};


/**
 * Model an instanceof SelectionType as a select input box.
 * <p>There are 3 slightly overlapping concepts to be aware of:
 * <ul>
 * <li>value: This is the (probably non-string) value, known as a value by the
 *   assignment
 * <li>optValue: This is the text value as known by the DOM option element, as
 *   in &lt;option value=???%gt...
 * <li>optText: This is the contents of the DOM option element.
 * </ul>
 */
function SelectionField(type, options) {
  Field.call(this, type, options);

  this.items = [];

  this.element = util.createElement(this.document, 'select');
  this.element.classList.add('gcli-field');
  this._addOption({
    name: l10n.lookupFormat('fieldSelectionSelect', [ options.name ])
  });
  var lookup = this.type.getLookup();
  lookup.forEach(this._addOption, this);

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('change', this.onInputChange, false);

  this.onFieldChange = util.createEvent('SelectionField.onFieldChange');
}

SelectionField.prototype = Object.create(Field.prototype);

SelectionField.claim = function(type) {
  if (type instanceof BooleanType) {
    return Field.BASIC;
  }
  return type instanceof SelectionType ? Field.DEFAULT : Field.NO_MATCH;
};

SelectionField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('change', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
};

SelectionField.prototype.setConversion = function(conversion) {
  var index;
  this.items.forEach(function(item) {
    if (item.value && item.value === conversion.value) {
      index = item.index;
    }
  }, this);
  this.element.value = index;
  this.setMessage(conversion.message);
};

SelectionField.prototype.getConversion = function() {
  var item = this.items[this.element.value];
  return this.type.parse(new Argument(item.name, ' '));
};

SelectionField.prototype._addOption = function(item) {
  item.index = this.items.length;
  this.items.push(item);

  var option = util.createElement(this.document, 'option');
  option.innerHTML = item.name;
  option.value = item.index;
  this.element.appendChild(option);
};


/**
 * A field that allows selection of one of a number of options
 */
function SelectionTooltipField(type, options) {
  Field.call(this, type, options);

  this.onInputChange = this.onInputChange.bind(this);
  this.arg = new Argument();

  this.menu = new Menu({ document: this.document, type: type });
  this.element = this.menu.element;

  this.onFieldChange = util.createEvent('SelectionTooltipField.onFieldChange');

  // i.e. Register this.onItemClick as the default action for a menu click
  this.menu.onItemClick.add(this.itemClicked, this);
}

SelectionTooltipField.prototype = Object.create(Field.prototype);

SelectionTooltipField.claim = function(type) {
  return type.getType() instanceof SelectionType ? Field.TOOLTIP_MATCH : Field.NO_MATCH;
};

SelectionTooltipField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.menu.onItemClick.remove(this.itemClicked, this);
  this.menu.destroy();
  delete this.element;
  delete this.document;
  delete this.onInputChange;
};

SelectionTooltipField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  var items = conversion.getPredictions().map(function(prediction) {
    // If the prediction value is an 'item' (that is an object with a name and
    // description) then use that, otherwise use the prediction itself, because
    // at least that has a name.
    return prediction.value.description ? prediction.value : prediction;
  }, this);
  this.menu.show(items, conversion.arg.text);
  this.setMessage(conversion.message);
};

SelectionTooltipField.prototype.itemClicked = function(ev) {
  this.onFieldChange(ev);
  this.setMessage(ev.conversion.message);
};

SelectionTooltipField.prototype.onInputChange = function(ev) {
  this.item = ev.currentTarget.item;
  var conversion = this.getConversion();
  this.onFieldChange({ conversion: conversion });
  this.setMessage(conversion.message);
};

SelectionTooltipField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = this.arg.beget({ text: this.input.value });
  return this.type.parse(this.arg);
};

/**
 * Allow the menu to highlight the correct prediction choice
 */
SelectionTooltipField.prototype.setChoiceIndex = function(choice) {
  this.menu.setChoiceIndex(choice);
};

/**
 * Allow the inputter to use RETURN to chose the current menu item when
 * it can't execute the command line
 * @return true if an item was 'clicked', false otherwise
 */
SelectionTooltipField.prototype.selectChoice = function() {
  return this.menu.selectChoice();
};

Object.defineProperty(SelectionTooltipField.prototype, 'isImportant', {
  get: function() {
    return this.type.name !== 'command';
  },
  enumerable: true
});

SelectionTooltipField.DEFAULT_VALUE = '__SelectionTooltipField.DEFAULT_VALUE';


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/display', ['require', 'exports', 'module' , 'gcli/util', 'gcli/settings', 'gcli/ui/intro', 'gcli/ui/domtemplate', 'gcli/ui/tooltip', 'gcli/ui/output_terminal', 'gcli/ui/inputter', 'gcli/ui/completer', 'gcli/ui/focus', 'gcli/ui/prompt', 'gcli/cli', 'text!gcli/ui/display.css', 'text!gcli/ui/display.html'], function(require, exports, module) {


var util = require('gcli/util');
var settings = require('gcli/settings');
var intro = require('gcli/ui/intro');
var domtemplate = require('gcli/ui/domtemplate');

var Tooltip = require('gcli/ui/tooltip').Tooltip;
var OutputTerminal = require('gcli/ui/output_terminal').OutputTerminal;
var Inputter = require('gcli/ui/inputter').Inputter;
var Completer = require('gcli/ui/completer').Completer;
var FocusManager = require('gcli/ui/focus').FocusManager;
var Prompt = require('gcli/ui/prompt').Prompt;

var Requisition = require('gcli/cli').Requisition;

var displayCss = require('text!gcli/ui/display.css');
var displayHtml = require('text!gcli/ui/display.html');


/**
 * createDisplay() calls 'new Display()' but returns an object which exposes a
 * much restricted set of functions rather than all those exposed by Display.
 * This allows for robust testing without exposing too many internals.
 * @param options See Display() for a description of the available options.
 */
exports.createDisplay = function(options) {
  if (options.settings != null) {
    settings.setDefaults(options.settings);
  }
  var display = new Display(options);
  var requisition = display.requisition;
  return {
    /**
     * The exact shape of the object returned by exec is likely to change in
     * the near future. If you do use it, please expect your code to break.
     */
    exec: requisition.exec.bind(requisition),
    update: requisition.update.bind(requisition),
    destroy: display.destroy.bind(display)
  };
};

/**
 * View is responsible for generating the web UI for GCLI.
 * @param options Object containing user customization properties.
 * See the documentation for the other components for more details.
 * Options supported directly include:
 * - document (default=document):
 * - environment (default={}):
 * - dontDecorate (default=false):
 * - inputElement (default=#gcli-input):
 * - completeElement (default=#gcli-row-complete):
 * - displayElement (default=#gcli-display):
 * - promptElement (default=#gcli-prompt):
 */
function Display(options) {
  var doc = options.document || document;

  this.displayStyle = undefined;
  if (displayCss != null) {
    this.displayStyle = util.importCss(displayCss, doc, 'gcli-css-display');
  }

  // Configuring the document is complex because on the web side, there is an
  // active desire to have nothing to configure, where as when embedded in
  // Firefox there could be up to 4 documents, some of which can/should be
  // derived from some root element.
  // When a component uses a document to create elements for use under a known
  // root element, then we pass in the element (if we have looked it up
  // already) or an id/document
  this.requisition = new Requisition(options.enviroment || {}, doc);

  this.focusManager = new FocusManager(options, {
    document: doc
  });

  this.inputElement = find(doc, options.inputElement || null, 'gcli-input');
  this.inputter = new Inputter(options, {
    requisition: this.requisition,
    focusManager: this.focusManager,
    element: this.inputElement
  });

  // autoResize logic: we want Completer to keep the elements at the same
  // position if we created the completion element, but if someone else created
  // it, then it's their job.
  this.completeElement = insert(this.inputElement,
                         options.completeElement || null, 'gcli-row-complete');
  this.completer = new Completer(options, {
    requisition: this.requisition,
    inputter: this.inputter,
    autoResize: this.completeElement.gcliCreated,
    element: this.completeElement
  });

  this.prompt = new Prompt(options, {
    inputter: this.inputter,
    element: insert(this.inputElement,
                    options.promptElement || null, 'gcli-prompt')
  });

  this.element = find(doc, options.displayElement || null, 'gcli-display');
  this.element.classList.add('gcli-display');

  this.template = util.toDom(doc, displayHtml);
  this.elements = {};
  domtemplate.template(this.template, this.elements, { stack: 'display.html' });
  this.element.appendChild(this.template);

  this.tooltip = new Tooltip(options, {
    requisition: this.requisition,
    inputter: this.inputter,
    focusManager: this.focusManager,
    element: this.elements.tooltip,
    panelElement: this.elements.panel
  });

  this.inputter.tooltip = this.tooltip;

  this.outputElement = util.createElement(doc, 'div');
  this.outputElement.classList.add('gcli-output');
  this.outputList = new OutputTerminal(options, {
    requisition: this.requisition,
    element: this.outputElement
  });

  this.element.appendChild(this.outputElement);

  intro.maybeShowIntro(this.outputList.commandOutputManager, this.requisition);
}

/**
 * Call the destroy functions of the components that we created
 */
Display.prototype.destroy = function() {
  delete this.element;
  delete this.template;

  this.outputList.destroy();
  delete this.outputList;
  delete this.outputElement;

  this.tooltip.destroy();
  delete this.tooltip;

  this.prompt.destroy();
  delete this.prompt;

  this.completer.destroy();
  delete this.completer;
  delete this.completeElement;

  this.inputter.destroy();
  delete this.inputter;
  delete this.inputElement;

  this.focusManager.destroy();
  delete this.focusManager;

  this.requisition.destroy();
  delete this.requisition;

  if (this.displayStyle) {
    this.displayStyle.parentNode.removeChild(this.displayStyle);
  }
  delete this.displayStyle;
};

exports.Display = Display;

/**
 * Utility to help find an element by id, throwing if it wasn't found
 */
function find(doc, element, id) {
  if (!element) {
    element = doc.getElementById(id);
    if (!element) {
      throw new Error('Missing element, id=' + id);
    }
  }
  return element;
}

/**
 * Utility to help find an element by id, creating it if it wasn't found
 */
function insert(sibling, element, id) {
  var doc = sibling.ownerDocument;
  if (!element) {
    element = doc.getElementById('gcli-row-complete');
    if (!element) {
      element = util.createElement(doc, 'div');
      sibling.parentNode.insertBefore(element, sibling.nextSibling);
      element.gcliCreated = true;
    }
  }
  return element;
}


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/tooltip', ['require', 'exports', 'module' , 'gcli/util', 'gcli/cli', 'gcli/ui/fields', 'gcli/ui/domtemplate', 'text!gcli/ui/tooltip.css', 'text!gcli/ui/tooltip.html'], function(require, exports, module) {


var util = require('gcli/util');
var CommandAssignment = require('gcli/cli').CommandAssignment;

var fields = require('gcli/ui/fields');
var domtemplate = require('gcli/ui/domtemplate');

var tooltipCss = require('text!gcli/ui/tooltip.css');
var tooltipHtml = require('text!gcli/ui/tooltip.html');


/**
 * A widget to display an inline dialog which allows the user to fill out
 * the arguments to a command.
 * @param options Object containing user customization properties, including:
 * - tooltipClass (default='gcli-tooltip'): Custom class name when generating
 *   the top level element which allows different layout systems
 * @param components Object that links to other UI components. GCLI provided:
 * - requisition: The Requisition to fill out
 * - inputter: An instance of Inputter
 * - focusManager: Component to manage hiding/showing this element
 * - panelElement (optional): The element to show/hide on visibility events
 * - element: The root element to populate
 */
function Tooltip(options, components) {
  this.inputter = components.inputter;
  this.requisition = components.requisition;
  this.focusManager = components.focusManager;

  this.element = components.element;
  this.element.classList.add(options.tooltipClass || 'gcli-tooltip');
  this.document = this.element.ownerDocument;

  this.panelElement = components.panelElement;
  if (this.panelElement) {
    this.panelElement.classList.add('gcli-panel-hide');
    this.focusManager.onVisibilityChange.add(this.visibilityChanged, this);
  }
  this.focusManager.addMonitoredElement(this.element, 'tooltip');

  // We cache the fields we create so we can destroy them later
  this.fields = [];

  // Pull the HTML into the DOM, but don't add it to the document
  if (tooltipCss != null) {
    this.style = util.importCss(tooltipCss, this.document, 'gcli-tooltip');
  }

  this.template = util.toDom(this.document, tooltipHtml);
  this.templateOptions = { blankNullUndefined: true, stack: 'tooltip.html' };

  this.inputter.onChoiceChange.add(this.choiceChanged, this);
  this.inputter.onAssignmentChange.add(this.assignmentChanged, this);

  // We keep a track of which assignment the cursor is in
  this.assignment = undefined;
  this.assignmentChanged({ assignment: this.inputter.assignment });
}

/**
 * Avoid memory leaks
 */
Tooltip.prototype.destroy = function() {
  this.inputter.onAssignmentChange.remove(this.assignmentChanged, this);
  this.inputter.onChoiceChange.remove(this.choiceChanged, this);

  if (this.panelElement) {
    this.focusManager.onVisibilityChange.remove(this.visibilityChanged, this);
  }
  this.focusManager.removeMonitoredElement(this.element, 'tooltip');

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  this.field.onFieldChange.remove(this.fieldChanged, this);
  this.field.destroy();

  delete this.errorEle;
  delete this.descriptionEle;
  delete this.highlightEle;

  delete this.document;
  delete this.element;
  delete this.panelElement;
  delete this.template;
};

/**
 * The inputter acts on UP/DOWN if there is a menu showing
 */
Object.defineProperty(Tooltip.prototype, 'isMenuShowing', {
  get: function() {
    return this.focusManager.isTooltipVisible &&
           this.field != null &&
           this.field.menu != null;
  },
  enumerable: true
});

/**
 * Called whenever the assignment that we're providing help with changes
 */
Tooltip.prototype.assignmentChanged = function(ev) {
  // This can be kicked off either by requisition doing an assign or by
  // inputter noticing a cursor movement out of a command, so we should check
  // that this really is a new assignment
  if (this.assignment === ev.assignment) {
    return;
  }

  if (this.assignment) {
    this.assignment.onAssignmentChange.remove(this.assignmentContentsChanged, this);
  }
  this.assignment = ev.assignment;

  if (this.field) {
    this.field.onFieldChange.remove(this.fieldChanged, this);
    this.field.destroy();
  }

  this.field = fields.getField(this.assignment.param.type, {
    document: this.document,
    name: this.assignment.param.name,
    requisition: this.requisition,
    required: this.assignment.param.isDataRequired,
    named: !this.assignment.param.isPositionalAllowed,
    tooltip: true
  });

  this.focusManager.setImportantFieldFlag(this.field.isImportant);

  this.field.onFieldChange.add(this.fieldChanged, this);
  this.assignment.onAssignmentChange.add(this.assignmentContentsChanged, this);

  this.field.setConversion(this.assignment.conversion);

  // Filled in by the template process
  this.errorEle = undefined;
  this.descriptionEle = undefined;
  this.highlightEle = undefined;

  var contents = this.template.cloneNode(true);
  domtemplate.template(contents, this, this.templateOptions);
  util.clearElement(this.element);
  this.element.appendChild(contents);
  this.element.style.display = 'block';

  this.field.setMessageElement(this.errorEle);

  this._updatePosition();
};

/**
 * Forward the event to the current field
 */
Tooltip.prototype.choiceChanged = function(ev) {
  if (this.field && this.field.setChoiceIndex) {
    var choice = this.assignment.conversion.constrainPredictionIndex(ev.choice);
    this.field.setChoiceIndex(choice);
  }
};

/**
 * Allow the inputter to use RETURN to chose the current menu item when
 * it can't execute the command line
 * @return true if there was a selection to use, false otherwise
 */
Tooltip.prototype.selectChoice = function(ev) {
  if (this.field && this.field.selectChoice) {
    return this.field.selectChoice();
  }
  return false;
};

/**
 * Called by the onFieldChange event on the current Field
 */
Tooltip.prototype.fieldChanged = function(ev) {
  this.assignment.setConversion(ev.conversion);

  var isError = ev.conversion.message != null && ev.conversion.message !== '';
  this.focusManager.setError(isError);

  // Nasty hack, the inputter won't know about the text change yet, so it will
  // get it's calculations wrong. We need to wait until the current set of
  // changes has had a chance to propagate
  this.document.defaultView.setTimeout(function() {
    this.inputter.focus();
  }.bind(this), 10);
};

/**
 * Called by the onAssignmentChange event on the current Assignment
 */
Tooltip.prototype.assignmentContentsChanged = function(ev) {
  // Assignments fire AssignmentChange events on any change, including minor
  // things like whitespace change in arg prefix, so we ignore anything but
  // an actual value change.
  if (ev.conversion.arg.text === ev.oldConversion.arg.text) {
    return;
  }

  this.field.setConversion(ev.conversion);
  util.setContents(this.descriptionEle, this.description);

  this._updatePosition();
};

/**
 * Called to move the tooltip to the correct horizontal position
 */
Tooltip.prototype._updatePosition = function() {
  var dimensions = this.getDimensionsOfAssignment();

  // 10 is roughly the width of a char
  if (this.panelElement) {
    this.panelElement.style.left = (dimensions.start * 10) + 'px';
  }

  this.focusManager.updatePosition(dimensions);
};

/**
 * Returns a object containing 'start' and 'end' properties which identify the
 * number of pixels from the left hand edge of the input element that represent
 * the text portion of the current assignment.
 */
Tooltip.prototype.getDimensionsOfAssignment = function() {
  var before = '';
  var assignments = this.requisition.getAssignments(true);
  for (var i = 0; i < assignments.length; i++) {
    if (assignments[i] === this.assignment) {
      break;
    }
    before += assignments[i].toString();
  }
  before += this.assignment.arg.prefix;

  var startChar = before.length;
  before += this.assignment.arg.text;
  var endChar = before.length;

  return { start: startChar, end: endChar };
};

/**
 * The description (displayed at the top of the hint area) should be blank if
 * we're entering the CommandAssignment (because it's obvious) otherwise it's
 * the parameter description.
 */
Object.defineProperty(Tooltip.prototype, 'description', {
  get: function() {
    if (this.assignment instanceof CommandAssignment &&
            this.assignment.value == null) {
      return '';
    }

    var output = this.assignment.param.manual;
    if (output) {
      var wrapper = this.document.createElement('span');
      util.setContents(wrapper, output);
      if (!this.assignment.param.isDataRequired) {
        var optional = this.document.createElement('span');
        optional.appendChild(this.document.createTextNode(' (Optional)'));
        wrapper.appendChild(optional);
      }
      return wrapper;
    }

    return this.assignment.param.description;
  },
  enumerable: true
});

/**
 * Tweak CSS to show/hide the output
 */
Tooltip.prototype.visibilityChanged = function(ev) {
  if (!this.panelElement) {
    return;
  }

  if (ev.tooltipVisible) {
    this.panelElement.classList.remove('gcli-panel-hide');
  }
  else {
    this.panelElement.classList.add('gcli-panel-hide');
  }
};

exports.Tooltip = Tooltip;


});
define("text!gcli/ui/tooltip.css", [], "\n" +
  ".gcli-panel {\n" +
  "  -moz-transition-property: opacity, height;\n" +
  "  -moz-transition-duration: 0.5s, 2s;\n" +
  "  overflow-y: auto;\n" +
  "  overflow-x: hidden;\n" +
  "  z-index: 2;\n" +
  "  position: absolute;\n" +
  "  max-height: 100%;\n" +
  "  max-width: 350px;\n" +
  "  left: 0;\n" +
  "  bottom: 0;\n" +
  "  font-family: Segoe UI, Helvetica Neue, Verdana, Arial, sans-serif;\n" +
  "  margin-bottom: -3px;\n" +
  "}\n" +
  "\n" +
  ".gcli-panel.gcli-panel-hide {\n" +
  "  opacity: 0;\n" +
  "  height: 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-panel-connector {\n" +
  "  height: 10px;\n" +
  "  margin-top: -1px;\n" +
  "  margin-left: 20px;\n" +
  "  width: 20px;\n" +
  "  background: white;\n" +
  "  border-left: 1px solid #999;\n" +
  "  border-right: 1px solid #999;\n" +
  "}\n" +
  "\n" +
  ".gcli-tt-description {\n" +
  "  padding: 5px 10px 0;\n" +
  "  font-size: 90%;\n" +
  "}\n" +
  "\n" +
  ".gcli-tt-error {\n" +
  "  font-size: 80%;\n" +
  "  color: #900;\n" +
  "  padding: 0 10px;\n" +
  "}\n" +
  "\n" +
  ".gcli-field {\n" +
  "  width: 100%;\n" +
  "}\n" +
  "\n" +
  ".gcli-field-javascript {\n" +
  "  margin-bottom: 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-tt {\n" +
  "  box-shadow: 0 0 10px 1px #ddd;\n" +
  "  border: 1px solid #999;\n" +
  "  border-radius: 3px;\n" +
  "  margin: 10px 10px 0;\n" +
  "  background: hsla(0, 100%, 100%, 0.95);\n" +
  "  padding-bottom: 5px;\n" +
  "}\n" +
  "");

define("text!gcli/ui/tooltip.html", [], "\n" +
  "<div class=\"gcli-tt\" aria-live=\"polite\">\n" +
  "  <div class=\"gcli-tt-description\" save=\"${descriptionEle}\">${description}</div>\n" +
  "  ${field.element}\n" +
  "  <div class=\"gcli-tt-error\" save=\"${errorEle}\">${assignment.conversion.message}</div>\n" +
  "  <div class=\"gcli-tt-highlight\" save=\"${highlightEle}\"></div>\n" +
  "</div>\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/output_terminal', ['require', 'exports', 'module' , 'gcli/util', 'gcli/canon', 'gcli/ui/domtemplate', 'text!gcli/ui/output_view.css', 'text!gcli/ui/output_terminal.html'], function(require, exports, module) {

var util = require('gcli/util');

var canon = require('gcli/canon');
var domtemplate = require('gcli/ui/domtemplate');

var outputViewCss = require('text!gcli/ui/output_view.css');
var outputViewHtml = require('text!gcli/ui/output_terminal.html');


/**
 * A wrapper for a set of rows|command outputs.
 * Register with the canon to be notified when commands have output to be
 * displayed.
 * @param options Object containing user customization properties, including:
 * - commandOutputManager
 * @param components Object that links to other UI components. GCLI provided:
 * - element: Root element to populate
 * - requisition (optional): A click/double-click to an input row causes the
 *   command to be sent to the input/executed if we know the requisition use
 */
function OutputTerminal(options, components) {
  this.element = components.element;
  this.requisition = components.requisition;

  this.commandOutputManager = options.commandOutputManager ||
          canon.commandOutputManager;
  this.commandOutputManager.onOutput.add(this.outputted, this);

  var document = components.element.ownerDocument;
  if (outputViewCss != null) {
    this.style = util.importCss(outputViewCss, document, 'gcli-output-view');
  }

  this.template = util.toDom(document, outputViewHtml);
  this.templateOptions = { allowEval: true, stack: 'output_terminal.html' };
}

/**
 * Avoid memory leaks
 */
OutputTerminal.prototype.destroy = function() {
  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  this.commandOutputManager.onOutput.remove(this.outputted, this);

  delete this.commandOutputManager;
  delete this.requisition;
  delete this.element;
  delete this.template;
};

/**
 * Monitor for new command executions
 */
OutputTerminal.prototype.outputted = function(ev) {
  if (ev.output.hidden) {
    return;
  }

  ev.output.view = new OutputView(ev.output, this);
};

/**
 * Display likes to be able to control the height of its children
 */
OutputTerminal.prototype.setHeight = function(height) {
  this.element.style.height = height + 'px';
};

exports.OutputTerminal = OutputTerminal;


/**
 * Adds a row to the CLI output display
 */
function OutputView(outputData, outputTerminal) {
  this.outputData = outputData;
  this.outputTerminal = outputTerminal;

  this.url = util.createUrlLookup(module);

  // Elements attached to this by template().
  this.elems = {
    rowin: null,
    rowout: null,
    hide: null,
    show: null,
    duration: null,
    throb: null,
    prompt: null
  };

  var template = this.outputTerminal.template.cloneNode(true);
  domtemplate.template(template, this, this.outputTerminal.templateOptions);

  this.outputTerminal.element.appendChild(this.elems.rowin);
  this.outputTerminal.element.appendChild(this.elems.rowout);

  this.outputData.onClose.add(this.closed, this);
  this.outputData.onChange.add(this.changed, this);
}

OutputView.prototype.destroy = function() {
  this.outputData.onChange.remove(this.changed, this);
  this.outputData.onClose.remove(this.closed, this);

  this.outputTerminal.element.removeChild(this.elems.rowin);
  this.outputTerminal.element.removeChild(this.elems.rowout);

  delete this.outputData;
  delete this.outputTerminal;
  delete this.url;
  delete this.elems;
};

/**
 * Only display a prompt if there is a command, otherwise, leave blank
 */
Object.defineProperty(OutputView.prototype, 'prompt', {
  get: function() {
    return this.outputData.canonical ? '\u00bb' : '';
  },
  enumerable: true
});

/**
 * A single click on an invocation line in the console copies the command
 * to the command line
 */
OutputView.prototype.copyToInput = function() {
  if (this.outputTerminal.requisition) {
    this.outputTerminal.requisition.update(this.outputData.typed);
  }
};

/**
 * A double click on an invocation line in the console executes the command
 */
OutputView.prototype.execute = function(ev) {
  if (this.outputTerminal.requisition) {
    this.outputTerminal.requisition.exec({ typed: this.outputData.typed });
  }
};

OutputView.prototype.hideOutput = function(ev) {
  this.elems.rowout.style.display = 'none';
  this.elems.hide.classList.add('cmd_hidden');
  this.elems.show.classList.remove('cmd_hidden');

  ev.stopPropagation();
};

OutputView.prototype.showOutput = function(ev) {
  this.elems.rowout.style.display = 'block';
  this.elems.hide.classList.remove('cmd_hidden');
  this.elems.show.classList.add('cmd_hidden');

  ev.stopPropagation();
};

OutputView.prototype.closed = function(ev) {
  this.destroy();
};

OutputView.prototype.changed = function(ev) {
  var document = this.elems.rowout.ownerDocument;
  var duration = this.outputData.duration != null ?
          'completed in ' + (this.outputData.duration / 1000) + ' sec ' :
          '';
  duration = document.createTextNode(duration);
  this.elems.duration.appendChild(duration);

  if (this.outputData.completed) {
    this.elems.prompt.classList.add('gcli-row-complete');
  }
  if (this.outputData.error) {
    this.elems.prompt.classList.add('gcli-row-error');
  }

  this.outputData.toDom(this.elems.rowout);

  // We need to see the output of the latest command entered
  // Certain browsers have a bug such that scrollHeight is too small
  // when content does not fill the client area of the element
  var scrollHeight = Math.max(this.outputTerminal.element.scrollHeight,
      this.outputTerminal.element.clientHeight);
  this.outputTerminal.element.scrollTop =
      scrollHeight - this.outputTerminal.element.clientHeight;

  this.elems.throb.style.display = this.outputData.completed ? 'none' : 'block';
};

exports.OutputView = OutputView;


});
define("text!gcli/ui/output_view.css", [], "\n" +
  ".gcli-row-in {\n" +
  "  padding: 0 4px;\n" +
  "  box-shadow: 0 -6px 10px -6px #ddd;\n" +
  "  border-top: 1px solid #bbb;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-in > img {\n" +
  "  cursor: pointer;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-hover {\n" +
  "  display: none;\n" +
  "  float: right;\n" +
  "  padding: 2px 2px 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-in:hover > .gcli-row-hover {\n" +
  "  display: inline;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-in:hover > .gcli-row-hover.gcli-row-hidden {\n" +
  "  display: none;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-duration {\n" +
  "  color: #666;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-prompt {\n" +
  "  color: #00F;\n" +
  "  font-weight: bold;\n" +
  "  font-size: 120%;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-prompt.gcli-row-complete {\n" +
  "  color: #060;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-prompt.gcli-row-error {\n" +
  "  color: #F00;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-duration {\n" +
  "  font-size: 80%;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out {\n" +
  "  margin: 0 10px 15px;\n" +
  "  padding: 0 10px;\n" +
  "  line-height: 1.2em;\n" +
  "  font-size: 95%;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out strong,\n" +
  ".gcli-row-out b,\n" +
  ".gcli-row-out th,\n" +
  ".gcli-row-out h1,\n" +
  ".gcli-row-out h2,\n" +
  ".gcli-row-out h3 {\n" +
  "  color: #000;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out p {\n" +
  "  margin: 5px 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out a {\n" +
  "  color: hsl(200,40%,40%);\n" +
  "  text-decoration: none;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out a:hover {\n" +
  "  cursor: pointer;\n" +
  "  border-bottom: 1px dotted hsl(200,40%,60%);\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out input[type=password],\n" +
  ".gcli-row-out input[type=text],\n" +
  ".gcli-row-out textarea {\n" +
  "  font-size: 120%;\n" +
  "  background: transparent;\n" +
  "  padding: 3px;\n" +
  "  border-radius: 3px;\n" +
  "  border: 1px solid #bbb;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out table,\n" +
  ".gcli-row-out td,\n" +
  ".gcli-row-out th {\n" +
  "  border: 0;\n" +
  "  padding: 0 2px;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-terminal,\n" +
  ".gcli-row-subterminal {\n" +
  "  border-radius: 3px;\n" +
  "  border: 1px solid #ddd;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-terminal {\n" +
  "  height: 200px;\n" +
  "  width: 620px;\n" +
  "  font-size: 80%;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-subterminal {\n" +
  "  height: 150px;\n" +
  "  width: 300px;\n" +
  "  font-size: 75%;\n" +
  "}\n" +
  "\n" +
  ".gcli-out-shortcut {\n" +
  "  font-weight: normal;\n" +
  "  border: 1px solid #999;\n" +
  "  border-radius: 3px;\n" +
  "  color: #666;\n" +
  "  cursor: pointer;\n" +
  "  padding: 0 3px 1px;\n" +
  "  margin: 1px 4px;\n" +
  "  display: inline-block;\n" +
  "}\n" +
  "\n" +
  ".gcli-out-shortcut:before {\n" +
  "  content: '\\bb';\n" +
  "  padding-right: 2px;\n" +
  "  color: hsl(25,78%,50%);\n" +
  "  font-weight: bold;\n" +
  "  font-size: 110%;\n" +
  "}\n" +
  "");

define("text!gcli/ui/output_terminal.html", [], "\n" +
  "<div class=\"gcli-row\">\n" +
  "  <!-- The div for the input (i.e. what was typed) -->\n" +
  "  <div class=\"gcli-row-in\" save=\"${elems.rowin}\" aria-live=\"assertive\"\n" +
  "      onclick=\"${copyToInput}\" ondblclick=\"${execute}\">\n" +
  "\n" +
  "    <!-- What the user actually typed -->\n" +
  "    <span save=\"${elems.prompt}\" class=\"gcli-row-prompt ${elems.error ? 'gcli-row-error' : ''} ${elems.completed ? 'gcli-row-complete' : ''}\">${prompt}</span>\n" +
  "    <span class=\"gcli-row-in-typed\">${outputData.canonical}</span>\n" +
  "\n" +
  "    <!-- The extra details that appear on hover -->\n" +
  "    <span class=\"gcli-row-duration gcli-row-hover\" save=\"${elems.duration}\"></span>\n" +
  "    <!--\n" +
  "    <img class=\"gcli-row-hover\" onclick=\"${hideOutput}\" save=\"${elems.hide}\"\n" +
  "        alt=\"Hide command output\" _src=\"${url('images/minus.png')}\"/>\n" +
  "    <img class=\"gcli-row-hover gcli-row-hidden\" onclick=\"${showOutput}\" save=\"${elems.show}\"\n" +
  "        alt=\"Show command output\" _src=\"${url('images/plus.png')}\"/>\n" +
  "    <img class=\"gcli-row-hover\" onclick=\"${remove}\"\n" +
  "        alt=\"Remove this command from the history\"\n" +
  "        _src=\"${url('images/closer.png')}\"/>\n" +
  "    -->\n" +
  "    <img style=\"float:right;\" _src=\"${url('images/throbber.gif')}\" save=\"${elems.throb}\"/>\n" +
  "  </div>\n" +
  "\n" +
  "  <!-- The div for the command output -->\n" +
  "  <div class=\"gcli-row-out\" aria-live=\"assertive\" save=\"${elems.rowout}\">\n" +
  "  </div>\n" +
  "</div>\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/inputter', ['require', 'exports', 'module' , 'gcli/util', 'gcli/types', 'gcli/history', 'text!gcli/ui/inputter.css'], function(require, exports, module) {


var util = require('gcli/util');
var KeyEvent = require('gcli/util').KeyEvent;

var Status = require('gcli/types').Status;
var History = require('gcli/history').History;

var inputterCss = require('text!gcli/ui/inputter.css');


/**
 * A wrapper to take care of the functions concerning an input element
 * @param options Object containing user customization properties, including:
 * - scratchpad (default=none)
 * - promptWidth (default=22px)
 * @param components Object that links to other UI components. GCLI provided:
 * - requisition
 * - focusManager
 * - element
 */
function Inputter(options, components) {
  this.requisition = components.requisition;
  this.focusManager = components.focusManager;

  this.element = components.element;
  this.element.classList.add('gcli-in-input');
  this.element.spellcheck = false;

  this.document = this.element.ownerDocument;

  this.scratchpad = options.scratchpad;

  if (inputterCss != null) {
    this.style = util.importCss(inputterCss, this.document, 'gcli-inputter');
  }

  // Used to distinguish focus from TAB in CLI. See onKeyUp()
  this.lastTabDownAt = 0;

  // Used to effect caret changes. See _processCaretChange()
  this._caretChange = null;

  // Ensure that TAB/UP/DOWN isn't handled by the browser
  this.onKeyDown = this.onKeyDown.bind(this);
  this.onKeyUp = this.onKeyUp.bind(this);
  this.element.addEventListener('keydown', this.onKeyDown, false);
  this.element.addEventListener('keyup', this.onKeyUp, false);

  // Setup History
  this.history = new History();
  this._scrollingThroughHistory = false;

  // Used when we're selecting which prediction to complete with
  this._choice = null;
  this.onChoiceChange = util.createEvent('Inputter.onChoiceChange');

  // Cursor position affects hint severity
  this.onMouseUp = this.onMouseUp.bind(this);
  this.element.addEventListener('mouseup', this.onMouseUp, false);

  if (this.focusManager) {
    this.focusManager.addMonitoredElement(this.element, 'input');
  }

  this.requisition.onTextChange.add(this.textChanged, this);

  this.assignment = this.requisition.getAssignmentAt(0);
  this.onAssignmentChange = util.createEvent('Inputter.onAssignmentChange');
  this.onInputChange = util.createEvent('Inputter.onInputChange');

  this.onResize = util.createEvent('Inputter.onResize');
  this.onWindowResize = this.onWindowResize.bind(this);
  this.document.defaultView.addEventListener('resize', this.onWindowResize, false);

  this.requisition.update(this.element.value || '');
}

/**
 * Avoid memory leaks
 */
Inputter.prototype.destroy = function() {
  this.document.defaultView.removeEventListener('resize', this.onWindowResize, false);

  this.requisition.onTextChange.remove(this.textChanged, this);
  if (this.focusManager) {
    this.focusManager.removeMonitoredElement(this.element, 'input');
  }

  this.element.removeEventListener('mouseup', this.onMouseUp, false);
  this.element.removeEventListener('keydown', this.onKeyDown, false);
  this.element.removeEventListener('keyup', this.onKeyUp, false);

  this.history.destroy();

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  delete this.onMouseUp;
  delete this.onKeyDown;
  delete this.onKeyUp;
  delete this.onWindowResize;
  delete this.tooltip;
  delete this.document;
  delete this.element;
};

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Inputter.prototype.onWindowResize = function() {
  // Mochitest sometimes causes resize after shutdown. See Bug 743190
  if (!this.element) {
    return;
  }

  // Simplify when jsdom does getBoundingClientRect(). See Bug 717269
  var dimensions = this.getDimensions();
  if (dimensions) {
    this.onResize(dimensions);
  }
};

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Inputter.prototype.getDimensions = function() {
  // Remove this when jsdom does getBoundingClientRect(). See Bug 717269
  if (!this.element.getBoundingClientRect) {
    return undefined;
  }

  var fixedLoc = {};
  var currentElement = this.element.parentNode;
  while (currentElement && currentElement.nodeName !== '#document') {
    var style = document.defaultView.getComputedStyle(currentElement, '');
    if (style) {
      var position = style.getPropertyValue('position');
      if (position === 'absolute' || position === 'fixed') {
        var bounds = currentElement.getBoundingClientRect();
        fixedLoc.top = bounds.top;
        fixedLoc.left = bounds.left;
        break;
      }
    }
    currentElement = currentElement.parentNode;
  }

  var rect = this.element.getBoundingClientRect();
  return {
    top: rect.top - (fixedLoc.top || 0) + 1,
    height: rect.bottom - rect.top - 1,
    left: rect.left - (fixedLoc.left || 0) + 2,
    width: rect.right - rect.left
  };
};

/**
 * Handler for the input-element.onMouseUp event
 */
Inputter.prototype.onMouseUp = function(ev) {
  this._checkAssignment();
};

/**
 * Handler for the Requisition.textChanged event
 */
Inputter.prototype.textChanged = function() {
  if (!this.document) {
    return; // This can happen post-destroy()
  }

  if (this._caretChange == null) {
    // We weren't expecting a change so this was requested by the hint system
    // we should move the cursor to the end of the 'changed section', and the
    // best we can do for that right now is the end of the current argument.
    this._caretChange = Caret.TO_ARG_END;
  }

  var newStr = this.requisition.toString();
  var input = this.getInputState();

  input.typed = newStr;
  this._processCaretChange(input);

  this.element.value = newStr;
  this.onInputChange({ inputState: input });
};

/**
 * Various ways in which we need to manipulate the caret/selection position.
 * A value of null means we're not expecting a change
 */
var Caret = {
  /**
   * We are expecting changes, but we don't need to move the cursor
   */
  NO_CHANGE: 0,

  /**
   * We want the entire input area to be selected
   */
  SELECT_ALL: 1,

  /**
   * The whole input has changed - push the cursor to the end
   */
  TO_END: 2,

  /**
   * A part of the input has changed - push the cursor to the end of the
   * changed section
   */
  TO_ARG_END: 3
};

/**
 * If this._caretChange === Caret.TO_ARG_END, we alter the input object to move
 * the selection start to the end of the current argument.
 * @param input An object shaped like { typed:'', cursor: { start:0, end:0 }}
 */
Inputter.prototype._processCaretChange = function(input) {
  var start, end;
  switch (this._caretChange) {
    case Caret.SELECT_ALL:
      start = 0;
      end = input.typed.length;
      break;

    case Caret.TO_END:
      start = input.typed.length;
      end = input.typed.length;
      break;

    case Caret.TO_ARG_END:
      // There could be a fancy way to do this involving assignment/arg math
      // but it doesn't seem easy, so we cheat a move the cursor to just before
      // the next space, or the end of the input
      start = input.cursor.start;
      do {
        start++;
      }
      while (start < input.typed.length && input.typed[start - 1] !== ' ');

      end = start;
      break;

    default:
      start = input.cursor.start;
      end = input.cursor.end;
      break;
  }

  start = (start > input.typed.length) ? input.typed.length : start;
  end = (end > input.typed.length) ? input.typed.length : end;

  var newInput = {
    typed: input.typed,
    cursor: { start: start, end: end }
  };

  this.element.selectionStart = start;
  this.element.selectionEnd = end;

  this._checkAssignment(start);

  this._caretChange = null;
  return newInput;
};

/**
 * To be called internally whenever we think that the current assignment might
 * have changed, typically on mouse-clicks or key presses.
 * @param start Optional - if specified, the cursor position to use in working
 * out the current assignment. This is needed because setting the element
 * selection start is only recognised when the event loop has finished
 */
Inputter.prototype._checkAssignment = function(start) {
  if (start == null) {
    start = this.element.selectionStart;
  }
  var newAssignment = this.requisition.getAssignmentAt(start);
  if (this.assignment !== newAssignment) {
    this.assignment = newAssignment;
    this.onAssignmentChange({ assignment: this.assignment });
  }

  // This is slightly nasty - the focusManager generally relies on people
  // telling it what it needs to know (which makes sense because the event
  // system to do it with events would be unnecessarily complex). However
  // requisition doesn't know about the focusManager either. So either one
  // needs to know about the other, or a third-party needs to break the
  // deadlock. These 2 lines are all we're quibbling about, so for now we hack
  if (this.focusManager) {
    var message = this.assignment.conversion.message;
    this.focusManager.setError(message != null && message !== '');
  }
};

/**
 * Set the input field to a value, for external use.
 * This function updates the data model. It sets the caret to the end of the
 * input. It does not make any similarity checks so calling this function with
 * it's current value resets the cursor position.
 * It does not execute the input or affect the history.
 * This function should not be called internally, by Inputter and never as a
 * result of a keyboard event on this.element or bug 676520 could be triggered.
 */
Inputter.prototype.setInput = function(str) {
  this.requisition.update(str);
};

/**
 * Counterpart to |setInput| for moving the cursor.
 * @param cursor An object shaped like { start: x, end: y }
 */
Inputter.prototype.setCursor = function(cursor) {
  this._caretChange = Caret.NO_CHANGE;
  this._processCaretChange({ typed: this.element.value, cursor: cursor });
};

/**
 * Focus the input element
 */
Inputter.prototype.focus = function() {
  this.element.focus();
  this._checkAssignment();
};

/**
 * Ensure certain keys (arrows, tab, etc) that we would like to handle
 * are not handled by the browser
 */
Inputter.prototype.onKeyDown = function(ev) {
  if (ev.keyCode === KeyEvent.DOM_VK_UP || ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    ev.preventDefault();
    return;
  }

  // The following keys do not affect the state of the command line so we avoid
  // informing the focusManager about keyboard events that involve these keys
  if (ev.keyCode === KeyEvent.DOM_VK_F1 ||
      ev.keyCode === KeyEvent.DOM_VK_ESCAPE ||
      ev.keyCode === KeyEvent.DOM_VK_UP ||
      ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    return;
  }

  if (this.focusManager) {
    this.focusManager.onInputChange();
  }

  if (ev.keyCode === KeyEvent.DOM_VK_TAB) {
    this.lastTabDownAt = 0;
    if (!ev.shiftKey) {
      ev.preventDefault();
      // Record the timestamp of this TAB down so onKeyUp can distinguish
      // focus from TAB in the CLI.
      this.lastTabDownAt = ev.timeStamp;
    }
    if (ev.metaKey || ev.altKey || ev.crtlKey) {
      if (this.document.commandDispatcher) {
        this.document.commandDispatcher.advanceFocus();
      }
      else {
        this.element.blur();
      }
    }
  }
};

/**
 * The main keyboard processing loop
 */
Inputter.prototype.onKeyUp = function(ev) {
  if (this.focusManager && ev.keyCode === KeyEvent.DOM_VK_F1) {
    this.focusManager.helpRequest();
    return;
  }

  if (this.focusManager && ev.keyCode === KeyEvent.DOM_VK_ESCAPE) {
    this.focusManager.removeHelp();
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_UP) {
    if (this.tooltip && this.tooltip.isMenuShowing) {
      this.changeChoice(-1);
    }
    else if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this.requisition.update(this.history.backward());
    }
    else {
      // If the user is on a valid value, then we increment the value, but if
      // they've typed something that's not right we page through predictions
      if (this.assignment.getStatus() === Status.VALID) {
        this.requisition.increment(assignment);
        // See notes on focusManager.onInputChange in onKeyDown
        if (this.focusManager) {
          this.focusManager.onInputChange();
        }
      }
      else {
        this.changeChoice(-1);
      }
    }
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    if (this.tooltip && this.tooltip.isMenuShowing) {
      this.changeChoice(+1);
    }
    else if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this.requisition.update(this.history.forward());
    }
    else {
      // See notes above for the UP key
      if (this.assignment.getStatus() === Status.VALID) {
        this.requisition.decrement(assignment);
        // See notes on focusManager.onInputChange in onKeyDown
        if (this.focusManager) {
          this.focusManager.onInputChange();
        }
      }
      else {
        this.changeChoice(+1);
      }
    }
    return;
  }

  // RETURN checks status and might exec
  if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
    var worst = this.requisition.getStatus();
    // Deny RETURN unless the command might work
    if (worst === Status.VALID) {
      this._scrollingThroughHistory = false;
      this.history.add(this.element.value);
      this.requisition.exec();
    }
    else {
      // If we can't execute the command, but there is a menu choice to use
      // then use it.
      if (!this.tooltip.selectChoice()) {
        this.focusManager.setError(true);
      }
    }

    this._choice = null;
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_TAB && !ev.shiftKey) {
    // Being able to complete 'nothing' is OK if there is some context, but
    // when there is nothing on the command line it jsut looks bizarre.
    var hasContents = (this.element.value.length > 0);
    // If the TAB keypress took the cursor from another field to this one,
    // then they get the keydown/keypress, and we get the keyup. In this
    // case we don't want to do any completion.
    // If the time of the keydown/keypress of TAB was close (i.e. within
    // 1 second) to the time of the keyup then we assume that we got them
    // both, and do the completion.
    if (hasContents && this.lastTabDownAt + 1000 > ev.timeStamp) {
      // It's possible for TAB to not change the input, in which case the
      // textChanged event will not fire, and the caret move will not be
      // processed. So we check that this is done first
      this._caretChange = Caret.TO_ARG_END;
      var inputState = this.getInputState();
      this._processCaretChange(inputState);
      if (this._choice == null) {
        this._choice = 0;
      }
      this.requisition.complete(inputState.cursor, this._choice);
    }
    this.lastTabDownAt = 0;
    this._scrollingThroughHistory = false;

    this._choice = null;
    this.onChoiceChange({ choice: this._choice });
    return;
  }

  // Give the scratchpad (if enabled) a chance to activate
  if (this.scratchpad && this.scratchpad.shouldActivate(ev)) {
    if (this.scratchpad.activate(this.element.value)) {
      this.requisition.update('');
    }
    return;
  }

  this._scrollingThroughHistory = false;
  this._caretChange = Caret.NO_CHANGE;

  this.requisition.update(this.element.value);

  this._choice = null;
  this.onChoiceChange({ choice: this._choice });
};

/**
 * Used by onKeyUp for UP/DOWN to change the current choice from an options
 * menu.
 */
Inputter.prototype.changeChoice = function(amount) {
  if (this._choice == null) {
    this._choice = 0;
  }
  // There's an annoying up is down thing here, the menu is presented
  // with the zeroth index at the top working down, so the UP arrow needs
  // pick the choice below because we're working down
  this._choice += amount;
  this.onChoiceChange({ choice: this._choice });
};

/**
 * Accessor for the assignment at the cursor.
 * i.e Requisition.getAssignmentAt(cursorPos);
 */
Inputter.prototype.getCurrentAssignment = function() {
  var start = this.element.selectionStart;
  return this.requisition.getAssignmentAt(start);
};

/**
 * Pull together an input object, which may include XUL hacks
 */
Inputter.prototype.getInputState = function() {
  var input = {
    typed: this.element.value,
    cursor: {
      start: this.element.selectionStart,
      end: this.element.selectionEnd
    }
  };

  // Workaround for potential XUL bug 676520 where textbox gives incorrect
  // values for its content
  if (input.typed == null) {
    input = { typed: '', cursor: { start: 0, end: 0 } };
    console.log('fixing input.typed=""', input);
  }

  // Workaround for a Bug 717268 (which is really a jsdom bug)
  if (input.cursor.start == null) {
    input.cursor.start = 0;
  }

  return input;
};

exports.Inputter = Inputter;


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/history', ['require', 'exports', 'module' ], function(require, exports, module) {

/**
 * A History object remembers commands that have been entered in the past and
 * provides an API for accessing them again.
 * See Bug 681340: Search through history (like C-r in bash)?
 */
function History() {
  // This is the actual buffer where previous commands are kept.
  // 'this._buffer[0]' should always be equal the empty string. This is so
  // that when you try to go in to the "future", you will just get an empty
  // command.
  this._buffer = [''];

  // This is an index in to the history buffer which points to where we
  // currently are in the history.
  this._current = 0;
}

/**
 * Avoid memory leaks
 */
History.prototype.destroy = function() {
  delete this._buffer;
};

/**
 * Record and save a new command in the history.
 */
History.prototype.add = function(command) {
  this._buffer.splice(1, 0, command);
  this._current = 0;
};

/**
 * Get the next (newer) command from history.
 */
History.prototype.forward = function() {
  if (this._current > 0 ) {
    this._current--;
  }
  return this._buffer[this._current];
};

/**
 * Get the previous (older) item from history.
 */
History.prototype.backward = function() {
  if (this._current < this._buffer.length - 1) {
    this._current++;
  }
  return this._buffer[this._current];
};

exports.History = History;

});
define("text!gcli/ui/inputter.css", [], "\n" +
  ".gcli-in-input,\n" +
  ".gcli-in-complete,\n" +
  ".gcli-prompt {\n" +
  "  font-family: Segoe UI, Helvetica Neue, Verdana, Arial, sans-serif;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-input,\n" +
  ".gcli-in-complete {\n" +
  "  font-size: 110%;\n" +
  "  font-weight: normal;\n" +
  "  font-style: normal;\n" +
  "  padding: 0 0 0 22px;\n" +
  "  background-color: transparent;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-input {\n" +
  "  color: #000;\n" +
  "  border: 0;\n" +
  "  box-shadow: 0 0 10px 1px #ddd;\n" +
  "  border-top: 1px solid #999;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-complete {\n" +
  "  position: absolute;\n" +
  "  z-index: -1000;\n" +
  "  color: transparent;\n" +
  "  margin-top: -1px;\n" +
  "  border-top: 1px solid transparent;\n" +
  "}\n" +
  "\n" +
  ".gcli-prompt {\n" +
  "  position: absolute;\n" +
  "  z-index: -1001;\n" +
  "  padding: 0 1px;\n" +
  "  color: hsl(25,78%,50%);\n" +
  "  font-size: 150%;\n" +
  "  font-weight: bold;\n" +
  "  line-height: 95%;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-incomplete {\n" +
  "  border-bottom: 2px dotted #999;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-error {\n" +
  "  border-bottom: 2px dotted #F00;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-ontab {\n" +
  "  color: hsl(200,40%,70%);\n" +
  "}\n" +
  "\n" +
  ".gcli-in-todo {\n" +
  "  color: hsl(48,28%,76%);\n" +
  "}\n" +
  "\n" +
  ".gcli-in-closebrace {\n" +
  "  color: hsl(0,0%,80%);\n" +
  "}\n" +
  "\n" +
  ".gcli-in-scratchlink {\n" +
  "  float: right;\n" +
  "  font-size: 85%;\n" +
  "  color: #888;\n" +
  "  padding-right: 10px;\n" +
  "}\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/completer', ['require', 'exports', 'module' , 'gcli/util', 'gcli/ui/domtemplate', 'text!gcli/ui/completer.html'], function(require, exports, module) {


var util = require('gcli/util');
var domtemplate = require('gcli/ui/domtemplate');

var completerHtml = require('text!gcli/ui/completer.html');

/**
 * Completer is an 'input-like' element that sits  an input element annotating
 * it with visual goodness.
 * @param options Object containing user customization properties, including:
 * - scratchpad (default=none) A way to move JS content to custom JS editor
 * @param components Object that links to other UI components. GCLI provided:
 * - requisition: A GCLI Requisition object whose state is monitored
 * - element: Element to use as root
 * - autoResize: (default=false): Should we attempt to sync the dimensions of
 *   the complete element with the input element.
 */
function Completer(options, components) {
  this.requisition = components.requisition;
  this.scratchpad = options.scratchpad;
  this.input = { typed: '', cursor: { start: 0, end: 0 } };
  this.choice = 0;

  this.element = components.element;
  this.element.classList.add('gcli-in-complete');
  this.element.setAttribute('tabindex', '-1');
  this.element.setAttribute('aria-live', 'polite');

  this.document = this.element.ownerDocument;

  this.inputter = components.inputter;

  this.inputter.onInputChange.add(this.update, this);
  this.inputter.onAssignmentChange.add(this.update, this);
  this.inputter.onChoiceChange.add(this.update, this);

  if (components.autoResize) {
    this.inputter.onResize.add(this.resized, this);

    var dimensions = this.inputter.getDimensions();
    if (dimensions) {
      this.resized(dimensions);
    }
  }

  this.template = util.toDom(this.document, completerHtml);
  // We want the spans to line up without the spaces in the template
  util.removeWhitespace(this.template, true);

  this.update();
}

/**
 * Avoid memory leaks
 */
Completer.prototype.destroy = function() {
  this.inputter.onInputChange.remove(this.update, this);
  this.inputter.onAssignmentChange.remove(this.update, this);
  this.inputter.onChoiceChange.remove(this.update, this);
  this.inputter.onResize.remove(this.resized, this);

  delete this.document;
  delete this.element;
  delete this.template;
  delete this.inputter;
};

/**
 * Ensure that the completion element is the same size and the inputter element
 */
Completer.prototype.resized = function(ev) {
  this.element.style.top = ev.top + 'px';
  this.element.style.height = ev.height + 'px';
  this.element.style.lineHeight = ev.height + 'px';
  this.element.style.left = ev.left + 'px';
  this.element.style.width = ev.width + 'px';
};

/**
 * Bring the completion element up to date with what the requisition says
 */
Completer.prototype.update = function(ev) {
  if (ev && ev.choice != null) {
    this.choice = ev.choice;
  }

  var data = this._getCompleterTemplateData();
  var template = this.template.cloneNode(true);
  domtemplate.template(template, data, { stack: 'completer.html' });

  util.clearElement(this.element);
  while (template.hasChildNodes()) {
    this.element.appendChild(template.firstChild);
  }
};

/**
 * Calculate the properties required by the template process for completer.html
 */
Completer.prototype._getCompleterTemplateData = function() {
  var input = this.inputter.getInputState();

  // directTabText is for when the current input is a prefix of the completion
  // arrowTabText is for when we need to use an -> to show what will be used
  var directTabText = '';
  var arrowTabText = '';
  var current = this.requisition.getAssignmentAt(input.cursor.start);
  var emptyParameters = [];

  if (input.typed.trim().length !== 0) {
    var cArg = current.arg;
    var prediction = current.getPredictionAt(this.choice);

    if (prediction) {
      var tabText = prediction.name;
      var existing = cArg.text;

      // Normally the cursor being just before whitespace means that you are
      // 'in' the previous argument, which means that the prediction is based
      // on that argument, however NamedArguments break this by having 2 parts
      // so we need to prepend the tabText with a space for NamedArguments,
      // but only when there isn't already a space at the end of the prefix
      // (i.e. ' --name' not ' --name ')
      if (current.isInName()) {
        tabText = ' ' + tabText;
      }

      if (existing !== tabText) {
        // Decide to use directTabText or arrowTabText
        // Strip any leading whitespace from the user inputted value because the
        // tabText will never have leading whitespace.
        var inputValue = existing.replace(/^\s*/, '');
        var isStrictCompletion = tabText.indexOf(inputValue) === 0;
        if (isStrictCompletion && input.cursor.start === input.typed.length) {
          // Display the suffix of the prediction as the completion
          var numLeadingSpaces = existing.match(/^(\s*)/)[0].length;

          directTabText = tabText.slice(existing.length - numLeadingSpaces);
        }
        else {
          // Display the '-> prediction' at the end of the completer element
          // \u21E5 is the JS escape right arrow
          arrowTabText = '\u21E5 ' + tabText;
        }
      }
    }
    else {
      // There's no prediction, but if this is a named argument that needs a
      // value (that is without any) then we need to show that one is needed
      // For example 'git commit --message ', clearly needs some more text
      if (cArg.type === 'NamedArgument' && cArg.text === '') {
        emptyParameters.push('<' + current.param.type.name + '>\u00a0');
      }
    }
  }

  // Add a space between the typed text (+ directTabText) and the hints,
  // making sure we don't add 2 sets of padding
  if (directTabText !== '') {
    directTabText += '\u00a0';
  }
  else if (!this.requisition.typedEndsWithSeparator()) {
    emptyParameters.unshift('\u00a0');
  }

  // statusMarkup is wrapper around requisition.getInputStatusMarkup converting
  // space to &nbsp; in the string member (for HTML display) and status to an
  // appropriate class name (i.e. lower cased, prefixed with gcli-in-)
  var statusMarkup = this.requisition.getInputStatusMarkup(input.cursor.start);
  statusMarkup.forEach(function(member) {
    member.string = member.string.replace(/ /g, '\u00a0'); // i.e. &nbsp;
    member.className = 'gcli-in-' + member.status.toString().toLowerCase();
  }, this);

  // Calculate the list of parameters to be filled in
  // We generate an array of emptyParameter markers for each positional
  // parameter to the current command.
  // Generally each emptyParameter marker begins with a space to separate it
  // from whatever came before, unless what comes before ends in a space.

  var command = this.requisition.commandAssignment.value;
  var jsCommand = command && command.name === '{';

  this.requisition.getAssignments().forEach(function(assignment) {
    // Named arguments are handled with a group [options] marker
    if (!assignment.param.isPositionalAllowed) {
      return;
    }

    // No hints if we've got content for this parameter
    if (assignment.arg.toString().trim() !== '') {
      return;
    }

    if (directTabText !== '' && current === assignment) {
      return;
    }

    var text = (assignment.param.isDataRequired) ?
        '<' + assignment.param.name + '>\u00a0' :
        '[' + assignment.param.name + ']\u00a0';

    emptyParameters.push(text);
  }.bind(this));

  var addOptionsMarker = false;
  // We add an '[options]' marker when there are named parameters that are
  // not filled in and not hidden, and we don't have any directTabText
  if (command && command.hasNamedParameters) {
    command.params.forEach(function(param) {
      var arg = this.requisition.getAssignment(param.name).arg;
      if (!param.isPositionalAllowed && !param.hidden
              && arg.type === "BlankArgument") {
        addOptionsMarker = true;
      }
    }, this);
  }

  if (addOptionsMarker) {
    // Add an nbsp if we don't have one at the end of the input or if
    // this isn't the first param we've mentioned
    emptyParameters.push('[options]\u00a0');
  }

  // Is the entered command a JS command with no closing '}'?
  // TWEAK: This code should be considered for promotion to Requisition
  var unclosedJs = jsCommand &&
      this.requisition.getAssignment(0).arg.suffix.indexOf('}') === -1;

  // The text for the 'jump to scratchpad' feature, or '' if it is disabled
  var link = this.scratchpad && jsCommand ? this.scratchpad.linkText : '';

  return {
    statusMarkup: statusMarkup,
    directTabText: directTabText,
    emptyParameters: emptyParameters,
    arrowTabText: arrowTabText,
    unclosedJs: unclosedJs,
    scratchLink: link
  };
};

exports.Completer = Completer;


});
define("text!gcli/ui/completer.html", [], "\n" +
  "<div>\n" +
  "  <loop foreach=\"member in ${statusMarkup}\">\n" +
  "    <span class=\"${member.className}\">${member.string}</span>\n" +
  "  </loop>\n" +
  "  <span class=\"gcli-in-ontab\">${directTabText}</span>\n" +
  "  <span class=\"gcli-in-todo\" foreach=\"param in ${emptyParameters}\">${param}</span>\n" +
  "  <span class=\"gcli-in-ontab\">${arrowTabText}</span>\n" +
  "  <span class=\"gcli-in-closebrace\" if=\"${unclosedJs}\">}</span>\n" +
  "  <div class=\"gcli-in-scratchlink\" if=\"${scratchLink}\">${scratchLink}</div>\n" +
  "</div>\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/ui/prompt', ['require', 'exports', 'module' ], function(require, exports, module) {


/**
 * Prompt is annoying because some systems provide a UI elements (i.e. firefox)
 * while some expect you to overlay them on an input element (i.e. the web)
 * Also we want to provide click -> show menu ability.
 * @param options Object containing user customization properties, including:
 * - promptChar (default='\u00bb') (double greater-than, a.k.a right guillemet)
 *   The prompt is used directly in a TextNode, so no HTML entities.
 * @param components Object that links to other UI components. GCLI provided:
 * - element
 * - inputter
 */
function Prompt(options, components) {
  this.element = components.element;
  this.element.classList.add('gcli-prompt');

  var prompt = options.promptChar || '\u00bb';
  var text = this.element.ownerDocument.createTextNode(prompt);
  this.element.appendChild(text);

  this.inputter = components.inputter;
  if (this.inputter) {
    this.inputter.onResize.add(this.resized, this);

    var dimensions = this.inputter.getDimensions();
    if (dimensions) {
      this.resized(dimensions);
    }
  }
}

/**
 * Avoid memory leaks
 */
Prompt.prototype.destroy = function() {
  if (this.inputter) {
    this.inputter.onResize.remove(this.resized, this);
  }

  delete this.element;
};

/**
 * Ensure that the completion element is the same size and the inputter element
 */
Prompt.prototype.resized = function(ev) {
  this.element.style.top = ev.top + 'px';
  this.element.style.height = ev.height + 'px';
  this.element.style.left = ev.left + 'px';
  this.element.style.width = ev.width + 'px';
};

exports.Prompt = Prompt;


});
define("text!gcli/ui/display.css", [], "\n" +
  ".gcli-output {\n" +
  "  height: 100%;\n" +
  "  overflow-x: hidden;\n" +
  "  overflow-y: auto;\n" +
  "  font-family: Segoe UI, Helvetica Neue, Verdana, Arial, sans-serif;\n" +
  "}\n" +
  "");

define("text!gcli/ui/display.html", [], "\n" +
  "<div class=\"gcli-panel\" save=\"${panel}\">\n" +
  "  <div save=\"${tooltip}\"></div>\n" +
  "  <div class=\"gcli-panel-connector\"></div>\n" +
  "</div>\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('demo/index', ['require', 'exports', 'module' , 'gcli/index', 'gcli/commands/help', 'gcli/commands/pref', 'gcli/commands/pref_list', 'gcli/commands/intro', 'test/commands/test', 'demo/commands/basic', 'demo/commands/bugs', 'demo/commands/demo'], function(require, exports, module) {

  require('gcli/index');

  require('gcli/commands/help').startup();
  require('gcli/commands/pref').startup();
  require('gcli/commands/pref_list').startup();
  require('gcli/commands/intro').startup();

  require('test/commands/test').startup();

  require('demo/commands/basic').startup();
  require('demo/commands/bugs').startup();
  require('demo/commands/demo').startup();

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/commands/help', ['require', 'exports', 'module' , 'gcli/canon', 'gcli/l10n', 'gcli/util', 'gcli/ui/view', 'text!gcli/commands/help_man.html', 'text!gcli/commands/help_list.html', 'text!gcli/commands/help.css'], function(require, exports, module) {
var help = exports;


var canon = require('gcli/canon');
var l10n = require('gcli/l10n');
var util = require('gcli/util');
var view = require('gcli/ui/view');

// Storing the HTML on exports allows other builds to alter the help template
// but still allowing dryice to do it's dependency thing properly
exports.helpManHtml = require('text!gcli/commands/help_man.html');
exports.helpListHtml = require('text!gcli/commands/help_list.html');
exports.helpCss = require('text!gcli/commands/help.css');

/**
 * 'help' command
 */
var helpCommandSpec = {
  name: 'help',
  description: l10n.lookup('helpDesc'),
  manual: l10n.lookup('helpManual'),
  params: [
    {
      name: 'search',
      type: 'string',
      description: l10n.lookup('helpSearchDesc'),
      manual: l10n.lookup('helpSearchManual2'),
      defaultValue: null
    }
  ],
  returnType: 'html',

  exec: function(args, context) {
    var match = canon.getCommand(args.search || undefined);
    if (match) {
      return view.createView({
        html: exports.helpManHtml,
        options: { allowEval: true, stack: 'help_man.html' },
        data: getManTemplateData(match, context),
        css: exports.helpCss,
        cssId: 'gcli-help'
      });
    }

    return view.createView({
      html: exports.helpListHtml,
      options: { allowEval: true, stack: 'help_list.html' },
      data: getListTemplateData(args, context),
      css: exports.helpCss,
      cssId: 'gcli-help'
    });
  }
};

/**
 * Registration and de-registration.
 */
help.startup = function() {
  canon.addCommand(helpCommandSpec);
};

help.shutdown = function() {
  canon.removeCommand(helpCommandSpec);
};

/**
 * Create a block of data suitable to be passed to the help_list.html template
 */
function getListTemplateData(args, context) {
  var matchingCommands = canon.getCommands().filter(function(command) {
    if (command.hidden) {
      return false;
    }

    if (args.search && command.name.indexOf(args.search) !== 0) {
      // Filtered out because they don't match the search
      return false;
    }
    if (!args.search && command.name.indexOf(' ') != -1) {
      // We don't show sub commands with plain 'help'
      return false;
    }
    return true;
  });
  matchingCommands.sort(function(c1, c2) {
    return c1.name.localeCompare(c2.name);
  });

  var heading;
  if (matchingCommands.length === 0) {
    heading = l10n.lookupFormat('helpListNone', [ args.search ]);
  }
  else if (args.search == null) {
    heading = l10n.lookup('helpListAll');
  }
  else {
    heading = l10n.lookupFormat('helpListPrefix', [ args.search ]);
  }

  return {
    l10n: l10n.propertyLookup,
    includeIntro: args.search == null,
    matchingCommands: matchingCommands,
    heading: heading,

    onclick: function(ev) {
      util.updateCommand(ev.currentTarget, context);
    },

    ondblclick: function(ev) {
      util.executeCommand(ev.currentTarget, context);
    },
  };
}

/**
 * Create a block of data suitable to be passed to the help_man.html template
 */
function getManTemplateData(command, context) {
  var manTemplateData = {
    l10n: l10n.propertyLookup,
    command: command,

    onclick: function(ev) {
      util.updateCommand(ev.currentTarget, context);
    },

    ondblclick: function(ev) {
      util.executeCommand(ev.currentTarget, context);
    },

    describe: function(item, element) {
      var text = item.manual || item.description;
      var parent = element.ownerDocument.createElement('div');
      util.setContents(parent, text);
      return parent.childNodes;
    },

    getTypeDescription: function(param) {
      var input = '';
      if (param.defaultValue === undefined) {
        input = l10n.lookup('helpManRequired');
      }
      else if (param.defaultValue === null) {
        input = l10n.lookup('helpManOptional');
      }
      else {
        input = param.defaultValue;
      }
      return '(' + param.type.name + ', ' + input + ')';
    }
  };

  Object.defineProperty(manTemplateData, 'subcommands', {
    get: function() {
      var matching = canon.getCommands().filter(function(subcommand) {
        return subcommand.name.indexOf(command.name) === 0 &&
                subcommand.name !== command.name;
      });
      matching.sort(function(c1, c2) {
        return c1.name.localeCompare(c2.name);
      });
      return matching;
    },
    enumerable: true
  });

  return manTemplateData;
}

});
define("text!gcli/commands/help_man.html", [], "\n" +
  "<div>\n" +
  "  <h3>${command.name}</h3>\n" +
  "\n" +
  "  <h4 class=\"gcli-help-header\">\n" +
  "    ${l10n.helpManSynopsis}:\n" +
  "    <span class=\"gcli-out-shortcut\" onclick=\"${onclick}\" data-command=\"${command.name}\">\n" +
  "      ${command.name}\n" +
  "      <span foreach=\"param in ${command.params}\">\n" +
  "        ${param.defaultValue !== undefined ? '[' + param.name + ']' : param.name}\n" +
  "      </span>\n" +
  "    </span>\n" +
  "  </h4>\n" +
  "\n" +
  "  <h4 class=\"gcli-help-header\">${l10n.helpManDescription}:</h4>\n" +
  "\n" +
  "  <p class=\"gcli-help-description\">${describe(command, __element)}</p>\n" +
  "\n" +
  "  <div if=\"${command.exec}\">\n" +
  "    <h4 class=\"gcli-help-header\">${l10n.helpManParameters}:</h4>\n" +
  "\n" +
  "    <ul class=\"gcli-help-parameter\">\n" +
  "      <li if=\"${command.params.length === 0}\">${l10n.helpManNone}</li>\n" +
  "      <li foreach=\"param in ${command.params}\">\n" +
  "        ${param.name} <em>${getTypeDescription(param)}</em>\n" +
  "        <br/>\n" +
  "        ${describe(param, __element)}\n" +
  "      </li>\n" +
  "    </ul>\n" +
  "  </div>\n" +
  "\n" +
  "  <div if=\"${!command.exec}\">\n" +
  "    <h4 class=\"gcli-help-header\">${l10n.subCommands}:</h4>\n" +
  "\n" +
  "    <ul class=\"gcli-help-${subcommands}\">\n" +
  "      <li if=\"${subcommands.length === 0}\">${l10n.subcommandsNone}</li>\n" +
  "      <li foreach=\"subcommand in ${subcommands}\">\n" +
  "        <strong>${subcommand.name}</strong>:\n" +
  "        ${subcommand.description}\n" +
  "        <span class=\"gcli-out-shortcut\" data-command=\"help ${subcommand.name}\"\n" +
  "            onclick=\"${onclick}\" ondblclick=\"${ondblclick}\">\n" +
  "          help ${subcommand.name}\n" +
  "        </span>\n" +
  "      </li>\n" +
  "    </ul>\n" +
  "  </div>\n" +
  "\n" +
  "</div>\n" +
  "");

define("text!gcli/commands/help_list.html", [], "\n" +
  "<div>\n" +
  "  <div if=\"${includeIntro}\">\n" +
  "    <h2>Welcome to GCLI</h2>\n" +
  "    <p>GCLI is an experiment to create a highly usable JavaScript command line for developers.</p>\n" +
  "    <p>\n" +
  "      Useful links:\n" +
  "      <a href='https://github.com/joewalker/gcli'>Source</a> (Apache-2.0),\n" +
  "      <a href='https://github.com/joewalker/gcli/blob/master/docs/index.md'>Documentation</a> (for users/embedders),\n" +
  "      <a href='https://wiki.mozilla.org/DevTools/Features/GCLI'>Mozilla feature page</a> (for GCLI in the web console).\n" +
  "    </p>\n" +
  "  </div>\n" +
  "\n" +
  "  <h3>${heading}</h3>\n" +
  "\n" +
  "  <table>\n" +
  "    <tr foreach=\"command in ${matchingCommands}\">\n" +
  "      <th class=\"gcli-help-name\">${command.name}</th>\n" +
  "      <td class=\"gcli-help-arrow\">-</td>\n" +
  "      <td>\n" +
  "        ${command.description}\n" +
  "        <span class=\"gcli-out-shortcut\"\n" +
  "            onclick=\"${onclick}\" ondblclick=\"${ondblclick}\"\n" +
  "            data-command=\"help ${command.name}\">help ${command.name}</span>\n" +
  "      </td>\n" +
  "    </tr>\n" +
  "  </table>\n" +
  "</div>\n" +
  "");

define("text!gcli/commands/help.css", [], "\n" +
  ".gcli-help-name {\n" +
  "  text-align: end;\n" +
  "}\n" +
  "\n" +
  ".gcli-help-arrow {\n" +
  "  color: #AAA;\n" +
  "}\n" +
  "\n" +
  ".gcli-help-description {\n" +
  "  margin: 0 20px;\n" +
  "  padding: 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-help-parameter {\n" +
  "  margin: 0 30px;\n" +
  "  padding: 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-help-header {\n" +
  "  margin: 10px 0 6px;\n" +
  "}\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/commands/pref', ['require', 'exports', 'module' , 'gcli/canon', 'gcli/l10n', 'gcli/settings', 'text!gcli/commands/pref_set_check.html'], function(require, exports, module) {


var canon = require('gcli/canon');
var l10n = require('gcli/l10n');
var settings = require('gcli/settings');

/**
 * Record if the user has clicked on 'Got It!'
 */
var allowSetSettingSpec = {
  name: 'allowSet',
  type: 'boolean',
  description: l10n.lookup('allowSetDesc'),
  defaultValue: false
};
exports.allowSet = undefined;

/**
 * 'pref' command
 */
var prefCmdSpec = {
  name: 'pref',
  description: l10n.lookup('prefDesc'),
  manual: l10n.lookup('prefManual')
};

/**
 * 'pref show' command
 */
var prefShowCmdSpec = {
  name: 'pref show',
  description: l10n.lookup('prefShowDesc'),
  manual: l10n.lookup('prefShowManual'),
  params: [
    {
      name: 'setting',
      type: 'setting',
      description: l10n.lookup('prefShowSettingDesc'),
      manual: l10n.lookup('prefShowSettingManual')
    }
  ],
  exec: function Command_prefShow(args, context) {
    return args.setting.value;
  }
};

/**
 * 'pref set' command
 */
var prefSetCmdSpec = {
  name: 'pref set',
  description: l10n.lookup('prefSetDesc'),
  manual: l10n.lookup('prefSetManual'),
  params: [
    {
      name: 'setting',
      type: 'setting',
      description: l10n.lookup('prefSetSettingDesc'),
      manual: l10n.lookup('prefSetSettingManual')
    },
    {
      name: 'value',
      type: 'settingValue',
      description: l10n.lookup('prefSetValueDesc'),
      manual: l10n.lookup('prefSetValueManual')
    }
  ],
  exec: function Command_prefSet(args, context) {
    if (!exports.allowSet.value &&
            args.setting.name !== exports.allowSet.name) {
      return context.createView({
        html: require('text!gcli/commands/pref_set_check.html'),
        options: { allowEval: true, stack: 'pref_set_check.html' },
        data: {
          l10n: l10n.propertyLookup,
          activate: function() {
            context.exec('pref set ' + exports.allowSet.name + ' true');
          }
        },
      });
    }
    args.setting.value = args.value;
    return null;
  }
};

/**
 * 'pref reset' command
 */
var prefResetCmdSpec = {
  name: 'pref reset',
  description: l10n.lookup('prefResetDesc'),
  manual: l10n.lookup('prefResetManual'),
  params: [
    {
      name: 'setting',
      type: 'setting',
      description: l10n.lookup('prefResetSettingDesc'),
      manual: l10n.lookup('prefResetSettingManual')
    }
  ],
  exec: function Command_prefReset(args, context) {
    args.setting.setDefault();
    return null;
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  exports.allowSet = settings.addSetting(allowSetSettingSpec);

  canon.addCommand(prefCmdSpec);
  canon.addCommand(prefShowCmdSpec);
  canon.addCommand(prefSetCmdSpec);
  canon.addCommand(prefResetCmdSpec);
};

exports.shutdown = function() {
  canon.removeCommand(prefCmdSpec);
  canon.removeCommand(prefShowCmdSpec);
  canon.removeCommand(prefSetCmdSpec);
  canon.removeCommand(prefResetCmdSpec);

  settings.removeSetting(allowSetSettingSpec);
  exports.allowSet = undefined;
};


});
define("text!gcli/commands/pref_set_check.html", [], "<div>\n" +
  "  <p><strong>${l10n.prefSetCheckHeading}</strong></p>\n" +
  "  <p>${l10n.prefSetCheckBody}</p>\n" +
  "  <button onclick=\"${activate}\">${l10n.prefSetCheckGo}</button>\n" +
  "</div>\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/commands/pref_list', ['require', 'exports', 'module' , 'gcli/canon', 'gcli/l10n', 'gcli/util', 'gcli/settings', 'gcli/promise', 'text!gcli/commands/pref_list_outer.html', 'text!gcli/commands/pref_list.css', 'text!gcli/commands/pref_list_inner.html'], function(require, exports, module) {


var canon = require('gcli/canon');
var l10n = require('gcli/l10n');
var util = require('gcli/util');
var settings = require('gcli/settings');
var Promise = require('gcli/promise').Promise;

/**
 * 'pref list' command
 */
var prefListCmdSpec = {
  name: 'pref list',
  description: l10n.lookup('prefListDesc'),
  manual: l10n.lookup('prefListManual'),
  params: [
    {
      name: 'search',
      type: 'string',
      defaultValue: null,
      description: l10n.lookup('prefListSearchDesc'),
      manual: l10n.lookup('prefListSearchManual')
    }
  ],
  exec: function Command_prefList(args, context) {
    return context.createView({
      html: require('text!gcli/commands/pref_list_outer.html'),
      data: new PrefList(args, context),
      options: {
        blankNullUndefined: true,
        allowEval: true,
        stack: 'pref_list_outer.html'
      },
      css: require('text!gcli/commands/pref_list.css'),
      cssId: 'gcli-pref-list'
    });
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function(excludeList) {
  canon.addCommand(prefListCmdSpec);
};

exports.shutdown = function() {
  canon.removeCommand(prefListCmdSpec);
};


/**
 * A manager for our version of about:config
 */
function PrefList(args, context) {
  this.search = args.search;
  this.context = context;
  this.url = util.createUrlLookup(module);
  this.edit = this.url('pref_list_edit.png');
}

/**
 *
 */
PrefList.prototype.onLoad = function(element) {
  var table = element.querySelector('.gcli-pref-list-table');
  this.updateTable(table);
  return '';
};

/**
 * Forward localization lookups
 */
PrefList.prototype.l10n = l10n.propertyLookup;

/**
 * Called from the template onkeyup for the filter element
 */
PrefList.prototype.updateTable = function(table) {
  util.clearElement(table);
  var view = this.context.createView({
    html: require('text!gcli/commands/pref_list_inner.html'),
    options: { blankNullUndefined: true, stack: 'pref_list_inner.html' },
    data: this
  });
  var child = view.toDom(table.ownerDocument);
  util.setContents(table, child);
};

/**
 * Which preferences match the filter?
 */
Object.defineProperty(PrefList.prototype, 'preferences', {
  get: function() {
    return settings.getAll(this.search);
  },
  enumerable: true
});

/**
 * Which preferences match the filter?
 */
Object.defineProperty(PrefList.prototype, 'promisePreferences', {
  get: function() {
    var promise = new Promise();
    setTimeout(function() {
      promise.resolve(settings.getAll(this.search));
    }.bind(this), 10);
    return promise;
  },
  enumerable: true
});

PrefList.prototype.onFilterChange = function(ev) {
  if (ev.target.value !== this.search) {
    this.search = ev.target.value;

    var root = ev.target.parentNode.parentNode;
    var table = root.querySelector('.gcli-pref-list-table');
    this.updateTable(table);
  }
};

PrefList.prototype.onSetClick = function(ev) {
  var typed = ev.currentTarget.getAttribute('data-command');
  this.context.update(typed);
};

});
define("text!gcli/commands/pref_list_outer.html", [], "<div ignore=\"${onLoad(__element)}\">\n" +
  "  <div class=\"gcli-pref-list-filter\">\n" +
  "    ${l10n.prefOutputFilter}:\n" +
  "    <input onKeyUp=\"${onFilterChange}\" value=\"${search}\"/>\n" +
  "  </div>\n" +
  "  <table class=\"gcli-pref-list-table\">\n" +
  "    <colgroup>\n" +
  "      <col class=\"gcli-pref-list-name\"/>\n" +
  "      <col class=\"gcli-pref-list-value\"/>\n" +
  "    </colgroup>\n" +
  "    <tr>\n" +
  "      <th>${l10n.prefOutputName}</th>\n" +
  "      <th>${l10n.prefOutputValue}</th>\n" +
  "    </tr>\n" +
  "  </table>\n" +
  "  <div class=\"gcli-pref-list-scroller\">\n" +
  "    <table class=\"gcli-pref-list-table\" save=\"${table}\">\n" +
  "    </table>\n" +
  "  </div>\n" +
  "</div>\n" +
  "");

define("text!gcli/commands/pref_list.css", [], "\n" +
  ".gcli-pref-list-scroller {\n" +
  "  max-height: 200px;\n" +
  "  overflow-y: auto;\n" +
  "  overflow-x: hidden;\n" +
  "  display: inline-block;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-table {\n" +
  "  width: 500px;\n" +
  "  table-layout: fixed;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-table tr > th {\n" +
  "  text-align: left;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-table tr > td {\n" +
  "  text-overflow: elipsis;\n" +
  "  word-wrap: break-word;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-name {\n" +
  "  width: 70%;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-command {\n" +
  "  display: none;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-row:hover .gcli-pref-list-command {\n" +
  "  display: inline-block;\n" +
  "}\n" +
  "");

define("text!gcli/commands/pref_list_inner.html", [], "<table>\n" +
  "  <colgroup>\n" +
  "    <col class=\"gcli-pref-list-name\"/>\n" +
  "    <col class=\"gcli-pref-list-value\"/>\n" +
  "  </colgroup>\n" +
  "  <tr class=\"gcli-pref-list-row\" foreach=\"preference in ${promisePreferences}\">\n" +
  "    <td>${preference.name}</td>\n" +
  "    <td onclick=\"${onSetClick}\" data-command=\"pref set ${preference.name} \">\n" +
  "      ${preference.value}\n" +
  "      <img class=\"gcli-pref-list-command\" _src=\"${edit}\"/>\n" +
  "    </td>\n" +
  "  </tr>\n" +
  "</table>\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gcli/commands/intro', ['require', 'exports', 'module' , 'gcli/canon', 'gcli/l10n', 'gcli/ui/intro'], function(require, exports, module) {

  var canon = require('gcli/canon');
  var l10n = require('gcli/l10n');
  var intro = require('gcli/ui/intro');

  /**
   * 'intro' command
   */
  var introCmdSpec = {
    name: 'intro',
    description: l10n.lookup('introDesc'),
    manual: l10n.lookup('introManual'),
    returnType: 'html',
    exec: function echo(args, context) {
      return intro.createView(context);
    }
  };

  /**
   * Registration and de-registration.
   */
  exports.startup = function() {
    canon.addCommand(introCmdSpec);
  };

  exports.shutdown = function() {
    canon.removeCommand(introCmdSpec);
  };

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('test/commands/test', ['require', 'exports', 'module' , 'gcli/canon', 'test/examiner', 'text!test/commands/test.css', 'text!test/commands/test.html'], function(require, exports, module) {


var canon = require('gcli/canon');

var examiner = require("test/examiner");

var testCss = require("text!test/commands/test.css");
var testHtml = require('text!test/commands/test.html');


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  canon.addCommand(testCommandSpec);
};

exports.shutdown = function() {
  canon.removeCommand(testCommandSpec);
};

/**
 * The 'test' command
 */
var testCommandSpec = {
  name: 'test',
  description: 'Runs the GCLI Unit Tests',
  params: [
    {
      name: 'suite',
      type: {
        name: 'selection',
        lookup: function() {
          return Object.keys(examiner.suites).map(function (name) {
            return { name: name, value: examiner.suites[name] };
          });
        },
      },
      description: 'Test suite to run.',
      defaultValue: null
    }
  ],
  exec: function(args, context) {
    var promise = context.createPromise();

    var options = {};
    examiner.mergeDefaultOptions(options);

    examiner.reset();

    if (args.suite) {
      args.suite.runAsync(options, this.createResolver(promise, context));
    }
    else {
      examiner.runAsync(options, this.createResolver(promise, context));
    }

    return promise;
  },
  createResolver: function(promise, context) {
    return function() {
      promise.resolve(context.createView({
        html: testHtml,
        css: testCss,
        cssId: 'gcli-test',
        data: examiner.toRemote(),
        options: { allowEval: true, stack: 'test.html' }
      }));
      context.update('');
    };
  }
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('test/examiner', ['require', 'exports', 'module' , 'test/assert', 'test/status'], function(require, exports, module) {
var examiner = exports;

var assert = require('test/assert');
var stati = require('test/status').stati;

/**
 * Test harness data
 */
examiner.suites = {};

/**
 * The gap between tests when running async
 */
var delay = 10;

/**
 * Add a test suite. Generally used like:
 * test.addSuite('foo', require('path/to/foo'));
 */
examiner.addSuite = function(name, suite) {
  examiner.suites[name] = new Suite(name, suite);
};

/**
 * When run from an command, there are some options that we can't (and
 * shouldn't) specify, so we allow a set of default options, which are merged
 * with the specified options in |run()|.
 */
examiner.defaultOptions = {};

/**
 * Add properties to |options| from |examiner.defaultOptions| when |options|
 * does not have a value for a given name.
 */
examiner.mergeDefaultOptions = function(options) {
  Object.keys(examiner.defaultOptions).forEach(function(name) {
    if (options[name] == null) {
      options[name] = examiner.defaultOptions[name];
    }
  });
};

/**
 * Run the tests defined in the test suite synchronously
 */
examiner.run = function(options) {
  Object.keys(examiner.suites).forEach(function(suiteName) {
    var suite = examiner.suites[suiteName];
    suite.run(options);
  }.bind(this));

  if (options.detailedResultLog) {
    examiner.detailedResultLog();
  }
  else {
    console.log('Completed test suite');
  }

  return examiner.suites;
};

/**
 * Run all the tests asynchronously
 */
examiner.runAsync = function(options, callback) {
  this._runAsyncInternal(0, options, callback);
};

/**
 * Run all the test suits asynchronously
 */
examiner._runAsyncInternal = function(i, options, callback) {
  if (i >= Object.keys(examiner.suites).length) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  var suiteName = Object.keys(examiner.suites)[i];
  examiner.suites[suiteName].runAsync(options, function() {
    setTimeout(function() {
      examiner._runAsyncInternal(i + 1, options, callback);
    }.bind(this), delay);
  }.bind(this));
};

/**
 * Create a JSON object suitable for serialization
 */
examiner.toRemote = function() {
  return {
    suites: Object.keys(examiner.suites).map(function(suiteName) {
      return examiner.suites[suiteName].toRemote();
    }.bind(this)),
    summary: {
      checks: this.checks,
      status: this.status
    }
  };
};

/**
 * Reset all the tests to their original state
 */
examiner.reset = function() {
  Object.keys(examiner.suites).forEach(function(suiteName) {
    examiner.suites[suiteName].reset();
  }, this);
};

/**
 * The number of checks in this set of test suites is the sum of the checks in
 * the test suites.
 */
Object.defineProperty(examiner, 'checks', {
  get: function() {
    return  Object.keys(examiner.suites).reduce(function(current, suiteName) {
      return current + examiner.suites[suiteName].checks;
    }.bind(this), 0);
  },
  enumerable: true
});

/**
 * The status of this set of test suites is the worst of the statuses of the
 * contained test suites.
 */
Object.defineProperty(examiner, 'status', {
  get: function() {
    return Object.keys(examiner.suites).reduce(function(status, suiteName) {
      var suiteStatus = examiner.suites[suiteName].status;
      return status.index > suiteStatus.index ? status : suiteStatus;
    }.bind(this), stati.notrun);
  },
  enumerable: true
});

/**
 * Output a test summary to console.log
 */
examiner.detailedResultLog = function() {
  Object.keys(this.suites).forEach(function(suiteName) {
    var suite = examiner.suites[suiteName];

    console.log(suite.name + ': ' + suite.status.name + ' (funcs=' +
            Object.keys(suite.tests).length +
            ', checks=' + suite.checks + ')');

    Object.keys(suite.tests).forEach(function(testName) {
      var test = suite.tests[testName];
      if (test.status !== stati.pass || test.failures.length !== 0) {
        console.log('- ' + test.name + ': ' + test.status.name);
        test.failures.forEach(function(failure) {
          console.log('  - ' + failure.message);
          if (failure.params) {
            console.log('    - P1: ' + failure.p1);
            console.log('    - P2: ' + failure.p2);
          }
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));

  console.log();
  console.log('Summary: ' + this.status.name + ' (' + this.checks + ' checks)');
};

/**
 * A suite is a group of tests
 */
function Suite(suiteName, suite) {
  this.name = suiteName.replace(/gclitest\//, '');
  this.suite = suite;

  this.tests = {};
  Object.keys(suite).forEach(function(testName) {
    if (testName !== 'setup' && testName !== 'shutdown') {
      var test = new Test(this, testName, suite[testName]);
      this.tests[testName] = test;
    }
  }.bind(this));
}

/**
 * Reset all the tests to their original state
 */
Suite.prototype.reset = function() {
  Object.keys(this.tests).forEach(function(testName) {
    this.tests[testName].reset();
  }, this);
};

/**
 * Run all the tests in this suite synchronously
 */
Suite.prototype.run = function(options) {
  if (!this._setup(options)) {
    return;
  }

  Object.keys(this.tests).forEach(function(testName) {
    this.tests[testName].run(options);
  }, this);

  this._shutdown(options);
};

/**
 * Run all the tests in this suite asynchronously
 */
Suite.prototype.runAsync = function(options, callback) {
  if (!this._setup(options)) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  this._runAsyncInternal(0, options, function() {
    this._shutdown(options);

    if (typeof callback === 'function') {
      callback();
    }
  }.bind(this));
};

/**
 * Function used by the async runners that can handle async recursion.
 */
Suite.prototype._runAsyncInternal = function(i, options, callback) {
  if (i >= Object.keys(this.tests).length) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  var testName = Object.keys(this.tests)[i];
  this.tests[testName].runAsync(options, function() {
    setTimeout(function() {
      this._runAsyncInternal(i + 1, options, callback);
    }.bind(this), delay);
  }.bind(this));
};

/**
 * Create a JSON object suitable for serialization
 */
Suite.prototype.toRemote = function() {
  return {
    name: this.name,
    tests: Object.keys(this.tests).map(function(testName) {
      return this.tests[testName].toRemote();
    }.bind(this))
  };
};

/**
 * The number of checks in this suite is the sum of the checks in the contained
 * tests.
 */
Object.defineProperty(Suite.prototype, 'checks', {
  get: function() {
    return Object.keys(this.tests).reduce(function(prevChecks, testName) {
      return prevChecks + this.tests[testName].checks;
    }.bind(this), 0);
  },
  enumerable: true
});

/**
 * The status of a test suite is the worst of the statuses of the contained
 * tests.
 */
Object.defineProperty(Suite.prototype, 'status', {
  get: function() {
    return Object.keys(this.tests).reduce(function(prevStatus, testName) {
      var suiteStatus = this.tests[testName].status;
      return prevStatus.index > suiteStatus.index ? prevStatus : suiteStatus;
    }.bind(this), stati.notrun);
  },
  enumerable: true
});

/**
 * Defensively setup the test suite
 */
Suite.prototype._setup = function(options) {
  if (typeof this.suite.setup !== 'function') {
    return true;
  }

  try {
    this.suite.setup(options);
    return true;
  }
  catch (ex) {
    this._logToAllTests('' + ex);
    console.error(ex);
    if (ex.stack) {
      console.error(ex.stack);
    }
    return false;
  }
};

/**
 * Defensively shutdown the test suite
 */
Suite.prototype._shutdown = function(options) {
  if (typeof this.suite.shutdown !== 'function') {
    return true;
  }

  try {
    this.suite.shutdown(options);
    return true;
  }
  catch (ex) {
    this._logToAllTests('' + ex);
    console.error(ex);
    if (ex.stack) {
      console.error(ex.stack);
    }
    return false;
  }
};

/**
 * Something has gone wrong that affects all tests in this Suite
 */
Suite.prototype._logToAllTests = function(message) {
  var priorCurrentTest = assert.currentTest;
  Object.keys(this.tests).forEach(function(testName) {
    assert.currentTest = this.tests[testName];
    assert.ok(false, message);
  }.bind(this));
  assert.currentTest = priorCurrentTest;
};


/**
 * A test represents data about a single test function
 */
function Test(suite, name, func) {
  this.suite = suite;
  this.name = name;
  this.func = func;
  this.title = name.replace(/^test/, '').replace(/([A-Z])/g, ' $1');

  this.failures = [];
  this.status = stati.notrun;
  this.checks = 0;
}

/**
 * Reset the test to its original state
 */
Test.prototype.reset = function() {
  this.failures = [];
  this.status = stati.notrun;
  this.checks = 0;
};

/**
 * Run just a single test
 */
Test.prototype.run = function(options) {
  assert.currentTest = this;
  this.status = stati.executing;
  this.failures = [];
  this.checks = 0;

  try {
    this.func.apply(this.suite, [ options ]);
  }
  catch (ex) {
    assert.ok(false, '' + ex);
    console.error(ex.stack);
    if ((options.isNode || options.isFirefox) && ex.stack) {
      console.error(ex.stack);
    }
  }

  if (this.status === stati.executing) {
    this.status = stati.pass;
  }

  assert.currentTest = null;
};

/**
 * Run all the tests in this suite asynchronously
 */
Test.prototype.runAsync = function(options, callback) {
  setTimeout(function() {
    this.run(options);
    if (typeof callback === 'function') {
      callback();
    }
  }.bind(this), delay);
};

/**
 * Create a JSON object suitable for serialization
 */
Test.prototype.toRemote = function() {
  return {
    name: this.name,
    title: this.title,
    status: this.status,
    failures: this.failures,
    checks: this.checks
  };
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('test/assert', ['require', 'exports', 'module' , 'test/status'], function(require, exports, module) {

var stati = require('test/status').stati;

/**
 * Module dependency loop resolution
 * examiner/assert both want to depend on each other, and we'd rather not
 * depend on gcli/util.createEvent (which could make matters worse) so we just
 * have examiner record the current test here.
 */
exports.currentTest = null;

/**
 * Record a test failure if |value| is not truthy
 * Failure is marked by a record being added to the failure list with a message
 * property containing the passed message.
 */
exports.ok = function(value, message) {
  if (!exports.currentTest) {
    console.error('No currentTest for ' + message);
    return;
  }

  if (!value) {
    console.error('Failure: ' + message);
    console.trace();

    exports.currentTest.status = stati.fail;
    exports.currentTest.failures.push({ message: message });
  }
  else {
    exports.currentTest.checks++;
  }
};

/**
 * Record a test failure if |p1 !== p2|
 * Failure is marked by a record being added to the failure list with the
 * following properties:
 * - message: The string passed in to the |is| function
 * - params: (true) To distinguish from an |ok| failure
 * - p1: The first parameter to compare
 * - p2: The second parameter to compare against
 */
exports.is = function(p1, p2, message) {
  if (!exports.currentTest) {
    console.error('No currentTest for ' + failure.message);
    return;
  }

  if (p1 !== p2) {
    console.error('Failure: ' + message);
    console.error('- P1: ', typeof p1 === 'string' ? '"' + p1 + '"' : p1);
    console.error('- P2: ', typeof p2 === 'string' ? '"' + p2 + '"' : p2);
    console.trace();

    exports.currentTest.status = stati.fail;
    exports.currentTest.failures.push({ message: message, params: true, p1: p1, p2: p2 });
  }
  else {
    exports.currentTest.checks++;
  }
};

/**
 * Add some extra information to the test logs
 */
exports.log = function(message) {
  if (!exports.currentTest) {
    console.error('No currentTest for ' + failure.message);
    return;
  }

  exports.currentTest.failures.push({ message: message });
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('test/status', ['require', 'exports', 'module' ], function(require, exports, module) {

  /**
   * This should really be inside assert.js, however that is over-ridden by
   * a custom assert.js for mozilla, so we keep it separate to avoid
   * duplicating it in 2 places.
   */
  exports.stati = {
    notrun: { index: 0, name: 'Skipped' },
    executing: { index: 1, name: 'Executing' },
    asynchronous: { index: 2, name: 'Waiting' },
    pass: { index: 3, name: 'Pass' },
    fail: { index: 4, name: 'Fail' }
  };

});
define("text!test/commands/test.css", [], "\n" +
  ".gcliTestSkipped {\n" +
  "  background-color: #EEE;\n" +
  "  color: #000;\n" +
  "}\n" +
  "\n" +
  ".gcliTestExecuting {\n" +
  "  background-color: #888;\n" +
  "  color: #FFF;\n" +
  "}\n" +
  "\n" +
  ".gcliTestWaiting {\n" +
  "  background-color: #FFA;\n" +
  "  color: #000;\n" +
  "}\n" +
  "\n" +
  ".gcliTestPass {\n" +
  "  background-color: #8F8;\n" +
  "  color: #000;\n" +
  "}\n" +
  "\n" +
  ".gcliTestFail {\n" +
  "  background-color: #F00;\n" +
  "  color: #FFF;\n" +
  "}\n" +
  "\n" +
  "td.gcliTestSuite {\n" +
  "  font-family: monospace;\n" +
  "  font-size: 90%;\n" +
  "  text-align: right;\n" +
  "}\n" +
  "\n" +
  ".gcliTestResults th.gcliTestSuite,\n" +
  ".gcliTestResults .gcliTestChecks {\n" +
  "  text-align: right;\n" +
  "}\n" +
  "\n" +
  ".gcliTestResults th {\n" +
  "  text-align: left;\n" +
  "}\n" +
  "\n" +
  ".gcliTestMessages ul {\n" +
  "  margin: 0 0 10px;\n" +
  "  padding-left: 20px;\n" +
  "  list-style-type: square;\n" +
  "}\n" +
  "");

define("text!test/commands/test.html", [], "\n" +
  "<div>\n" +
  "  <table class=\"gcliTestResults\">\n" +
  "    <thead>\n" +
  "      <tr>\n" +
  "        <th class=\"gcliTestSuite\">Suite</th>\n" +
  "        <th>Test</th>\n" +
  "        <th>Results</th>\n" +
  "        <th>Checks</th>\n" +
  "        <th>Notes</th>\n" +
  "      </tr>\n" +
  "    </thead>\n" +
  "    <tbody foreach=\"suite in ${suites}\">\n" +
  "      <tr foreach=\"test in ${suite.tests}\" title=\"${suite.name}.${test.name}()\">\n" +
  "        <td class=\"gcliTestSuite\">${suite.name}</td>\n" +
  "        <td class=\"gcliTestTitle\">${test.title}</td>\n" +
  "        <td class=\"gcliTest${test.status.name}\">${test.status.name}</td>\n" +
  "        <td class=\"gcliTestChecks\">${test.checks}</td>\n" +
  "        <td class=\"gcliTestMessages\">\n" +
  "          <div foreach=\"failure in ${test.failures}\">\n" +
  "            ${failure.message}\n" +
  "            <ul if=\"${failure.params}\">\n" +
  "              <li>P1: ${failure.p1}</li>\n" +
  "              <li>P2: ${failure.p2}</li>\n" +
  "            </ul>\n" +
  "          </div>\n" +
  "        </td>\n" +
  "      </tr>\n" +
  "    </tbody>\n" +
  "    <tfoot>\n" +
  "      <tr>\n" +
  "        <th></th>\n" +
  "        <th>Total</th>\n" +
  "        <th>${summary.status.name}</th>\n" +
  "        <th class=\"gcliTestChecks\">${summary.checks}</th>\n" +
  "        <th></th>\n" +
  "      </tr>\n" +
  "    </tfoot>\n" +
  "  </table>\n" +
  "</div>\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('demo/commands/basic', ['require', 'exports', 'module' , 'gcli/index'], function(require, exports, module) {


var gcli = require('gcli/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(echo);
  gcli.addCommand(alert);
  gcli.addCommand(edit);
  gcli.addCommand(sleep);
};

exports.shutdown = function() {
  gcli.removeCommand(echo);
  gcli.removeCommand(alert);
  gcli.removeCommand(edit);
  gcli.removeCommand(sleep);
};


/**
 * Arm window.alert with metadata
 */
var alert = {
  name: 'alert',
  description: 'Show an alert dialog',
  params: [
    {
      name: 'message',
      type: 'string',
      description: 'Message to display'
    }
  ],
  exec: function(args, context) {
    window.alert(args.message);
  }
};

/**
 * 'echo' command
 */
var echo = {
  name: 'echo',
  description: {
    root: 'Show a message',
    fr_fr: 'Afficher un message',
  },
  params: [
    {
      name: 'message',
      type: 'string',
      description: {
        root: 'The message to output',
        fr_fr: 'Le message à afficher'
      }
    }
  ],
  returnType: 'string',
  exec: function echo(args, context) {
    return args.message;
  }
};

/**
 * 'edit' command
 */
var edit = {
  name: 'edit',
  description: 'Edit a file',
  params: [
    {
      name: 'resource',
      type: { name: 'resource', include: 'text/css' },
      description: 'The resource to edit'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    var promise = context.createPromise();
    args.resource.loadContents(function(data) {
      promise.resolve('<p>This is just a demo</p>' +
                      '<textarea rows=5 cols=80>' + data + '</textarea>');
    });
    return promise;
  }
};

/**
 * 'sleep' command
 */
var sleep = {
  name: 'sleep',
  description: 'Wait for a while',
  params: [
    {
      name: 'length',
      type: { name: 'number', min: 1 },
      description: 'How long to wait (s)'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    var promise = context.createPromise();
    window.setTimeout(function() {
      promise.resolve('done');
    }, args.length * 1000);
    return promise;
  }
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('demo/commands/bugs', ['require', 'exports', 'module' , 'gcli/index', 'gcli/util', 'text!demo/commands/bugs.html'], function(require, exports, module) {


var gcli = require('gcli/index');
var util = require('gcli/util');

var bugsHtml = require('text!demo/commands/bugs.html');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(bugzCommandSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(bugzCommandSpec);
};


/**
 * 'bugz' command.
 */
var bugzCommandSpec = {
  name: 'bugz',
  returnType: 'html',
  description: 'List the GCLI bugs open in Bugzilla',
  exec: function(args, context) {
    var promise = context.createPromise();

    function onFailure(msg) {
      promise.resolve(msg);
    }

    var query = 'short_desc=GCLI' +
      '&short_desc_type=allwords' +
      '&bug_status=UNCONFIRMED' +
      '&bug_status=NEW' +
      '&bug_status=ASSIGNED' +
      '&bug_status=REOPENED';

    queryBugzilla(query, function(json) {
      json.bugs.forEach(function(bug) {
        if (bug.target_milestone === '---') {
          bug.target_milestone = 'Future';
        }
      });
      json.bugs.sort(function(bug1, bug2) {
        var ms = bug1.target_milestone.localeCompare(bug2.target_milestone);
        if (ms !== 0) {
          return ms;
        }
        return bug1.priority.localeCompare(bug2.priority);
      });

      promise.resolve(context.createView({
        html: bugsHtml,
        data: json
      }));
    }, onFailure);

    return promise;
  }
};

/**
 * Simple wrapper for querying bugzilla.
 * @see https://wiki.mozilla.org/Bugzilla:REST_API
 * @see https://wiki.mozilla.org/Bugzilla:REST_API:Search
 * @see http://www.bugzilla.org/docs/developer.html
 * @see https://harthur.wordpress.com/2011/03/31/bz-js/
 * @see https://github.com/harthur/bz.js
 */
function queryBugzilla(query, onSuccess, onFailure) {
  var url = 'https://api-dev.bugzilla.mozilla.org/0.9/bug?' + query;

  var req = new XMLHttpRequest();
  req.open('GET', url, true);
  req.setRequestHeader('Accept', 'application/json');
  req.setRequestHeader('Content-type', 'application/json');
  req.onreadystatechange = function(event) {
    if (req.readyState == 4) {
      if (req.status >= 300 || req.status < 200) {
        onFailure('Error: ' + JSON.stringify(req));
        return;
      }

      var json;
      try {
        json = JSON.parse(req.responseText);
      }
      catch (ex) {
        onFailure('Invalid response: ' + ex + ': ' + req.responseText);
        return;
      }

      if (json.error) {
        onFailure('Error: ' + json.error.message);
        return;
      }

      onSuccess(json);
    }
  }.bind(this);
  req.send();
}


});
define("text!demo/commands/bugs.html", [], "\n" +
  "<div>\n" +
  "  <p>\n" +
  "    Open GCLI meta-bugs\n" +
  "    (i.e. <a target=\"_blank\" href=\"https://bugzilla.mozilla.org/buglist.cgi?list_id=2622790;short_desc=GCLI;resolution=---;resolution=DUPLICATE;query_format=advanced;bug_status=UNCONFIRMED;bug_status=NEW;bug_status=ASSIGNED;bug_status=REOPENED;short_desc_type=allwords\">this search</a>):\n" +
  "  </p>\n" +
  "  <table>\n" +
  "    <thead>\n" +
  "      <tr>\n" +
  "        <th>ID</th>\n" +
  "        <th>Milestone</th>\n" +
  "        <th>Pri</th>\n" +
  "        <th>Summary</th>\n" +
  "      </tr>\n" +
  "    </thead>\n" +
  "    <tbody>\n" +
  "      <tr foreach=\"bug in ${bugs}\">\n" +
  "        <td><a target=\"_blank\" href=\"https://bugzilla.mozilla.org/show_bug.cgi?id=${bug.id}\">${bug.id}</a></td>\n" +
  "        <td>${bug.target_milestone}</td>\n" +
  "        <td>${bug.priority}</td>\n" +
  "        <td>${bug.summary}</td>\n" +
  "      </tr>\n" +
  "    </tbody>\n" +
  "  </table>\n" +
  "</div>\n" +
  "");

/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('demo/commands/demo', ['require', 'exports', 'module' , 'gcli/index'], function(require, exports, module) {


var gcli = require('gcli/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(gcliTop);
  gcli.addCommand(gcliOnestring);
  gcli.addCommand(gcliTwostrings);
  gcli.addCommand(gcliTwonums);
  gcli.addCommand(gcliSelboolnum);
  gcli.addCommand(gcliNode);
};

exports.shutdown = function() {
  gcli.removeCommand(gcliTop);
  gcli.removeCommand(gcliOnestring);
  gcli.removeCommand(gcliTwostrings);
  gcli.removeCommand(gcliTwonums);
  gcli.removeCommand(gcliSelboolnum);
  gcli.removeCommand(gcliNode);
};


/**
 * Parent Command
 */
var gcliTop = {
  name: 'gcli',
  description: 'Commands for playing with the UI'
};


/**
 * 'gcli onestring' command
 */
var gcliOnestring = {
  name: 'gcli onestring',
  description: 'Single string parameter',
  params: [
    { name: 'text', type: 'string', description: 'Demo param' }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() + 'text=' + args.text;
  }
};

/**
 * 'gcli twostrings' command
 */
var gcliTwostrings = {
  name: 'gcli twostrings',
  description: '2 string parameters',
  params: [
    { name: 'p1', type: 'string', description: 'First param' },
    { name: 'p2', type: 'string', description: 'Second param' }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() +
      'p1=\'' + args.p1 + '\', p2=\'' + args.p2 + '\'';
  }
};

/**
 * 'gcli twonums' command
 */
var gcliTwonums = {
  name: 'gcli twonums',
  description: '2 numeric parameters',
  params: [
    {
      name: 'p1',
      type: 'number',
      description: 'First param'
    },
    {
      name: 'p2',
      defaultValue: 8,
      type: { name: 'number', min: -20, max: 42, step: 5 },
      description: 'Second param'
    },
    {
      group: 'Options',
      params: [
        {
          name: 'all',
          description: 'All your base',
          type: 'boolean'
        },
        {
          name: 'verbose',
          description: 'Be verbose',
          type: 'boolean'
        },
        {
          name: 'message',
          description: 'A message',
          type: 'string',
          defaultValue: 'nothing'
        },
        {
          name: 'browser',
          description: 'Pick a browser',
          type: {
            name: 'selection',
            lookup: [
              { name: 'chrome', value: 1 },
              { name: 'firefox', value: 2 },
              { name: 'ie', value: 3 },
              { name: 'opera', value: 4 },
              { name: 'safari', value: 5 }
            ]
          },
          defaultValue: 3
        }
      ]
    },
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() +
      'p1=' + args.p1 + ', p2=' + args.p2;
  }
};

/**
 * 'gcli selboolnum' command
 */
var gcliSelboolnum = {
  name: 'gcli selboolnum',
  description: 'A selection, a boolean and a number',
  params: [
    {
      name: 'sel',
      type: {
        name: 'selection',
        lookup: [
          { name: 'firefox', value: 4 },
          { name: 'chrome', value: 12 },
          { name: 'ie', value: 9 },
          { name: 'opera', value: 10 },
          { name: 'safari', value: 5 }
        ]
      },
      description: 'First param'
    },
    {
      name: 'bool',
      type: 'boolean',
      description: 'A boolean param'
    },
    {
      name: 'num',
      type: { name: 'number', min: -4, max: 42, step: 5 },
      description: 'A number param'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() +
      'p1=' + args.p1 + ', p2=' + args.p2 + ', p3=' + args.p3;
  }
};

/**
 * 'gcli node' command
 */
var gcliNode = {
  name: 'gcli node',
  description: 'Single node parameter',
  params: [
    { name: 'node', type: 'node', description: 'CSS selector pointing at a single node' }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() + 'node=' + args.node;
  }
};


var messages = [
  'GCLI wants you to trick it out in some way.</br>',
  'GCLI is your web command line.</br>',
  'GCLI would love to be like Zsh on the Web.</br>',
  'GCLI is written on the Web platform, so you can tweak it.</br>'
];
function motivate() {
  var index = Math.floor(Math.random() * messages.length);
  return messages[index];
}


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/index', ['require', 'exports', 'module' , 'gclitest/suite', 'gcli/settings', 'gcli/ui/display'], function(require, exports, module) {

  var examiner = require('gclitest/suite').examiner;
  var settings = require('gcli/settings');
  var Display = require('gcli/ui/display').Display;

  // A minimum fake dom to get us through the JS tests
  var fakeWindow = {
    isFake: true,
    document: { title: 'Fake DOM' }
  };
  fakeWindow.window = fakeWindow;
  examiner.defaultOptions = {
    window: fakeWindow,
    hideExec: true
  };

  /**
   * A simple proxy to examiner.run, for convenience - this is run from the
   * top level.
   * @param options Lookup of options that customize test running. Includes:
   * - window (default=undefined) A reference to the DOM window. If left
   *   undefined then a reduced set of tests will run.
   * - isNode (default=false) Are we running under NodeJS, specifically, are we
   *   using JSDom, which isn't a 100% complete DOM implementation.
   *   Some tests are skipped when using NodeJS.
   * - display (default=undefined) A reference to a Display implementation.
   *   A reduced set of tests will run if left undefined
   * - detailedResultLog (default=false) do we output a test summary to
   *   |console.log| on test completion.
   * - hideExec (default=false) Set the |hidden| property in calls to
   *   |requisition.exec()| which prevents the display from becoming messed up,
   *   however use of hideExec restricts the set of tests that are run
   */
  exports.run = function(options) {
    options = options || {};
    examiner.mergeDefaultOptions(options);

    examiner.reset();
    examiner.run(options);

    // A better set of default than those specified above, come from the set
    // that are passed to run().
    examiner.defaultOptions = {
      window: options.window,
      display: options.display,
      hideExec: options.hideExec
    };
  };

  /**
   * This is the equivalent of gcli/index.createDisplay() except it:
   * - Sets window.display: to actual Display object (not the thin proxy
   *   returned by gcli/index.createDisplay() and this function)
   * - Registers all the test commands, and provides a function to re-register
   *   them - window.testCommands() (running the test suite un-registers them)
   * - Runs the unit tests automatically on startup
   * - Registers a 'test' command to re-run the unit tests
   */
  exports.createDisplay = function(options) {
    options = options || {};
    if (options.settings != null) {
      settings.setDefaults(options.settings);
    }

    window.display = new Display(options);
    var requisition = window.display.requisition;

    // setTimeout keeps stack traces clear of RequireJS frames
    window.setTimeout(function() {
      var options = {
        window: window,
        display: window.display,
        hideExec: true
      };
      exports.run(options);

      window.createDebugCheck = function() {
        require([ 'gclitest/helpers' ], function(helpers) {
          helpers.setup(options);
          console.log(helpers._createDebugCheck());
          helpers.shutdown(options);
        });
      };

      window.summaryJson = function() {
        var args = [ 'Requisition: ' ];
        var summary = display.requisition._summaryJson;
        Object.keys(summary).forEach(function(name) {
          args.push(' ' + name + '=');
          args.push(summary[name]);
        });
        console.log.apply(console, args);

        console.log('Focus: ' +
                    'tooltip=', display.focusManager._shouldShowTooltip(),
                    'output=', display.focusManager._shouldShowOutput());
      };

      document.addEventListener('keyup', function(ev) {
        if (ev.keyCode === 113 /*F2*/) {
          window.createDebugCheck();
        }
        if (ev.keyCode === 115 /*F4*/) {
          window.summaryJson();
        }
      }, true);

      window.testCommands = function() {
        require([ 'gclitest/mockCommands' ], function(mockCommands) {
          mockCommands.setup();
        });
      };
      window.testCommands();
    }, 10);

    return {
      /**
       * The exact shape of the object returned by exec is likely to change in
       * the near future. If you do use it, please expect your code to break.
       */
      exec: requisition.exec.bind(requisition),
      update: requisition.update.bind(requisition),
      destroy: window.display.destroy.bind(window.display)
    };
  };

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/suite', ['require', 'exports', 'module' , 'gcli/index', 'test/examiner', 'gclitest/testCanon', 'gclitest/testCli', 'gclitest/testCompletion', 'gclitest/testExec', 'gclitest/testFocus', 'gclitest/testHelp', 'gclitest/testHistory', 'gclitest/testInputter', 'gclitest/testIncomplete', 'gclitest/testIntro', 'gclitest/testJs', 'gclitest/testKeyboard', 'gclitest/testMenu', 'gclitest/testNode', 'gclitest/testPref', 'gclitest/testRequire', 'gclitest/testResource', 'gclitest/testScratchpad', 'gclitest/testSettings', 'gclitest/testSpell', 'gclitest/testSplit', 'gclitest/testTokenize', 'gclitest/testTooltip', 'gclitest/testTypes', 'gclitest/testUtil'], function(require, exports, module) {

  // We need to make sure GCLI is initialized before we begin testing it
  require('gcli/index');

  var examiner = require('test/examiner');

  // It's tempting to want to unify these strings and make addSuite() do the
  // call to require(), however that breaks the build system which looks for
  // the strings passed to require
  examiner.addSuite('gclitest/testCanon', require('gclitest/testCanon'));
  examiner.addSuite('gclitest/testCli', require('gclitest/testCli'));
  examiner.addSuite('gclitest/testCompletion', require('gclitest/testCompletion'));
  examiner.addSuite('gclitest/testExec', require('gclitest/testExec'));
  examiner.addSuite('gclitest/testFocus', require('gclitest/testFocus'));
  examiner.addSuite('gclitest/testHelp', require('gclitest/testHelp'));
  examiner.addSuite('gclitest/testHistory', require('gclitest/testHistory'));
  examiner.addSuite('gclitest/testInputter', require('gclitest/testInputter'));
  examiner.addSuite('gclitest/testIncomplete', require('gclitest/testIncomplete'));
  examiner.addSuite('gclitest/testIntro', require('gclitest/testIntro'));
  examiner.addSuite('gclitest/testJs', require('gclitest/testJs'));
  examiner.addSuite('gclitest/testKeyboard', require('gclitest/testKeyboard'));
  examiner.addSuite('gclitest/testMenu', require('gclitest/testMenu'));
  examiner.addSuite('gclitest/testNode', require('gclitest/testNode'));
  examiner.addSuite('gclitest/testPref', require('gclitest/testPref'));
  examiner.addSuite('gclitest/testRequire', require('gclitest/testRequire'));
  examiner.addSuite('gclitest/testResource', require('gclitest/testResource'));
  examiner.addSuite('gclitest/testScratchpad', require('gclitest/testScratchpad'));
  examiner.addSuite('gclitest/testSettings', require('gclitest/testSettings'));
  examiner.addSuite('gclitest/testSpell', require('gclitest/testSpell'));
  examiner.addSuite('gclitest/testSplit', require('gclitest/testSplit'));
  examiner.addSuite('gclitest/testTokenize', require('gclitest/testTokenize'));
  examiner.addSuite('gclitest/testTooltip', require('gclitest/testTooltip'));
  examiner.addSuite('gclitest/testTypes', require('gclitest/testTypes'));
  examiner.addSuite('gclitest/testUtil', require('gclitest/testUtil'));

  exports.examiner = examiner;
});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testCanon', ['require', 'exports', 'module' , 'gclitest/helpers', 'gcli/canon', 'test/assert'], function(require, exports, module) {

  var helpers = require('gclitest/helpers');
  var canon = require('gcli/canon');
  var test = require('test/assert');

  exports.setup = function(options) {
    helpers.setup(options);
  };

  exports.shutdown = function(options) {
    helpers.shutdown(options);
  };

  exports.testAddRemove = function(options) {
    var startCount = canon.getCommands().length;
    var events = 0;

    var canonChange = function(ev) {
      events++;
    };
    canon.onCanonChange.add(canonChange);

    canon.addCommand({
      name: 'testadd',
      exec: function() {
        return 1;
      }
    });

    test.is(canon.getCommands().length, startCount + 1, 'add command success');
    test.is(events, 1, 'add event');
    helpers.exec(options, {
      typed: 'testadd',
      outputMatch: /^1$/
    });

    canon.addCommand({
      name: 'testadd',
      exec: function() {
        return 2;
      }
    });

    test.is(canon.getCommands().length, startCount + 1, 'readd command success');
    test.is(events, 2, 'readd event');
    helpers.exec(options, {
      typed: 'testadd',
      outputMatch: /^2$/
    });

    canon.removeCommand('testadd');

    test.is(canon.getCommands().length, startCount, 'remove command success');
    test.is(events, 3, 'remove event');

    helpers.setInput('testadd');
    helpers.check({
      typed: 'testadd',
      status: 'ERROR'
    });

    canon.addCommand({
      name: 'testadd',
      exec: function() {
        return 3;
      }
    });

    test.is(canon.getCommands().length, startCount + 1, 'rereadd command success');
    test.is(events, 4, 'rereadd event');
    helpers.exec(options, {
      typed: 'testadd',
      outputMatch: /^3$/
    });

    canon.removeCommand({
      name: 'testadd'
    });

    test.is(canon.getCommands().length, startCount, 'reremove command success');
    test.is(events, 5, 'reremove event');

    helpers.setInput('testadd');
    helpers.check({
      typed: 'testadd',
      status: 'ERROR'
    });

    canon.removeCommand({ name: 'nonexistant' });
    test.is(canon.getCommands().length, startCount, 'nonexistant1 command success');
    test.is(events, 5, 'nonexistant1 event');

    canon.removeCommand('nonexistant');
    test.is(canon.getCommands().length, startCount, 'nonexistant2 command success');
    test.is(events, 5, 'nonexistant2 event');

    canon.onCanonChange.remove(canonChange);
  };

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/helpers', ['require', 'exports', 'module' , 'test/assert', 'gcli/util'], function(require, exports, module) {


var test = require('test/assert');
var util = require('gcli/util');

var helpers = exports;

helpers._display = undefined;

helpers.setup = function(options) {
  helpers._display = options.display;
};

helpers.shutdown = function(options) {
  helpers._display = undefined;
};

/**
 * Various functions to return the actual state of the command line
 */
helpers._actual = {
  input: function() {
    return helpers._display.inputter.element.value;
  },

  hints: function() {
    var templateData = helpers._display.completer._getCompleterTemplateData();
    var actualHints = templateData.directTabText +
                      templateData.emptyParameters.join('') +
                      templateData.arrowTabText;
    return actualHints.replace(/\u00a0/g, ' ')
                      .replace(/\u21E5/, '->')
                      .replace(/ $/, '');
  },

  markup: function() {
    var cursor = helpers._display.inputter.element.selectionStart;
    var statusMarkup = helpers._display.requisition.getInputStatusMarkup(cursor);
    return statusMarkup.map(function(s) {
      return Array(s.string.length + 1).join(s.status.toString()[0]);
    }).join('');
  },

  cursor: function() {
    return helpers._display.inputter.element.selectionStart;
  },

  current: function() {
    return helpers._display.requisition.getAssignmentAt(helpers._actual.cursor()).param.name;
  },

  status: function() {
    return helpers._display.requisition.getStatus().toString();
  },

  outputState: function() {
    var outputData = helpers._display.focusManager._shouldShowOutput();
    return outputData.visible + ':' + outputData.reason;
  },

  tooltipState: function() {
    var tooltipData = helpers._display.focusManager._shouldShowTooltip();
    return tooltipData.visible + ':' + tooltipData.reason;
  }
};

helpers._directToString = [ 'boolean', 'undefined', 'number' ];

helpers._createDebugCheck = function() {
  var requisition = helpers._display.requisition;
  var command = requisition.commandAssignment.value;
  var input = helpers._actual.input();
  var padding = Array(input.length + 1).join(' ');

  var output = '';
  output += 'helpers.setInput(\'' + input + '\');\n';
  output += 'helpers.check({\n';
  output += '  input:  \'' + input + '\',\n';
  output += '  hints:  ' + padding + '\'' + helpers._actual.hints() + '\',\n';
  output += '  markup: \'' + helpers._actual.markup() + '\',\n';
  output += '  cursor: ' + helpers._actual.cursor() + ',\n';
  output += '  current: \'' + helpers._actual.current() + '\',\n';
  output += '  status: \'' + helpers._actual.status() + '\',\n';
  output += '  outputState: \'' + helpers._actual.outputState() + '\',\n';

  if (command) {
    output += '  tooltipState: \'' + helpers._actual.tooltipState() + '\',\n';
    output += '  args: {\n';
    output += '    command: { name: \'' + command.name + '\' },\n';

    requisition.getAssignments().forEach(function(assignment) {
      output += '    ' + assignment.param.name + ': { ';

      if (typeof assignment.value === 'string') {
        output += 'value: \'' + assignment.value + '\', ';
      }
      else if (helpers._directToString.indexOf(typeof assignment.value) !== -1) {
        output += 'value: ' + assignment.value + ', ';
      }
      else if (assignment.value === null) {
        output += 'value: ' + assignment.value + ', ';
      }
      else {
        output += '/*value:' + assignment.value + ',*/ ';
      }

      output += 'arg: \'' + assignment.arg + '\', ';
      output += 'status: \'' + assignment.getStatus().toString() + '\', ';
      output += 'message: \'' + assignment.getMessage() + '\'';
      output += ' },\n';
    });

    output += '  }\n';
  }
  else {
    output += '  tooltipState: \'' + helpers._actual.tooltipState() + '\'\n';
  }
  output += '});';

  return output;
};

/**
 * We're splitting status into setup() which alters the state of the system
 * and check() which ensures that things are in the right place afterwards.
 */
helpers.setInput = function(typed, cursor) {
  helpers._display.inputter.setInput(typed);

  if (cursor) {
    helpers._display.inputter.setCursor({ start: cursor, end: cursor });
  }

  helpers._display.focusManager.onInputChange();
};

/**
 * Simulate focusing the input field
 */
helpers.focusInput = function() {
  helpers._display.inputter.focus();
};

/**
 * Simulate pressing TAB in the input field
 */
helpers.pressTab = function() {
  helpers.pressKey(9 /*KeyEvent.DOM_VK_TAB*/);
};

/**
 * Simulate pressing RETURN in the input field
 */
helpers.pressReturn = function() {
  helpers.pressKey(13 /*KeyEvent.DOM_VK_RETURN*/);
};

/**
 * Simulate pressing a key by keyCode in the input field
 */
helpers.pressKey = function(keyCode) {
  var fakeEvent = {
    keyCode: keyCode,
    preventDefault: function() { },
    timeStamp: new Date().getTime()
  };
  helpers._display.inputter.onKeyDown(fakeEvent);
  helpers._display.inputter.onKeyUp(fakeEvent);
};

/**
 * check() is the new status. Similar API except that it doesn't attempt to
 * alter the display/requisition at all, and it makes extra checks.
 * Available checks:
 *   input: The text displayed in the input field
 *   cursor: The position of the start of the cursor
 *   status: One of "VALID", "ERROR", "INCOMPLETE"
 *   hints: The hint text, i.e. a concatenation of the directTabText, the
 *     emptyParameters and the arrowTabText. The text as inserted into the UI
 *     will include NBSP and Unicode RARR characters, these should be
 *     represented using normal space and '->' for the arrow
 *   markup: What state should the error markup be in. e.g. "VVVIIIEEE"
 *   args: Maps of checks to make against the arguments:
 *     value: i.e. assignment.value (which ignores defaultValue)
 *     type: Argument/BlankArgument/MergedArgument/etc i.e. what's assigned
 *           Care should be taken with this since it's something of an
 *           implementation detail
 *     arg: The toString value of the argument
 *     status: i.e. assignment.getStatus
 *     message: i.e. assignment.getMessage
 *     name: For commands - checks assignment.value.name
 */
helpers.check = function(checks) {
  if ('input' in checks) {
    test.is(helpers._actual.input(), checks.input, 'input');
  }

  if ('cursor' in checks) {
    test.is(helpers._actual.cursor(), checks.cursor, 'cursor');
  }

  if ('current' in checks) {
    test.is(helpers._actual.current(), checks.current, 'current');
  }

  if ('status' in checks) {
    test.is(helpers._actual.status(), checks.status, 'status');
  }

  if ('markup' in checks) {
    test.is(helpers._actual.markup(), checks.markup, 'markup');
  }

  if ('hints' in checks) {
    test.is(helpers._actual.hints(), checks.hints, 'hints');
  }

  if ('tooltipState' in checks) {
    test.is(helpers._actual.tooltipState(), checks.tooltipState, 'tooltipState');
  }

  if ('outputState' in checks) {
    test.is(helpers._actual.outputState(), checks.outputState, 'outputState');
  }

  if (checks.args != null) {
    var requisition = helpers._display.requisition;
    Object.keys(checks.args).forEach(function(paramName) {
      var check = checks.args[paramName];

      var assignment;
      if (paramName === 'command') {
        assignment = requisition.commandAssignment;
      }
      else {
        assignment = requisition.getAssignment(paramName);
      }

      if (assignment == null) {
        test.ok(false, 'Unknown arg: ' + paramName);
        return;
      }

      if ('value' in check) {
        test.is(assignment.value,
                check.value,
                'arg.' + paramName + '.value');
      }

      if ('name' in check) {
        test.is(assignment.value.name,
                check.name,
                'arg.' + paramName + '.name');
      }

      if ('type' in check) {
        test.is(assignment.arg.type,
                check.type,
                'arg.' + paramName + '.type');
      }

      if ('arg' in check) {
        test.is(assignment.arg.toString(),
                check.arg,
                'arg.' + paramName + '.arg');
      }

      if ('status' in check) {
        test.is(assignment.getStatus().toString(),
                check.status,
                'arg.' + paramName + '.status');
      }

      if ('message' in check) {
        test.is(assignment.getMessage(),
                check.message,
                'arg.' + paramName + '.message');
      }
    });
  }
};

/**
 * Execute a command:
 *
 * helpers.exec({
 *   // Test inputs
 *   typed: "echo hi",        // Optional, uses existing if undefined
 *
 *   // Thing to check
 *   args: { message: "hi" }, // Check that the args were understood properly
 *   outputMatch: /^hi$/,     // Regex to test against textContent of output
 *   blankOutput: true,       // Special checks when there is no output
 * });
 */
helpers.exec = function(options, tests) {
  var requisition = options.display.requisition;
  var inputter = options.display.inputter;

  tests = tests || {};

  if (tests.typed) {
    inputter.setInput(tests.typed);
  }

  var typed = inputter.getInputState().typed;
  var output = requisition.exec({ hidden: true });

  test.is(typed, output.typed, 'output.command for: ' + typed);

  if (tests.completed !== false) {
    test.ok(output.completed, 'output.completed false for: ' + typed);
  }
  else {
    // It is actually an error if we say something is async and it turns
    // out not to be? For now we're saying 'no'
    // test.ok(!output.completed, 'output.completed true for: ' + typed);
  }

  if (tests.args != null) {
    test.is(Object.keys(tests.args).length, Object.keys(output.args).length,
            'arg count for ' + typed);

    Object.keys(output.args).forEach(function(arg) {
      var expectedArg = tests.args[arg];
      var actualArg = output.args[arg];

      if (Array.isArray(expectedArg)) {
        if (!Array.isArray(actualArg)) {
          test.ok(false, 'actual is not an array. ' + typed + '/' + arg);
          return;
        }

        test.is(expectedArg.length, actualArg.length,
                'array length: ' + typed + '/' + arg);
        for (var i = 0; i < expectedArg.length; i++) {
          test.is(expectedArg[i], actualArg[i],
                  'member: "' + typed + '/' + arg + '/' + i);
        }
      }
      else {
        test.is(expectedArg, actualArg, 'typed: "' + typed + '" arg: ' + arg);
      }
    });
  }

  if (!options.window.document.createElement) {
    test.log('skipping output tests (missing doc.createElement) for ' + typed);
    return;
  }

  var div = options.window.document.createElement('div');
  output.toDom(div);
  var displayed = div.textContent.trim();

  if (tests.outputMatch) {
    var doTest = function(match, against) {
      if (!match.test(against)) {
        test.ok(false, "html output for " + typed + " against " + match.source);
        console.log("Actual textContent");
        console.log(against);
      }
    }
    if (Array.isArray(tests.outputMatch)) {
      tests.outputMatch.forEach(function(match) {
        doTest(match, displayed);
      });
    }
    else {
      doTest(tests.outputMatch, displayed);
    }
  }

  if (tests.blankOutput != null) {
    if (!/^$/.test(displayed)) {
      test.ok(false, "html for " + typed + " (textContent sent to info)");
      console.log("Actual textContent");
      console.log(displayed);
    }
  }
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testCli', ['require', 'exports', 'module' , 'gcli/cli', 'gcli/types', 'gclitest/mockCommands', 'test/assert'], function(require, exports, module) {


var Requisition = require('gcli/cli').Requisition;
var Status = require('gcli/types').Status;
var mockCommands = require('gclitest/mockCommands');

var test = require('test/assert');

exports.setup = function() {
  mockCommands.setup();
};

exports.shutdown = function() {
  mockCommands.shutdown();
};


var assign1;
var assign2;
var assignC;
var requ;
var debug = false;
var status;
var statuses;

function update(input) {
  if (!requ) {
    requ = new Requisition();
  }
  requ.update(input.typed);

  if (debug) {
    console.log('####### TEST: typed="' + input.typed +
        '" cur=' + input.cursor.start +
        ' cli=', requ);
  }

  status = requ.getStatus();
  assignC = requ.getAssignmentAt(input.cursor.start);
  statuses = requ.getInputStatusMarkup(input.cursor.start).map(function(s) {
    return Array(s.string.length + 1).join(s.status.toString()[0]);
  }).join('');

  if (requ.commandAssignment.value) {
    assign1 = requ.getAssignment(0);
    assign2 = requ.getAssignment(1);
  }
  else {
    assign1 = undefined;
    assign2 = undefined;
  }
}

function verifyPredictionsContains(name, predictions) {
  return predictions.every(function(prediction) {
    return name === prediction.name;
  }, this);
}


exports.testBlank = function() {
  update({ typed: '', cursor: { start: 0, end: 0 } });
  test.is(        '', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(undefined, requ.commandAssignment.value);

  update({ typed: ' ', cursor: { start: 1, end: 1 } });
  test.is(        'V', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(undefined, requ.commandAssignment.value);

  update({ typed: ' ', cursor: { start: 0, end: 0 } });
  test.is(        'V', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(undefined, requ.commandAssignment.value);
};

exports.testIncompleteMultiMatch = function() {
  update({ typed: 't', cursor: { start: 1, end: 1 } });
  test.is(        'I', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.ok(assignC.getPredictions().length > 0);
  verifyPredictionsContains('tsv', assignC.getPredictions());
  verifyPredictionsContains('tsr', assignC.getPredictions());
  test.is(undefined, requ.commandAssignment.value);
};

exports.testIncompleteSingleMatch = function() {
  update({ typed: 'tselar', cursor: { start: 6, end: 6 } });
  test.is(        'IIIIII', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(1, assignC.getPredictions().length);
  test.is('tselarr', assignC.getPredictions()[0].name);
  test.is(undefined, requ.commandAssignment.value);
};

exports.testTsv = function() {
  update({ typed: 'tsv', cursor: { start: 3, end: 3 } });
  test.is(        'VVV', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.value.name);

  update({ typed: 'tsv ', cursor: { start: 4, end: 4 } });
  test.is(        'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is(0, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.value.name);

  update({ typed: 'tsv ', cursor: { start: 2, end: 2 } });
  test.is(        'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.value.name);

  update({ typed: 'tsv o', cursor: { start: 5, end: 5 } });
  test.is(        'VVVVI', statuses);
  test.is(Status.ERROR, status);
  test.is(0, assignC.paramIndex);
  test.ok(assignC.getPredictions().length >= 2);
  test.is(mockCommands.option1, assignC.getPredictions()[0].value);
  test.is(mockCommands.option2, assignC.getPredictions()[1].value);
  test.is('tsv', requ.commandAssignment.value.name);
  test.is('o', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tsv option', cursor: { start: 10, end: 10 } });
  test.is(        'VVVVIIIIII', statuses);
  test.is(Status.ERROR, status);
  test.is(0, assignC.paramIndex);
  test.ok(assignC.getPredictions().length >= 2);
  test.is(mockCommands.option1, assignC.getPredictions()[0].value);
  test.is(mockCommands.option2, assignC.getPredictions()[1].value);
  test.is('tsv', requ.commandAssignment.value.name);
  test.is('option', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tsv option', cursor: { start: 1, end: 1 } });
  test.is(        'VVVVEEEEEE', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.value.name);
  test.is('option', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tsv option ', cursor: { start: 11, end: 11 } });
  test.is(        'VVVVEEEEEEV', statuses);
  test.is(Status.ERROR, status);
  test.is(1, assignC.paramIndex);
  test.is(0, assignC.getPredictions().length);
  test.is('tsv', requ.commandAssignment.value.name);
  test.is('option', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tsv option1', cursor: { start: 11, end: 11 } });
  test.is(        'VVVVVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsv', requ.commandAssignment.value.name);
  test.is('option1', assign1.arg.text);
  test.is(mockCommands.option1, assign1.value);
  test.is(0, assignC.paramIndex);

  update({ typed: 'tsv option1 ', cursor: { start: 12, end: 12 } });
  test.is(        'VVVVVVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsv', requ.commandAssignment.value.name);
  test.is('option1', assign1.arg.text);
  test.is(mockCommands.option1, assign1.value);
  test.is(1, assignC.paramIndex);

  update({ typed: 'tsv option1 6', cursor: { start: 13, end: 13 } });
  test.is(        'VVVVVVVVVVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsv', requ.commandAssignment.value.name);
  test.is('option1', assign1.arg.text);
  test.is(mockCommands.option1, assign1.value);
  test.is('6', assign2.arg.text);
  test.is('6', assign2.value);
  test.is('string', typeof assign2.value);
  test.is(1, assignC.paramIndex);

  update({ typed: 'tsv option2 6', cursor: { start: 13, end: 13 } });
  test.is(        'VVVVVVVVVVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsv', requ.commandAssignment.value.name);
  test.is('option2', assign1.arg.text);
  test.is(mockCommands.option2, assign1.value);
  test.is('6', assign2.arg.text);
  test.is(6, assign2.value);
  test.is('number', typeof assign2.value);
  test.is(1, assignC.paramIndex);
};

exports.testInvalid = function() {
  update({ typed: 'zxjq', cursor: { start: 4, end: 4 } });
  test.is(        'EEEE', statuses);
  test.is('zxjq', requ.commandAssignment.arg.text);
  test.is(0, requ._unassigned.length);
  test.is(-1, assignC.paramIndex);

  update({ typed: 'zxjq ', cursor: { start: 5, end: 5 } });
  test.is(        'EEEEV', statuses);
  test.is('zxjq', requ.commandAssignment.arg.text);
  test.is(0, requ._unassigned.length);
  test.is(-1, assignC.paramIndex);

  update({ typed: 'zxjq one', cursor: { start: 8, end: 8 } });
  test.is(        'EEEEVEEE', statuses);
  test.is('zxjq', requ.commandAssignment.arg.text);
  test.is(1, requ._unassigned.length);
  test.is('one', requ._unassigned[0].arg.text);
};

exports.testSingleString = function() {
  update({ typed: 'tsr', cursor: { start: 3, end: 3 } });
  test.is(        'VVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsr', requ.commandAssignment.value.name);
  test.ok(assign1.arg.type === 'BlankArgument');
  test.is(undefined, assign1.value);
  test.is(undefined, assign2);

  update({ typed: 'tsr ', cursor: { start: 4, end: 4 } });
  test.is(        'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsr', requ.commandAssignment.value.name);
  test.ok(assign1.arg.type === 'BlankArgument');
  test.is(undefined, assign1.value);
  test.is(undefined, assign2);

  update({ typed: 'tsr h', cursor: { start: 5, end: 5 } });
  test.is(        'VVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsr', requ.commandAssignment.value.name);
  test.is('h', assign1.arg.text);
  test.is('h', assign1.value);

  update({ typed: 'tsr "h h"', cursor: { start: 9, end: 9 } });
  test.is(        'VVVVVVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsr', requ.commandAssignment.value.name);
  test.is('h h', assign1.arg.text);
  test.is('h h', assign1.value);

  update({ typed: 'tsr h h h', cursor: { start: 9, end: 9 } });
  test.is(        'VVVVVVVVV', statuses);
  test.is('tsr', requ.commandAssignment.value.name);
  test.is('h h h', assign1.arg.text);
  test.is('h h h', assign1.value);
};

exports.testSingleNumber = function() {
  update({ typed: 'tsu', cursor: { start: 3, end: 3 } });
  test.is(        'VVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsu', requ.commandAssignment.value.name);
  test.is('', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tsu ', cursor: { start: 4, end: 4 } });
  test.is(        'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsu', requ.commandAssignment.value.name);
  test.is('', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tsu 1', cursor: { start: 5, end: 5 } });
  test.is(        'VVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsu', requ.commandAssignment.value.name);
  test.is('1', assign1.arg.text);
  test.is(1, assign1.value);
  test.is('number', typeof assign1.value);

  update({ typed: 'tsu x', cursor: { start: 5, end: 5 } });
  test.is(        'VVVVE', statuses);
  test.is(Status.ERROR, status);
  test.is('tsu', requ.commandAssignment.value.name);
  test.is('x', assign1.arg.text);
  test.is(undefined, assign1.value);
};

exports.testElement = function(options) {
  update({ typed: 'tse', cursor: { start: 3, end: 3 } });
  test.is(        'VVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tse', requ.commandAssignment.value.name);
  test.ok(assign1.arg.type === 'BlankArgument');
  test.is(undefined, assign1.value);

  if (!options.isNode) {
    update({ typed: 'tse :root', cursor: { start: 9, end: 9 } });
    test.is(        'VVVVVVVVV', statuses);
    test.is(Status.VALID, status);
    test.is('tse', requ.commandAssignment.value.name);
    test.is(':root', assign1.arg.text);
    if (!options.window.isFake) {
      test.is(options.window.document.documentElement, assign1.value);
    }

    if (!options.window.isFake) {
      var inputElement = options.window.document.getElementById('gcli-input');
      if (inputElement) {
        update({ typed: 'tse #gcli-input', cursor: { start: 15, end: 15 } });
        test.is(        'VVVVVVVVVVVVVVV', statuses);
        test.is(Status.VALID, status);
        test.is('tse', requ.commandAssignment.value.name);
        test.is('#gcli-input', assign1.arg.text);
        test.is(inputElement, assign1.value);
      }
      else {
        test.log('Skipping test that assumes gcli on the web');
      }
    }

    update({ typed: 'tse #gcli-nomatch', cursor: { start: 17, end: 17 } });
    // This is somewhat debatable because this input can't be corrected simply
    // by typing so it's and error rather than incomplete, however without
    // digging into the CSS engine we can't tell that so we default to incomplete
    test.is(        'VVVVIIIIIIIIIIIII', statuses);
    test.is(Status.ERROR, status);
    test.is('tse', requ.commandAssignment.value.name);
    test.is('#gcli-nomatch', assign1.arg.text);
    test.is(undefined, assign1.value);
  }
  else {
    test.log('Skipping :root test due to jsdom (from isNode)');
  }

  update({ typed: 'tse #', cursor: { start: 5, end: 5 } });
  test.is(        'VVVVE', statuses);
  test.is(Status.ERROR, status);
  test.is('tse', requ.commandAssignment.value.name);
  test.is('#', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tse .', cursor: { start: 5, end: 5 } });
  test.is(        'VVVVE', statuses);
  test.is(Status.ERROR, status);
  test.is('tse', requ.commandAssignment.value.name);
  test.is('.', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tse *', cursor: { start: 5, end: 5 } });
  test.is(        'VVVVE', statuses);
  test.is(Status.ERROR, status);
  test.is('tse', requ.commandAssignment.value.name);
  test.is('*', assign1.arg.text);
  test.is(undefined, assign1.value);
};

exports.testNestedCommand = function() {
  update({ typed: 'tsn', cursor: { start: 3, end: 3 } });
  test.is(        'III', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn', requ.commandAssignment.arg.text);
  test.is(undefined, assign1);

  update({ typed: 'tsn ', cursor: { start: 4, end: 4 } });
  test.is(        'IIIV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn', requ.commandAssignment.arg.text);
  test.is(undefined, assign1);

  update({ typed: 'tsn x', cursor: { start: 5, end: 5 } });
  // Commented out while we try out fuzzy matching
  // test.is(        'EEEVE', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn x', requ.commandAssignment.arg.text);
  test.is(undefined, assign1);

  update({ typed: 'tsn dif', cursor: { start: 7, end: 7 } });
  test.is(        'VVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn dif', requ.commandAssignment.value.name);
  test.is('', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tsn dif ', cursor: { start: 8, end: 8 } });
  test.is(        'VVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn dif', requ.commandAssignment.value.name);
  test.is('', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tsn dif x', cursor: { start: 9, end: 9 } });
  test.is(        'VVVVVVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsn dif', requ.commandAssignment.value.name);
  test.is('x', assign1.arg.text);
  test.is('x', assign1.value);

  update({ typed: 'tsn ext', cursor: { start: 7, end: 7 } });
  test.is(        'VVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn ext', requ.commandAssignment.value.name);
  test.is('', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tsn exte', cursor: { start: 8, end: 8 } });
  test.is(        'VVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn exte', requ.commandAssignment.value.name);
  test.is('', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tsn exten', cursor: { start: 9, end: 9 } });
  test.is(        'VVVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn exten', requ.commandAssignment.value.name);
  test.is('', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'tsn extend', cursor: { start: 10, end: 10 } });
  test.is(        'VVVVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn extend', requ.commandAssignment.value.name);
  test.is('', assign1.arg.text);
  test.is(undefined, assign1.value);

  update({ typed: 'ts ', cursor: { start: 3, end: 3 } });
  test.is(        'EEV', statuses);
  test.is(Status.ERROR, status);
  test.is('ts', requ.commandAssignment.arg.text);
  test.is(undefined, assign1);
};

// From Bug 664203
exports.testDeeplyNested = function() {
  update({ typed: 'tsn deep down nested cmd', cursor: { start: 24, end: 24 } });
  test.is(        'VVVVVVVVVVVVVVVVVVVVVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsn deep down nested cmd', requ.commandAssignment.value.name);
  test.is(undefined, assign1);

  update({ typed: 'tsn deep down nested', cursor: { start: 20, end: 20 } });
  test.is(        'IIIVIIIIVIIIIVIIIIII', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn deep down nested', requ.commandAssignment.value.name);
  test.is(undefined, assign1);
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/mockCommands', ['require', 'exports', 'module' , 'gcli/canon', 'gcli/util', 'gcli/types/selection', 'gcli/types/basic', 'gcli/types'], function(require, exports, module) {


var canon = require('gcli/canon');
var util = require('gcli/util');

var SelectionType = require('gcli/types/selection').SelectionType;
var DeferredType = require('gcli/types/basic').DeferredType;
var types = require('gcli/types');

/**
 * Registration and de-registration.
 */
exports.setup = function() {
  // setup/shutdown need to register/unregister types, however that means we
  // need to re-initialize exports.option1 and exports.option2 with the
  // actual types
  exports.option1.type = types.getType('string');
  exports.option2.type = types.getType('number');

  types.registerType(exports.optionType);
  types.registerType(exports.optionValue);

  canon.addCommand(exports.tsv);
  canon.addCommand(exports.tsr);
  canon.addCommand(exports.tso);
  canon.addCommand(exports.tse);
  canon.addCommand(exports.tsj);
  canon.addCommand(exports.tsb);
  canon.addCommand(exports.tss);
  canon.addCommand(exports.tsu);
  canon.addCommand(exports.tsn);
  canon.addCommand(exports.tsnDif);
  canon.addCommand(exports.tsnExt);
  canon.addCommand(exports.tsnExte);
  canon.addCommand(exports.tsnExten);
  canon.addCommand(exports.tsnExtend);
  canon.addCommand(exports.tsnDeep);
  canon.addCommand(exports.tsnDeepDown);
  canon.addCommand(exports.tsnDeepDownNested);
  canon.addCommand(exports.tsnDeepDownNestedCmd);
  canon.addCommand(exports.tselarr);
  canon.addCommand(exports.tsm);
  canon.addCommand(exports.tsg);
  canon.addCommand(exports.tshidden);
  canon.addCommand(exports.tscook);
  canon.addCommand(exports.tslong);
};

exports.shutdown = function() {
  canon.removeCommand(exports.tsv);
  canon.removeCommand(exports.tsr);
  canon.removeCommand(exports.tso);
  canon.removeCommand(exports.tse);
  canon.removeCommand(exports.tsj);
  canon.removeCommand(exports.tsb);
  canon.removeCommand(exports.tss);
  canon.removeCommand(exports.tsu);
  canon.removeCommand(exports.tsn);
  canon.removeCommand(exports.tsnDif);
  canon.removeCommand(exports.tsnExt);
  canon.removeCommand(exports.tsnExte);
  canon.removeCommand(exports.tsnExten);
  canon.removeCommand(exports.tsnExtend);
  canon.removeCommand(exports.tsnDeep);
  canon.removeCommand(exports.tsnDeepDown);
  canon.removeCommand(exports.tsnDeepDownNested);
  canon.removeCommand(exports.tsnDeepDownNestedCmd);
  canon.removeCommand(exports.tselarr);
  canon.removeCommand(exports.tsm);
  canon.removeCommand(exports.tsg);
  canon.removeCommand(exports.tshidden);
  canon.removeCommand(exports.tscook);
  canon.removeCommand(exports.tslong);

  types.deregisterType(exports.optionType);
  types.deregisterType(exports.optionValue);
};


exports.option1 = { type: types.getType('string') };
exports.option2 = { type: types.getType('number') };

var lastOption = undefined;

exports.optionType = new SelectionType({
  name: 'optionType',
  lookup: [
    { name: 'option1', value: exports.option1 },
    { name: 'option2', value: exports.option2 }
  ],
  noMatch: function() {
    lastOption = undefined;
  },
  stringify: function(option) {
    lastOption = option;
    return SelectionType.prototype.stringify.call(this, option);
  },
  parse: function(arg) {
    var conversion = SelectionType.prototype.parse.call(this, arg);
    lastOption = conversion.value;
    return conversion;
  }
});

exports.optionValue = new DeferredType({
  name: 'optionValue',
  defer: function() {
    if (lastOption && lastOption.type) {
      return lastOption.type;
    }
    else {
      return types.getType('blank');
    }
  }
});

exports.onCommandExec = util.createEvent('commands.onCommandExec');

function createExec(name) {
  return function(args, context) {
    var data = {
      command: exports[name],
      args: args,
      context: context
    };
    exports.onCommandExec(data);
    return data;
  };
}

exports.tsv = {
  name: 'tsv',
  params: [
    { name: 'optionType', type: 'optionType' },
    { name: 'optionValue', type: 'optionValue' }
  ],
  exec: createExec('tsv')
};

exports.tsr = {
  name: 'tsr',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsr')
};

exports.tso = {
  name: 'tso',
  params: [ { name: 'text', type: 'string', defaultValue: null } ],
  exec: createExec('tso')
};

exports.tse = {
  name: 'tse',
  params: [
    { name: 'node', type: 'node' },
    {
      group: 'options',
      params: [
        { name: 'nodes', type: { name: 'nodelist' } },
        { name: 'nodes2', type: { name: 'nodelist', allowEmpty: true } }
      ]
    }
  ],
  exec: createExec('tse')
};

exports.tsj = {
  name: 'tsj',
  params: [ { name: 'javascript', type: 'javascript' } ],
  exec: createExec('tsj')
};

exports.tsb = {
  name: 'tsb',
  params: [ { name: 'toggle', type: 'boolean' } ],
  exec: createExec('tsb')
};

exports.tss = {
  name: 'tss',
  exec: createExec('tss')
};

exports.tsu = {
  name: 'tsu',
  params: [ { name: 'num', type: { name: 'number', max: 10, min: -5, step: 3 } } ],
  exec: createExec('tsu')
};

exports.tsn = {
  name: 'tsn'
};

exports.tsnDif = {
  name: 'tsn dif',
  description: 'tsn dif',
  params: [ { name: 'text', type: 'string', description: 'tsn dif text' } ],
  exec: createExec('tsnDif')
};

exports.tsnExt = {
  name: 'tsn ext',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsnExt')
};

exports.tsnExte = {
  name: 'tsn exte',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('')
};

exports.tsnExten = {
  name: 'tsn exten',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsnExte')
};

exports.tsnExtend = {
  name: 'tsn extend',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsnExtend')
};

exports.tsnDeep = {
  name: 'tsn deep',
};

exports.tsnDeepDown = {
  name: 'tsn deep down',
};

exports.tsnDeepDownNested = {
  name: 'tsn deep down nested',
};

exports.tsnDeepDownNestedCmd = {
  name: 'tsn deep down nested cmd',
  exec: createExec('tsnDeepDownNestedCmd')
};

exports.tshidden = {
  name: 'tshidden',
  hidden: true,
  params: [
    {
      group: 'Options',
      params: [
        {
          name: 'visible',
          type: 'string',
          defaultValue: null,
          description: 'visible'
        },
        {
          name: 'invisiblestring',
          type: 'string',
          description: 'invisiblestring',
          defaultValue: null,
          hidden: true
        },
        {
          name: 'invisibleboolean',
          type: 'boolean',
          description: 'invisibleboolean',
          hidden: true
        }
      ]
    }
  ],
  exec: createExec('tshidden')
};

exports.tselarr = {
  name: 'tselarr',
  params: [
    { name: 'num', type: { name: 'selection', data: [ '1', '2', '3' ] } },
    { name: 'arr', type: { name: 'array', subtype: 'string' } },
  ],
  exec: createExec('tselarr')
};

exports.tsm = {
  name: 'tsm',
  description: 'a 3-param test selection|string|number',
  params: [
    { name: 'abc', type: { name: 'selection', data: [ 'a', 'b', 'c' ] } },
    { name: 'txt', type: 'string' },
    { name: 'num', type: { name: 'number', max: 42, min: 0 } },
  ],
  exec: createExec('tsm')
};

exports.tsg = {
  name: 'tsg',
  description: 'a param group test',
  params: [
    {
      name: 'solo',
      type: { name: 'selection', data: [ 'aaa', 'bbb', 'ccc' ] },
      description: 'solo param'
    },
    {
      group: 'First',
      params: [
        {
          name: 'txt1',
          type: 'string',
          defaultValue: null,
          description: 'txt1 param'
        },
        {
          name: 'bool',
          type: 'boolean',
          description: 'bool param'
        }
      ]
    },
    {
      group: 'Second',
      params: [
        {
          name: 'txt2',
          type: 'string',
          defaultValue: 'd',
          description: 'txt2 param'
        },
        {
          name: 'num',
          type: { name: 'number', min: 40 },
          defaultValue: 42,
          description: 'num param'
        }
      ]
    }
  ],
  exec: createExec('tsg')
};

exports.tscook = {
  name: 'tscook',
  description: 'param group test to catch problems with cookie command',
  params: [
    {
      name: 'key',
      type: 'string',
      description: 'tscookKeyDesc'
    },
    {
      name: 'value',
      type: 'string',
      description: 'tscookValueDesc'
    },
    {
      group: 'tscookOptionsDesc',
      params: [
        {
          name: 'path',
          type: 'string',
          defaultValue: '/',
          description: 'tscookPathDesc'
        },
        {
          name: 'domain',
          type: 'string',
          defaultValue: null,
          description: 'tscookDomainDesc'
        },
        {
          name: 'secure',
          type: 'boolean',
          description: 'tscookSecureDesc'
        }
      ]
    }
  ],
  exec: createExec('tscook')
};

exports.tslong = {
  name: 'tslong',
  description: 'long param tests to catch problems with the jsb command',
  returnValue:'string',
  params: [
    {
      name: 'msg',
      type: 'string',
      description: 'msg Desc'
    },
    {
      group: "Options Desc",
      params: [
        {
          name: 'num',
          type: 'number',
          description: 'num Desc',
          defaultValue: 2
        },
        {
          name: 'sel',
          type: {
            name: 'selection',
            lookup: [
              { name: "space", value: " " },
              { name: "tab", value: "\t" }
            ]
          },
          description: 'sel Desc',
          defaultValue: ' ',
        },
        {
          name: 'bool',
          type: 'boolean',
          description: 'bool Desc'
        },
        {
          name: 'num2',
          type: 'number',
          description: 'num2 Desc',
          defaultValue: -1
        },
        {
          name: 'bool2',
          type: 'boolean',
          description: 'bool2 Desc'
        },
        {
          name: 'sel2',
          type: {
            name: 'selection',
            data: ['collapse', 'expand', 'end-expand', 'expand-strict']
          },
          description: 'sel2 Desc',
          defaultValue: "collapse"
        }
      ]
    }
  ],
  exec: createExec('tslong')
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testCompletion', ['require', 'exports', 'module' , 'test/assert', 'gclitest/helpers', 'gclitest/mockCommands'], function(require, exports, module) {


var test = require('test/assert');
var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');


exports.setup = function(options) {
  mockCommands.setup();
  helpers.setup(options);
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
  helpers.shutdown(options);
};

exports.testActivate = function(options) {
  if (!options.display) {
    test.log('No display. Skipping activate tests');
    return;
  }

  helpers.setInput('');
  helpers.check({
    hints: ''
  });

  helpers.setInput(' ');
  helpers.check({
    hints: ''
  });

  helpers.setInput('tsr');
  helpers.check({
    hints: ' <text>'
  });

  helpers.setInput('tsr ');
  helpers.check({
    hints: '<text>'
  });

  helpers.setInput('tsr b');
  helpers.check({
    hints: ''
  });

  helpers.setInput('tsb');
  helpers.check({
    hints: ' [toggle]'
  });

  helpers.setInput('tsm');
  helpers.check({
    hints: ' <abc> <txt> <num>'
  });

  helpers.setInput('tsm ');
  helpers.check({
    hints: 'a <txt> <num>'
  });

  helpers.setInput('tsm a');
  helpers.check({
    hints: ' <txt> <num>'
  });

  helpers.setInput('tsm a ');
  helpers.check({
    hints: '<txt> <num>'
  });

  helpers.setInput('tsm a  ');
  helpers.check({
    hints: '<txt> <num>'
  });

  helpers.setInput('tsm a  d');
  helpers.check({
    hints: ' <num>'
  });

  helpers.setInput('tsm a "d d"');
  helpers.check({
    hints: ' <num>'
  });

  helpers.setInput('tsm a "d ');
  helpers.check({
    hints: ' <num>'
  });

  helpers.setInput('tsm a "d d" ');
  helpers.check({
    hints: '<num>'
  });

  helpers.setInput('tsm a "d d ');
  helpers.check({
    hints: ' <num>'
  });

  helpers.setInput('tsm d r');
  helpers.check({
    hints: ' <num>'
  });

  helpers.setInput('tsm a d ');
  helpers.check({
    hints: '<num>'
  });

  helpers.setInput('tsm a d 4');
  helpers.check({
    hints: ''
  });

  helpers.setInput('tsg');
  helpers.check({
    hints: ' <solo> [options]'
  });

  helpers.setInput('tsg ');
  helpers.check({
    hints: 'aaa [options]'
  });

  helpers.setInput('tsg a');
  helpers.check({
    hints: 'aa [options]'
  });

  helpers.setInput('tsg b');
  helpers.check({
    hints: 'bb [options]'
  });

  helpers.setInput('tsg d');
  helpers.check({
    hints: ' [options]'
  });

  helpers.setInput('tsg aa');
  helpers.check({
    hints: 'a [options]'
  });

  helpers.setInput('tsg aaa');
  helpers.check({
    hints: ' [options]'
  });

  helpers.setInput('tsg aaa ');
  helpers.check({
    hints: '[options]'
  });

  helpers.setInput('tsg aaa d');
  helpers.check({
    hints: ' [options]'
  });

  helpers.setInput('tsg aaa dddddd');
  helpers.check({
    hints: ' [options]'
  });

  helpers.setInput('tsg aaa dddddd ');
  helpers.check({
    hints: '[options]'
  });

  helpers.setInput('tsg aaa "d');
  helpers.check({
    hints: ' [options]'
  });

  helpers.setInput('tsg aaa "d d');
  helpers.check({
    hints: ' [options]'
  });

  helpers.setInput('tsg aaa "d d"');
  helpers.check({
    hints: ' [options]'
  });

  helpers.setInput('tsn ex ');
  helpers.check({
    hints: ''
  });

  helpers.setInput('selarr');
  helpers.check({
    hints: ' -> tselarr'
  });

  helpers.setInput('tselar 1');
  helpers.check({
    hints: ''
  });

  helpers.setInput('tselar 1', 7);
  helpers.check({
    hints: ''
  });

  helpers.setInput('tselar 1', 6);
  helpers.check({
    hints: ' -> tselarr'
  });

  helpers.setInput('tselar 1', 5);
  helpers.check({
    hints: ' -> tselarr'
  });
};

exports.testLong = function(options) {
  helpers.setInput('tslong --sel');
  helpers.check({
    input:  'tslong --sel',
    hints:              ' <selection> <msg> [options]',
    markup: 'VVVVVVVIIIII'
  });

  helpers.pressTab();
  helpers.check({
    input:  'tslong --sel ',
    hints:               'space <msg> [options]',
    markup: 'VVVVVVVIIIIIV'
  });

  helpers.setInput('tslong --sel ');
  helpers.check({
    input:  'tslong --sel ',
    hints:               'space <msg> [options]',
    markup: 'VVVVVVVIIIIIV'
  });

  helpers.setInput('tslong --sel s');
  helpers.check({
    input:  'tslong --sel s',
    hints:                'pace <msg> [options]',
    markup: 'VVVVVVVIIIIIVI'
  });

  helpers.setInput('tslong --num ');
  helpers.check({
    input:  'tslong --num ',
    hints:               '<number> <msg> [options]',
    markup: 'VVVVVVVIIIIIV'
  });

  helpers.setInput('tslong --num 42');
  helpers.check({
    input:  'tslong --num 42',
    hints:                 ' <msg> [options]',
    markup: 'VVVVVVVVVVVVVVV'
  });

  helpers.setInput('tslong --num 42 ');
  helpers.check({
    input:  'tslong --num 42 ',
    hints:                  '<msg> [options]',
    markup: 'VVVVVVVVVVVVVVVV'
  });

  helpers.setInput('tslong --num 42 --se');
  helpers.check({
    input:  'tslong --num 42 --se',
    hints:                      'l <msg> [options]',
    markup: 'VVVVVVVVVVVVVVVVIIII'
  });

  helpers.pressTab();
  helpers.check({
    input:  'tslong --num 42 --sel ',
    hints:                        'space <msg> [options]',
    markup: 'VVVVVVVVVVVVVVVVIIIIIV'
  });

  helpers.pressTab();
  helpers.check({
    input:  'tslong --num 42 --sel space ',
    hints:                              '<msg> [options]',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVV'
  });

  helpers.setInput('tslong --num 42 --sel ');
  helpers.check({
    input:  'tslong --num 42 --sel ',
    hints:                        'space <msg> [options]',
    markup: 'VVVVVVVVVVVVVVVVIIIIIV'
  });

  helpers.setInput('tslong --num 42 --sel space ');
  helpers.check({
    input:  'tslong --num 42 --sel space ',
    hints:                              '<msg> [options]',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVV'
  });
};

exports.testNoTab = function(options) {
  helpers.setInput('tss');
  helpers.pressTab();
  helpers.check({
    input:  'tss ',
    markup: 'VVVV',
    hints: ''
  });

  helpers.pressTab();
  helpers.check({
    input:  'tss ',
    markup: 'VVVV',
    hints: ''
  });

  helpers.setInput('xxxx');
  helpers.check({
    input:  'xxxx',
    markup: 'EEEE',
    hints: ''
  });

  helpers.pressTab();
  helpers.check({
    input:  'xxxx',
    markup: 'EEEE',
    hints: ''
  });
};

exports.testOutstanding = function(options) {
  // See bug 779800
  /*
  helpers.setInput('tsg --txt1 ddd ');
  helpers.check({
    input:  'tsg --txt1 ddd ',
    hints:                 'aaa [options]',
    markup: 'VVVVVVVVVVVVVVV'
  });
  */
};

exports.testCompleteIntoOptional = function(options) {
  // From bug 779816
  helpers.setInput('tso ');
  helpers.check({
    typed:  'tso ',
    hints:      '[text]',
    markup: 'VVVV',
    status: 'VALID'
  });

  helpers.setInput('tso');
  helpers.pressTab();
  helpers.check({
    typed:  'tso ',
    hints:      '[text]',
    markup: 'VVVV',
    status: 'VALID'
  });
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testExec', ['require', 'exports', 'module' , 'gcli/cli', 'gcli/canon', 'gclitest/mockCommands', 'gcli/types/node', 'test/assert'], function(require, exports, module) {


var Requisition = require('gcli/cli').Requisition;
var canon = require('gcli/canon');
var mockCommands = require('gclitest/mockCommands');
var nodetype = require('gcli/types/node');

var test = require('test/assert');

var actualExec;
var actualOutput;
var hideExec = false;
var skip = 'skip';

exports.setup = function() {
  mockCommands.setup();
  mockCommands.onCommandExec.add(commandExeced);
  canon.commandOutputManager.onOutput.add(commandOutputed);
};

exports.shutdown = function() {
  mockCommands.shutdown();
  mockCommands.onCommandExec.remove(commandExeced);
  canon.commandOutputManager.onOutput.remove(commandOutputed);
};

function commandExeced(ev) {
  actualExec = ev;
}

function commandOutputed(ev) {
  actualOutput = ev.output;
}

function exec(command, expectedArgs) {
  var environment = {};

  var requisition = new Requisition(environment);
  var outputObject = requisition.exec({ typed: command, hidden: hideExec });

  test.is(command.indexOf(actualExec.command.name), 0, 'Command name: ' + command);

  test.is(command, outputObject.typed, 'outputObject.command for: ' + command);
  test.ok(outputObject.completed, 'outputObject.completed false for: ' + command);

  if (expectedArgs == null) {
    test.ok(false, 'expectedArgs == null for ' + command);
    return;
  }
  if (actualExec.args == null) {
    test.ok(false, 'actualExec.args == null for ' + command);
    return;
  }

  test.is(Object.keys(expectedArgs).length, Object.keys(actualExec.args).length,
          'Arg count: ' + command);
  Object.keys(expectedArgs).forEach(function(arg) {
    var expectedArg = expectedArgs[arg];
    var actualArg = actualExec.args[arg];

    if (expectedArg === skip) {
      return;
    }

    if (Array.isArray(expectedArg)) {
      if (!Array.isArray(actualArg)) {
        test.ok(false, 'actual is not an array. ' + command + '/' + arg);
        return;
      }

      test.is(expectedArg.length, actualArg.length,
              'Array length: ' + command + '/' + arg);
      for (var i = 0; i < expectedArg.length; i++) {
        test.is(expectedArg[i], actualArg[i],
                'Member: "' + command + '/' + arg + '/' + i);
      }
    }
    else {
      test.is(expectedArg, actualArg, 'Command: "' + command + '" arg: ' + arg);
    }
  });

  test.is(environment, actualExec.context.environment, 'Environment');

  if (!hideExec) {
    test.is(false, actualOutput.error, 'output error is false');
    test.is(command, actualOutput.typed, 'command is typed');
    test.ok(typeof actualOutput.canonical === 'string', 'canonical exists');

    test.is(actualExec.args, actualOutput.args, 'actualExec.args is actualOutput.args');
  }
}


exports.testExec = function(options) {
  hideExec = options.hideExec;

  exec('tss', {});

  // Bug 707008 - GCLI deferred types don't work properly
  exec('tsv option1 10', { optionType: mockCommands.option1, optionValue: '10' });
  exec('tsv option2 10', { optionType: mockCommands.option2, optionValue: 10 });

  exec('tsr fred', { text: 'fred' });
  exec('tsr fred bloggs', { text: 'fred bloggs' });
  exec('tsr "fred bloggs"', { text: 'fred bloggs' });

  exec('tsb', { toggle: false });
  exec('tsb --toggle', { toggle: true });

  exec('tsu 10', { num: 10 });
  exec('tsu --num 10', { num: 10 });

  // Bug 704829 - Enable GCLI Javascript parameters
  // The answer to this should be 2
  exec('tsj { 1 + 1 }', { javascript: '1 + 1' });

  var origDoc = nodetype.getDocument();
  nodetype.setDocument(mockDoc);
  exec('tse :root', { node: mockBody, nodes: skip, nodes2: skip });
  nodetype.setDocument(origDoc);

  exec('tsn dif fred', { text: 'fred' });
  exec('tsn exten fred', { text: 'fred' });
  exec('tsn extend fred', { text: 'fred' });

  exec('tselarr 1', { num: '1', arr: [ ] });
  exec('tselarr 1 a', { num: '1', arr: [ 'a' ] });
  exec('tselarr 1 a b', { num: '1', arr: [ 'a', 'b' ] });

  exec('tsm a 10 10', { abc: 'a', txt: '10', num: 10 });

  // Bug 707009 - GCLI doesn't always fill in default parameters properly
  exec('tsg aaa', { solo: 'aaa', txt1: null, bool: false, txt2: 'd', num: 42 });
};

var mockBody = {
  style: {}
};

var mockDoc = {
  querySelectorAll: function(css) {
    if (css === ':root') {
      return {
        length: 1,
        item: function(i) {
          return mockBody;
        }
      };
    }
    else {
      return {
        length: 0,
        item: function() { return null; }
      };
    }
  }
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/testFocus', ['require', 'exports', 'module' , 'gclitest/helpers', 'gclitest/mockCommands'], function(require, exports, module) {


var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');

exports.setup = function(options) {
  mockCommands.setup();
  helpers.setup(options);
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
  helpers.shutdown(options);
};

exports.testBasic = function(options) {
  helpers.focusInput();
  helpers.exec(options, 'help');

  helpers.setInput('tsn deep');
  helpers.check({
    input:  'tsn deep',
    hints:          '',
    markup: 'IIIVIIII',
    cursor: 8,
    status: 'ERROR',
    outputState: 'false:default',
    tooltipState: 'false:default'
  });

  helpers.pressReturn();
  helpers.check({
    input:  'tsn deep',
    hints:          '',
    markup: 'IIIVIIII',
    cursor: 8,
    status: 'ERROR',
    outputState: 'false:default',
    tooltipState: 'true:isError'
  });
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testHelp', ['require', 'exports', 'module' , 'gclitest/helpers'], function(require, exports, module) {

  var helpers = require('gclitest/helpers');

  exports.setup = function(options) {
    helpers.setup(options);
  };

  exports.shutdown = function(options) {
    helpers.shutdown(options);
  };

  exports.testHelpStatus = function(options) {
    helpers.setInput('help');
    helpers.check({
      typed:  'help',
      hints:      ' [search]',
      markup: 'VVVV',
      status: 'VALID'
    });

    helpers.setInput('help ');
    helpers.check({
      typed:  'help ',
      hints:       '[search]',
      markup: 'VVVVV',
      status: 'VALID'
    });

    // From bug 779816
    helpers.setInput('help');
    helpers.pressTab();
    helpers.check({
      typed:  'help ',
      hints:       '[search]',
      markup: 'VVVVV',
      status: 'VALID'
    });

    helpers.setInput('help foo');
    helpers.check({
      typed:  'help foo',
      markup: 'VVVVVVVV',
      status: 'VALID',
      hints:  ''
    });

    helpers.setInput('help foo bar');
    helpers.check({
      typed:  'help foo bar',
      markup: 'VVVVVVVVVVVV',
      status: 'VALID',
      hints:  ''
    });
  };

  exports.testHelpExec = function(options) {
    if (options.isFirefox) {
      helpers.exec(options, {
        typed: 'help',
        args: { search: null },
        outputMatch: [
          /Available Commands/,
          /Get help/
        ]
      });
    }
    else {
      helpers.exec(options, {
        typed: 'help',
        args: { search: null },
        outputMatch: [
          /Welcome to GCLI/,
          /Source \(Apache-2.0\)/,
          /Get help/
        ]
      });
    }

    helpers.exec(options, {
      typed: 'help nomatch',
      args: { search: 'nomatch' },
      outputMatch: /No commands starting with 'nomatch'$/
    });

    helpers.exec(options, {
      typed: 'help help',
      args: { search: 'help' },
      outputMatch: [
        /Synopsis:/,
        /Provide help either/,
        /\(string, optional\)/
      ]
    });

    helpers.exec(options, {
      typed: 'help a b',
      args: { search: 'a b' },
      outputMatch: /No commands starting with 'a b'$/
    });

    helpers.exec(options, {
      typed: 'help hel',
      args: { search: 'hel' },
      outputMatch: [
        /Commands starting with 'hel':/,
        /Get help on the available commands/
      ]
    });
  };

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testHistory', ['require', 'exports', 'module' , 'test/assert', 'gcli/history'], function(require, exports, module) {

var test = require('test/assert');
var History = require('gcli/history').History;

exports.setup = function() {
};

exports.shutdown = function() {
};

exports.testSimpleHistory = function () {
  var history = new History({});
  history.add('foo');
  history.add('bar');
  test.is('bar', history.backward());
  test.is('foo', history.backward());

  // Adding to the history again moves us back to the start of the history.
  history.add('quux');
  test.is('quux', history.backward());
  test.is('bar', history.backward());
  test.is('foo', history.backward());
};

exports.testBackwardsPastIndex = function () {
  var history = new History({});
  history.add('foo');
  history.add('bar');
  test.is('bar', history.backward());
  test.is('foo', history.backward());

  // Moving backwards past recorded history just keeps giving you the last
  // item.
  test.is('foo', history.backward());
};

exports.testForwardsPastIndex = function () {
  var history = new History({});
  history.add('foo');
  history.add('bar');
  test.is('bar', history.backward());
  test.is('foo', history.backward());

  // Going forward through the history again.
  test.is('bar', history.forward());

  // 'Present' time.
  test.is('', history.forward());

  // Going to the 'future' just keeps giving us the empty string.
  test.is('', history.forward());
};

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testInputter', ['require', 'exports', 'module' , 'gclitest/mockCommands', 'gcli/util', 'test/assert'], function(require, exports, module) {


var mockCommands = require('gclitest/mockCommands');
var KeyEvent = require('gcli/util').KeyEvent;

var test = require('test/assert');

var latestEvent = undefined;
var latestOutput = undefined;
var latestData = undefined;

var outputted = function(ev) {
  function updateData() {
    latestData = latestOutput.data;
  }

  if (latestOutput != null) {
    ev.output.onChange.remove(updateData);
  }

  latestEvent = ev;
  latestOutput = ev.output;

  ev.output.onChange.add(updateData);
};

exports.setup = function(options) {
  options.display.requisition.commandOutputManager.onOutput.add(outputted);
  mockCommands.setup();
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
  options.display.requisition.commandOutputManager.onOutput.remove(outputted);
};

exports.testOutput = function(options) {
  latestEvent = undefined;
  latestOutput = undefined;
  latestData = undefined;

  var inputter = options.display.inputter;
  var focusManager = options.display.focusManager;

  inputter.setInput('tss');

  inputter.onKeyDown({
    keyCode: KeyEvent.DOM_VK_RETURN
  });

  test.is(inputter.element.value, 'tss', 'inputter should do nothing on RETURN keyDown');
  test.is(latestEvent, undefined, 'no events this test');
  test.is(latestData, undefined, 'no data this test');

  inputter.onKeyUp({
    keyCode: KeyEvent.DOM_VK_RETURN
  });

  test.ok(latestEvent != null, 'events this test');
  test.is(latestData.command.name, 'tss', 'last command is tss');

  test.is(inputter.element.value, '', 'inputter should exec on RETURN keyUp');

  test.ok(focusManager._recentOutput, 'recent output happened');

  inputter.onKeyUp({
    keyCode: KeyEvent.DOM_VK_F1
  });

  test.ok(!focusManager._recentOutput, 'no recent output happened post F1');
  test.ok(focusManager._helpRequested, 'F1 = help');

  inputter.onKeyUp({
    keyCode: KeyEvent.DOM_VK_ESCAPE
  });

  test.ok(!focusManager._helpRequested, 'ESCAPE = anti help');

  latestOutput.onClose();
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/testIncomplete', ['require', 'exports', 'module' , 'test/assert', 'gclitest/helpers', 'gclitest/mockCommands'], function(require, exports, module) {


var test = require('test/assert');
var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');


exports.setup = function(options) {
  mockCommands.setup();
  helpers.setup(options);
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
  helpers.shutdown(options);
};

exports.testBasic = function(options) {
  var requisition = options.display.requisition;

  helpers.setInput('tsu 2 extra');
  helpers.check({
    args: {
      num: { value: 2, type: 'Argument' }
    }
  });
  test.is(requisition._unassigned.length, 1, 'single unassigned: tsu 2 extra');
  test.is(requisition._unassigned[0].param.type.isIncompleteName, false,
          'unassigned.isIncompleteName: tsu 2 extra');

  helpers.setInput('tsu');
  helpers.check({
    args: {
      num: { value: undefined, type: 'BlankArgument' }
    }
  });

  helpers.setInput('tsg');
  helpers.check({
    args: {
      solo: { type: 'BlankArgument' },
      txt1: { type: 'BlankArgument' },
      bool: { type: 'BlankArgument' },
      txt2: { type: 'BlankArgument' },
      num: { type: 'BlankArgument' }
    }
  });
};

exports.testCompleted = function(options) {
  helpers.setInput('tsela');
  helpers.pressTab();
  helpers.check({
    args: {
      command: { name: 'tselarr', type: 'Argument' },
      num: { type: 'BlankArgument' },
      arr: { type: 'ArrayArgument' },
    }
  });

  helpers.setInput('tsn dif ');
  helpers.check({
    input:  'tsn dif ',
    hints:          '<text>',
    markup: 'VVVVVVVV',
    cursor: 8,
    status: 'ERROR',
    args: {
      command: { name: 'tsn dif', type: 'MergedArgument' },
      text: { type: 'BlankArgument', status: 'INCOMPLETE' }
    }
  });

  helpers.setInput('tsn di');
  helpers.pressTab();
  helpers.check({
    input:  'tsn dif ',
    hints:          '<text>',
    markup: 'VVVVVVVV',
    cursor: 8,
    status: 'ERROR',
    args: {
      command: { name: 'tsn dif', type: 'Argument' },
      text: { type: 'BlankArgument', status: 'INCOMPLETE' }
    }
  });

  // The above 2 tests take different routes to 'tsn dif '. The results should
  // be similar. The difference is in args.command.type.

  helpers.setInput('tsg -');
  helpers.check({
    input:  'tsg -',
    hints:       '-txt1 <solo> [options]',
    markup: 'VVVVI',
    cursor: 5,
    status: 'ERROR',
    args: {
      solo: { value: undefined, status: 'INCOMPLETE' },
      txt1: { value: undefined, status: 'VALID' },
      bool: { value: false, status: 'VALID' },
      txt2: { value: undefined, status: 'VALID' },
      num: { value: undefined, status: 'VALID' }
    }
  });

  helpers.pressTab();
  helpers.check({
    input:  'tsg --txt1 ',
    hints:             '<string> <solo> [options]',
    markup: 'VVVVIIIIIIV',
    cursor: 11,
    status: 'ERROR',
    args: {
      solo: { value: undefined, status: 'INCOMPLETE' },
      txt1: { value: undefined, status: 'INCOMPLETE' },
      bool: { value: false, status: 'VALID' },
      txt2: { value: undefined, status: 'VALID' },
      num: { value: undefined, status: 'VALID' }
    }
  });

  helpers.setInput('tsg --txt1 fred');
  helpers.check({
    input:  'tsg --txt1 fred',
    hints:                 ' <solo> [options]',
    markup: 'VVVVVVVVVVVVVVV',
    status: 'ERROR',
    args: {
      solo: { value: undefined, status: 'INCOMPLETE' },
      txt1: { value: 'fred', status: 'VALID' },
      bool: { value: false, status: 'VALID' },
      txt2: { value: undefined, status: 'VALID' },
      num: { value: undefined, status: 'VALID' }
    }
  });

  helpers.setInput('tscook key value --path path --');
  helpers.check({
    input:  'tscook key value --path path --',
    hints:                                 'domain [options]',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVII',
    status: 'ERROR',
    args: {
      key: { value: 'key', status: 'VALID' },
      value: { value: 'value', status: 'VALID' },
      path: { value: 'path', status: 'VALID' },
      domain: { value: undefined, status: 'VALID' },
      secure: { value: false, status: 'VALID' }
    }
  });

  helpers.setInput('tscook key value --path path --domain domain --');
  helpers.check({
    input:  'tscook key value --path path --domain domain --',
    hints:                                                 'secure [options]',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVII',
    status: 'ERROR',
    args: {
      key: { value: 'key', status: 'VALID' },
      value: { value: 'value', status: 'VALID' },
      path: { value: 'path', status: 'VALID' },
      domain: { value: 'domain', status: 'VALID' },
      secure: { value: false, status: 'VALID' }
    }
  });
};

exports.testCase = function(options) {
  helpers.setInput('tsg AA');
  helpers.check({
    input:  'tsg AA',
    hints:        ' [options] -> aaa',
    markup: 'VVVVII',
    status: 'ERROR',
    args: {
      solo: { value: undefined, text: 'AA', status: 'INCOMPLETE' },
      txt1: { value: undefined, status: 'VALID' },
      bool: { value: false, status: 'VALID' },
      txt2: { value: undefined, status: 'VALID' },
      num: { value: undefined, status: 'VALID' }
    }
  });
};

exports.testIncomplete = function(options) {
  var requisition = options.display.requisition;

  helpers.setInput('tsm a a -');
  helpers.check({
    args: {
      abc: { value: 'a', type: 'Argument' },
      txt: { value: 'a', type: 'Argument' },
      num: { value: undefined, arg: ' -', type: 'Argument', status: 'INCOMPLETE' }
    }
  });

  helpers.setInput('tsg -');
  helpers.check({
    args: {
      solo: { type: 'BlankArgument' },
      txt1: { type: 'BlankArgument' },
      bool: { type: 'BlankArgument' },
      txt2: { type: 'BlankArgument' },
      num: { type: 'BlankArgument' }
    }
  });
  test.is(requisition._unassigned[0], requisition.getAssignmentAt(5),
          'unassigned -');
  test.is(requisition._unassigned.length, 1, 'single unassigned - tsg -');
  test.is(requisition._unassigned[0].param.type.isIncompleteName, true,
          'unassigned.isIncompleteName: tsg -');
};

exports.testHidden = function(options) {
  helpers.setInput('tshidde');
  helpers.check({
    input:  'tshidde',
    markup: 'EEEEEEE',
    status: 'ERROR',
    hints:  '',
  });

  helpers.setInput('tshidden');
  helpers.check({
    input:  'tshidden',
    hints:          ' [options]',
    markup: 'VVVVVVVV',
    status: 'VALID',
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: false, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --vis');
  helpers.check({
    input:  'tshidden --vis',
    hints:                'ible [options]',
    markup: 'VVVVVVVVVIIIII',
    status: 'ERROR',
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: false, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --invisiblestrin');
  helpers.check({
    input:  'tshidden --invisiblestrin',
    hints:                           ' [options]',
    markup: 'VVVVVVVVVEEEEEEEEEEEEEEEE',
    status: 'ERROR',
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: false, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --invisiblestring');
  helpers.check({
    input:  'tshidden --invisiblestring',
    hints:                            ' <string> [options]',
    markup: 'VVVVVVVVVIIIIIIIIIIIIIIIII',
    status: 'ERROR',
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'INCOMPLETE' },
      invisibleboolean: { value: false, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --invisiblestring x');
  helpers.check({
    input:  'tshidden --invisiblestring x',
    hints:                              ' [options]',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVV',
    status: 'VALID',
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: 'x', status: 'VALID' },
      invisibleboolean: { value: false, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --invisibleboolea');
  helpers.check({
    input:  'tshidden --invisibleboolea',
    hints:                            ' [options]',
    markup: 'VVVVVVVVVEEEEEEEEEEEEEEEEE',
    status: 'ERROR',
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: false, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --invisibleboolean');
  helpers.check({
    input:  'tshidden --invisibleboolean',
    hints:                             ' [options]',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVV',
    status: 'VALID',
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: true, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --visible xxx');
  helpers.check({
    input:  'tshidden --visible xxx',
    markup: 'VVVVVVVVVVVVVVVVVVVVVV',
    status: 'VALID',
    hints:  '',
    args: {
      visible: { value: 'xxx', status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: false, status: 'VALID' }
    }
  });
};

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testIntro', ['require', 'exports', 'module' , 'gclitest/helpers', 'test/assert'], function(require, exports, module) {

  var helpers = require('gclitest/helpers');
  var test = require('test/assert');

  exports.setup = function(options) {
    helpers.setup(options);
  };

  exports.shutdown = function(options) {
    helpers.shutdown(options);
  };

  exports.testIntroStatus = function(options) {
    if (options.isFirefox) {
      test.log('Skipping testIntroStatus in Firefox.');
      return;
    }

    helpers.setInput('intro');
    helpers.check({
      typed:  'intro',
      markup: 'VVVVV',
      status: 'VALID',
      hints: ''
    });

    helpers.setInput('intro foo');
    helpers.check({
      typed:  'intro foo',
      markup: 'VVVVVVEEE',
      status: 'ERROR',
      hints: ''
    });
  };

  exports.testIntroExec = function(options) {
    if (options.isFirefox) {
      test.log('Skipping testIntroExec in Firefox.');
      return;
    }

    helpers.exec(options, {
      typed: 'intro',
      args: { },
      outputMatch: [
        /command\s*line/,
        /help/,
        /F1/,
        /Escape/
      ]
    });
  };

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testJs', ['require', 'exports', 'module' , 'gcli/cli', 'gcli/types', 'gcli/types/javascript', 'gcli/canon', 'test/assert'], function(require, exports, module) {


var Requisition = require('gcli/cli').Requisition;
var Status = require('gcli/types').Status;
var javascript = require('gcli/types/javascript');
var canon = require('gcli/canon');

var test = require('test/assert');

var debug = false;
var requ;

var assign;
var status;
var statuses;
var tempWindow;


exports.setup = function(options) {
  tempWindow = javascript.getGlobalObject();
  javascript.setGlobalObject(options.window);

  Object.defineProperty(options.window, 'donteval', {
    get: function() {
      test.ok(false, 'donteval should not be used');
      return { cant: '', touch: '', 'this': '' };
    },
    enumerable: true,
    configurable : true
  });
};

exports.shutdown = function(options) {
  delete options.window.donteval;

  javascript.setGlobalObject(tempWindow);
  tempWindow = undefined;
};

function input(typed) {
  if (!requ) {
    requ = new Requisition();
  }
  var cursor = { start: typed.length, end: typed.length };
  requ.update(typed);

  if (debug) {
    console.log('####### TEST: typed="' + typed +
        '" cur=' + cursor.start +
        ' cli=', requ);
  }

  status = requ.getStatus();
  statuses = requ.getInputStatusMarkup(cursor.start).map(function(s) {
    return Array(s.string.length + 1).join(s.status.toString()[0]);
  }).join('');

  if (requ.commandAssignment.value) {
    assign = requ.getAssignment(0);
  }
  else {
    assign = undefined;
  }
}

function predictionsHas(name) {
  return assign.getPredictions().some(function(prediction) {
    return name === prediction.name;
  }, this);
}

function check(expStatuses, expStatus, expAssign, expPredict) {
  test.is('{', requ.commandAssignment.value.name, 'is exec');

  test.is(expStatuses, statuses, 'unexpected status markup');
  test.is(expStatus.toString(), status.toString(), 'unexpected status');
  test.is(expAssign, assign.value, 'unexpected assignment');

  if (expPredict != null) {
    var contains;
    if (Array.isArray(expPredict)) {
      expPredict.forEach(function(p) {
        contains = predictionsHas(p);
        test.ok(contains, 'missing prediction ' + p);
      });
    }
    else if (typeof expPredict === 'number') {
      contains = true;
      test.is(assign.getPredictions().length, expPredict, 'prediction count');
      if (assign.getPredictions().length !== expPredict) {
        assign.getPredictions().forEach(function(prediction) {
          test.log('actual prediction: ', prediction);
        });
      }
    }
    else {
      contains = predictionsHas(expPredict);
      test.ok(contains, 'missing prediction ' + expPredict);
    }

    if (!contains) {
      test.log('Predictions: ' + assign.getPredictions().map(function(p) {
        return p.name;
      }).join(', '));
    }
  }
}

exports.testBasic = function(options) {
  if (!canon.getCommand('{')) {
    test.log('Skipping exec tests because { is not registered');
    return;
  }

  input('{');
  check('V', Status.ERROR, undefined);

  input('{ ');
  check('VV', Status.ERROR, undefined);

  input('{ w');
  check('VVI', Status.ERROR, 'w', 'window');

  input('{ windo');
  check('VVIIIII', Status.ERROR, 'windo', 'window');

  input('{ window');
  check('VVVVVVVV', Status.VALID, 'window');

  input('{ window.d');
  check('VVIIIIIIII', Status.ERROR, 'window.d', 'window.document');

  input('{ window.document.title');
  check('VVVVVVVVVVVVVVVVVVVVVVV', Status.VALID, 'window.document.title', 0);

  input('{ d');
  check('VVI', Status.ERROR, 'd', 'document');

  input('{ document.title');
  check('VVVVVVVVVVVVVVVV', Status.VALID, 'document.title', 0);

  test.ok('donteval' in options.window, 'donteval exists');

  input('{ don');
  check('VVIII', Status.ERROR, 'don', 'donteval');

  input('{ donteval');
  check('VVVVVVVVVV', Status.VALID, 'donteval', 0);

  /*
  // This is a controversial test - technically we can tell that it's an error
  // because 'donteval.' is a syntax error, however donteval is unsafe so we
  // are playing safe by bailing out early. It's enough of a corner case that
  // I don't think it warrants fixing
  input('{ donteval.');
  check('VVIIIIIIIII', Status.ERROR, 'donteval.', 0);
  */

  input('{ donteval.cant');
  check('VVVVVVVVVVVVVVV', Status.VALID, 'donteval.cant', 0);

  input('{ donteval.xxx');
  check('VVVVVVVVVVVVVV', Status.VALID, 'donteval.xxx', 0);
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testKeyboard', ['require', 'exports', 'module' , 'gcli/cli', 'gcli/canon', 'gclitest/mockCommands', 'gcli/types/javascript', 'test/assert'], function(require, exports, module) {


var Requisition = require('gcli/cli').Requisition;
var canon = require('gcli/canon');
var mockCommands = require('gclitest/mockCommands');
var javascript = require('gcli/types/javascript');

var test = require('test/assert');

var tempWindow;
var inputter;

exports.setup = function(options) {
  tempWindow = javascript.getGlobalObject();
  javascript.setGlobalObject(options.window);

  if (options.display) {
    inputter = options.display.inputter;
  }

  mockCommands.setup();
};

exports.shutdown = function(options) {
  mockCommands.shutdown();

  inputter = undefined;
  javascript.setGlobalObject(tempWindow);
  tempWindow = undefined;
};

var COMPLETES_TO = 'complete';
var KEY_UPS_TO = 'keyup';
var KEY_DOWNS_TO = 'keydown';

function check(initial, action, after, choice, cursor, expectedCursor) {
  var requisition;
  if (inputter) {
    requisition = inputter.requisition;
    inputter.setInput(initial);
  }
  else {
    requisition = new Requisition();
    requisition.update(initial);
  }

  if (cursor == null) {
    cursor = initial.length;
  }
  var assignment = requisition.getAssignmentAt(cursor);
  switch (action) {
    case COMPLETES_TO:
      requisition.complete({ start: cursor, end: cursor }, choice);
      break;

    case KEY_UPS_TO:
      requisition.increment(assignment);
      break;

    case KEY_DOWNS_TO:
      requisition.decrement(assignment);
      break;
  }

  test.is(after, requisition.toString(),
          initial + ' + ' + action + ' -> ' + after);

  if (expectedCursor != null) {
    if (inputter) {
      test.is(expectedCursor, inputter.getInputState().cursor.start,
              'Ending cursor position for \'' + initial + '\'');
    }
  }
}

exports.testComplete = function(options) {
  if (!inputter) {
    test.log('Missing display, reduced checks');
  }

  check('tsela', COMPLETES_TO, 'tselarr ', 0);
  check('tsn di', COMPLETES_TO, 'tsn dif ', 0);
  check('tsg a', COMPLETES_TO, 'tsg aaa ', 0);

  check('tsn e', COMPLETES_TO, 'tsn extend ', -5);
  check('tsn e', COMPLETES_TO, 'tsn ext ', -4);
  check('tsn e', COMPLETES_TO, 'tsn exte ', -3);
  check('tsn e', COMPLETES_TO, 'tsn exten ', -2);
  check('tsn e', COMPLETES_TO, 'tsn extend ', -1);
  check('tsn e', COMPLETES_TO, 'tsn ext ', 0);
  check('tsn e', COMPLETES_TO, 'tsn exte ', 1);
  check('tsn e', COMPLETES_TO, 'tsn exten ', 2);
  check('tsn e', COMPLETES_TO, 'tsn extend ', 3);
  check('tsn e', COMPLETES_TO, 'tsn ext ', 4);
  check('tsn e', COMPLETES_TO, 'tsn exte ', 5);
  check('tsn e', COMPLETES_TO, 'tsn exten ', 6);
  check('tsn e', COMPLETES_TO, 'tsn extend ', 7);
  check('tsn e', COMPLETES_TO, 'tsn ext ', 8);

  if (!canon.getCommand('{')) {
    test.log('Skipping exec tests because { is not registered');
  }
  else {
    check('{ wind', COMPLETES_TO, '{ window', 0);
    check('{ window.docum', COMPLETES_TO, '{ window.document', 0);

    // Bug 717228: This fails under node
    if (!options.isNode) {
      check('{ window.document.titl', COMPLETES_TO, '{ window.document.title ', 0);
    }
    else {
      test.log('Running under Node. Skipping tests due to bug 717228.');
    }
  }
};

exports.testInternalComplete = function(options) {
  // Bug 664377
  // check('tsela 1', COMPLETES_TO, 'tselarr 1', 0, 3, 8);
};

exports.testIncrDecr = function() {
  check('tsu -70', KEY_UPS_TO, 'tsu -5');
  check('tsu -7', KEY_UPS_TO, 'tsu -5');
  check('tsu -6', KEY_UPS_TO, 'tsu -5');
  check('tsu -5', KEY_UPS_TO, 'tsu -3');
  check('tsu -4', KEY_UPS_TO, 'tsu -3');
  check('tsu -3', KEY_UPS_TO, 'tsu 0');
  check('tsu -2', KEY_UPS_TO, 'tsu 0');
  check('tsu -1', KEY_UPS_TO, 'tsu 0');
  check('tsu 0', KEY_UPS_TO, 'tsu 3');
  check('tsu 1', KEY_UPS_TO, 'tsu 3');
  check('tsu 2', KEY_UPS_TO, 'tsu 3');
  check('tsu 3', KEY_UPS_TO, 'tsu 6');
  check('tsu 4', KEY_UPS_TO, 'tsu 6');
  check('tsu 5', KEY_UPS_TO, 'tsu 6');
  check('tsu 6', KEY_UPS_TO, 'tsu 9');
  check('tsu 7', KEY_UPS_TO, 'tsu 9');
  check('tsu 8', KEY_UPS_TO, 'tsu 9');
  check('tsu 9', KEY_UPS_TO, 'tsu 10');
  check('tsu 10', KEY_UPS_TO, 'tsu 10');
  check('tsu 100', KEY_UPS_TO, 'tsu -5');

  check('tsu -70', KEY_DOWNS_TO, 'tsu 10');
  check('tsu -7', KEY_DOWNS_TO, 'tsu 10');
  check('tsu -6', KEY_DOWNS_TO, 'tsu 10');
  check('tsu -5', KEY_DOWNS_TO, 'tsu -5');
  check('tsu -4', KEY_DOWNS_TO, 'tsu -5');
  check('tsu -3', KEY_DOWNS_TO, 'tsu -5');
  check('tsu -2', KEY_DOWNS_TO, 'tsu -3');
  check('tsu -1', KEY_DOWNS_TO, 'tsu -3');
  check('tsu 0', KEY_DOWNS_TO, 'tsu -3');
  check('tsu 1', KEY_DOWNS_TO, 'tsu 0');
  check('tsu 2', KEY_DOWNS_TO, 'tsu 0');
  check('tsu 3', KEY_DOWNS_TO, 'tsu 0');
  check('tsu 4', KEY_DOWNS_TO, 'tsu 3');
  check('tsu 5', KEY_DOWNS_TO, 'tsu 3');
  check('tsu 6', KEY_DOWNS_TO, 'tsu 3');
  check('tsu 7', KEY_DOWNS_TO, 'tsu 6');
  check('tsu 8', KEY_DOWNS_TO, 'tsu 6');
  check('tsu 9', KEY_DOWNS_TO, 'tsu 6');
  check('tsu 10', KEY_DOWNS_TO, 'tsu 9');
  check('tsu 100', KEY_DOWNS_TO, 'tsu 10');

  // Bug 707007 - GCLI increment and decrement operations cycle through
  // selection options in the wrong order
  check('tselarr 1', KEY_DOWNS_TO, 'tselarr 2');
  check('tselarr 2', KEY_DOWNS_TO, 'tselarr 3');
  check('tselarr 3', KEY_DOWNS_TO, 'tselarr 1');

  check('tselarr 3', KEY_UPS_TO, 'tselarr 2');
};

});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/testMenu', ['require', 'exports', 'module' , 'gclitest/helpers', 'gclitest/mockCommands'], function(require, exports, module) {


var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');


exports.setup = function(options) {
  mockCommands.setup();
  helpers.setup(options);
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
  helpers.shutdown(options);
};

exports.testOptions = function(options) {
  helpers.setInput('tslong');
  helpers.check({
    input:  'tslong',
    markup: 'VVVVVV',
    status: 'ERROR',
    hints: ' <msg> [options]',
    args: {
      msg: { value: undefined, status: 'INCOMPLETE' },
      num: { value: undefined, status: 'VALID' },
      sel: { value: undefined, status: 'VALID' },
      bool: { value: false, status: 'VALID' },
      bool2: { value: false, status: 'VALID' },
      sel2: { value: undefined, status: 'VALID' },
      num2: { value: undefined, status: 'VALID' }
    }
  });
};


});

/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/testNode', ['require', 'exports', 'module' , 'test/assert', 'gclitest/helpers', 'gclitest/mockCommands'], function(require, exports, module) {


var test = require('test/assert');
var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');


exports.setup = function(options) {
  mockCommands.setup();
  helpers.setup(options);
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
  helpers.shutdown(options);
};

exports.testNode = function(options) {
  var requisition = options.display.requisition;

  helpers.setInput('tse ');
  helpers.check({
    input:  'tse ',
    hints:      '<node> [options]',
    markup: 'VVVV',
    cursor: 4,
    current: 'node',
    status: 'ERROR',
    args: {
      command: { name: 'tse' },
      node: { status: 'INCOMPLETE', message: '' },
      nodes: { status: 'VALID' },
      nodes2: { status: 'VALID' }
    }
  });

  helpers.setInput('tse :');
  helpers.check({
    input:  'tse :',
    hints:       ' [options]',
    markup: 'VVVVE',
    cursor: 5,
    current: 'node',
    status: 'ERROR',
    args: {
      command: { name: 'tse' },
      node: {
        arg: ' :',
        status: 'ERROR',
        message: 'Syntax error in CSS query'
      },
      nodes: { status: 'VALID' },
      nodes2: { status: 'VALID' }
    }
  });

  helpers.setInput('tse :root');
  helpers.check({
    input:  'tse :root',
    hints:           ' [options]',
    markup: 'VVVVVVVVV',
    cursor: 9,
    current: 'node',
    status: 'VALID',
    args: {
      command: { name: 'tse' },
      node: { arg: ' :root', status: 'VALID' },
      nodes: { status: 'VALID' },
      nodes2: { status: 'VALID' }
    }
  });

  helpers.setInput('tse :root ');
  helpers.check({
    input:  'tse :root ',
    hints:            '[options]',
    markup: 'VVVVVVVVVV',
    cursor: 10,
    current: 'node',
    status: 'VALID',
    args: {
      command: { name: 'tse' },
      node: { arg: ' :root ', status: 'VALID' },
      nodes: { status: 'VALID' },
      nodes2: { status: 'VALID' }
    }
  });
  test.is(requisition.getAssignment('node').value.tagName,
          'HTML',
          'root id');

  helpers.setInput('tse #gcli-nomatch');
  helpers.check({
    input:  'tse #gcli-nomatch',
    hints:                   ' [options]',
    markup: 'VVVVIIIIIIIIIIIII',
    cursor: 17,
    current: 'node',
    status: 'ERROR',
    args: {
      command: { name: 'tse' },
      node: {
        value: undefined,
        arg: ' #gcli-nomatch',
        status: 'INCOMPLETE',
        message: 'No matches'
      },
      nodes: { status: 'VALID' },
      nodes2: { status: 'VALID' }
    }
  });

  helpers.setInput('tse #');
  helpers.check({
    input:  'tse #',
    hints:       ' [options]',
    markup: 'VVVVE',
    cursor: 5,
    current: 'node',
    status: 'ERROR',
    args: {
      command: { name: 'tse' },
      node: {
        value: undefined,
        arg: ' #',
        status: 'ERROR',
        message: 'Syntax error in CSS query'
      },
      nodes: { status: 'VALID' },
      nodes2: { status: 'VALID' }
    }
  });

  helpers.setInput('tse .');
  helpers.check({
    input:  'tse .',
    hints:       ' [options]',
    markup: 'VVVVE',
    cursor: 5,
    current: 'node',
    status: 'ERROR',
    args: {
      command: { name: 'tse' },
      node: {
        value: undefined,
        arg: ' .',
        status: 'ERROR',
        message: 'Syntax error in CSS query'
      },
      nodes: { status: 'VALID' },
      nodes2: { status: 'VALID' }
    }
  });

  helpers.setInput('tse *');
  helpers.check({
    input:  'tse *',
    hints:       ' [options]',
    markup: 'VVVVE',
    cursor: 5,
    current: 'node',
    status: 'ERROR',
    args: {
      command: { name: 'tse' },
      node: {
        value: undefined,
        arg: ' *',
        status: 'ERROR',
        // message: 'Too many matches (128)'
      },
      nodes: { status: 'VALID' },
      nodes2: { status: 'VALID' }
    }
  });
};

exports.testNodes = function(options) {
  var requisition = options.display.requisition;

  helpers.setInput('tse :root --nodes *');
  helpers.check({
    input:  'tse :root --nodes *',
    hints:                       ' [options]',
    markup: 'VVVVVVVVVVVVVVVVVVV',
    current: 'nodes',
    status: 'VALID',
    args: {
      command: { name: 'tse' },
      node: { arg: ' :root', status: 'VALID' },
      nodes: { arg: ' --nodes *', status: 'VALID' },
      nodes2: { status: 'VALID' }
    }
  });
  test.is(requisition.getAssignment('node').value.tagName,
          'HTML',
          '#gcli-input id');

  helpers.setInput('tse :root --nodes2 div');
  helpers.check({
    input:  'tse :root --nodes2 div',
    hints:                       ' [options]',
    markup: 'VVVVVVVVVVVVVVVVVVVVVV',
    cursor: 22,
    current: 'nodes2',
    status: 'VALID',
    args: {
      command: { name: 'tse' },
      node: { arg: ' :root', status: 'VALID' },
      nodes: { status: 'VALID' },
      nodes2: { arg: ' --nodes2 div', status: 'VALID' }
    }
  });
  test.is(requisition.getAssignment('node').value.tagName,
          'HTML',
          'root id');

  helpers.setInput('tse --nodes ffff');
  helpers.check({
    input:  'tse --nodes ffff',
    hints:                  ' <node> [options]',
    markup: 'VVVVIIIIIIIVIIII',
    cursor: 16,
    current: 'nodes',
    status: 'ERROR',
    outputState: 'false:default',
    tooltipState: 'true:isError',
    args: {
      command: { name: 'tse' },
      node: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
      nodes: { value: undefined, arg: ' --nodes ffff', status: 'INCOMPLETE', message: 'No matches' },
      nodes2: { arg: '', status: 'VALID', message: '' },
    }
  });
  /*
  test.is(requisition.getAssignment('nodes2').value.constructor.name,
          'NodeList',
          '#gcli-input id');
  */

  helpers.setInput('tse --nodes2 ffff');
  helpers.check({
    input:  'tse --nodes2 ffff',
    hints:                   ' <node> [options]',
    markup: 'VVVVVVVVVVVVVVVVV',
    cursor: 17,
    current: 'nodes2',
    status: 'ERROR',
    outputState: 'false:default',
    tooltipState: 'false:default',
    args: {
      command: { name: 'tse' },
      node: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
      nodes: { arg: '', status: 'VALID', message: '' },
      nodes2: { arg: ' --nodes2 ffff', status: 'VALID', message: '' },
    }
  });
  /*
  test.is(requisition.getAssignment('nodes').value.constructor.name,
          'NodeList',
          '#gcli-input id');
  test.is(requisition.getAssignment('nodes2').value.constructor.name,
          'NodeList',
          '#gcli-input id');
  */
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testPref', ['require', 'exports', 'module' , 'gcli/commands/pref', 'gclitest/helpers', 'gclitest/mockSettings', 'test/assert'], function(require, exports, module) {


var pref = require('gcli/commands/pref');
var helpers = require('gclitest/helpers');
var mockSettings = require('gclitest/mockSettings');
var test = require('test/assert');


exports.setup = function(options) {
  helpers.setup(options);

  if (!options.isFirefox) {
    mockSettings.setup();
  }
  else {
    test.log('Skipping testPref in Firefox.');
  }
};

exports.shutdown = function(options) {
  helpers.shutdown(options);

  if (!options.isFirefox) {
    mockSettings.shutdown();
  }
};

exports.testPrefShowStatus = function(options) {
  if (options.isFirefox) {
    test.log('Skipping testPrefShowStatus in Firefox.');
    return;
  }

  helpers.setInput('pref s');
  helpers.check({
    typed:  'pref s',
    hints:        'et',
    markup: 'IIIIVI',
    status: 'ERROR'
  });

  helpers.setInput('pref show');
  helpers.check({
    typed:  'pref show',
    hints:           ' <setting>',
    markup: 'VVVVVVVVV',
    status: 'ERROR'
  });

  helpers.setInput('pref show ');
  helpers.check({
    typed:  'pref show ',
    hints:            'allowSet',
    markup: 'VVVVVVVVVV',
    status: 'ERROR'
  });

  helpers.setInput('pref show tempTBo');
  helpers.check({
    typed:  'pref show tempTBo',
    hints:                   'ol',
    markup: 'VVVVVVVVVVIIIIIII',
    status: 'ERROR'
  });

  helpers.setInput('pref show tempTBool');
  helpers.check({
    typed:  'pref show tempTBool',
    markup: 'VVVVVVVVVVVVVVVVVVV',
    status: 'VALID',
    hints:  ''
  });

  helpers.setInput('pref show tempTBool 4');
  helpers.check({
    typed:  'pref show tempTBool 4',
    markup: 'VVVVVVVVVVVVVVVVVVVVE',
    status: 'ERROR',
    hints:  ''
  });

  helpers.setInput('pref show tempNumber 4');
  helpers.check({
    typed:  'pref show tempNumber 4',
    markup: 'VVVVVVVVVVVVVVVVVVVVVE',
    status: 'ERROR',
    hints:  ''
  });
};

exports.testPrefSetStatus = function(options) {
  if (options.isFirefox) {
    test.log('Skipping testPrefSetStatus in Firefox.');
    return;
  }

  helpers.setInput('pref s');
  helpers.check({
    typed:  'pref s',
    hints:        'et',
    markup: 'IIIIVI',
    status: 'ERROR',
  });

  helpers.setInput('pref set');
  helpers.check({
    typed:  'pref set',
    hints:          ' <setting> <value>',
    markup: 'VVVVVVVV',
    status: 'ERROR'
  });

  helpers.setInput('pref xxx');
  helpers.check({
    typed:  'pref xxx',
    markup: 'EEEEVEEE',
    status: 'ERROR'
  });

  helpers.setInput('pref set ');
  helpers.check({
    typed:  'pref set ',
    hints:           'allowSet <value>',
    markup: 'VVVVVVVVV',
    status: 'ERROR'
  });

  helpers.setInput('pref set tempTBo');
  helpers.check({
    typed:  'pref set tempTBo',
    hints:                  'ol <value>',
    markup: 'VVVVVVVVVIIIIIII',
    status: 'ERROR'
  });

  helpers.setInput('pref set tempTBool 4');
  helpers.check({
    typed:  'pref set tempTBool 4',
    markup: 'VVVVVVVVVVVVVVVVVVVE',
    status: 'ERROR',
    hints: ''
  });

  helpers.setInput('pref set tempNumber 4');
  helpers.check({
    typed:  'pref set tempNumber 4',
    markup: 'VVVVVVVVVVVVVVVVVVVVV',
    status: 'VALID',
    hints: ''
  });
};

exports.testPrefExec = function(options) {
  if (options.isFirefox) {
    test.log('Skipping testPrefExec in Firefox.');
    return;
  }

  var initialAllowSet = pref.allowSet.value;
  pref.allowSet.value = false;

  test.is(mockSettings.tempNumber.value, 42, 'set to 42');

  helpers.exec(options, {
    typed: 'pref set tempNumber 4',
    args: {
      setting: mockSettings.tempNumber,
      value: 4
    },
    outputMatch: [ /void your warranty/, /I promise/ ]
  });

  test.is(mockSettings.tempNumber.value, 42, 'still set to 42');
  pref.allowSet.value = true;

  helpers.exec(options, {
    typed: 'pref set tempNumber 4',
    args: {
      setting: mockSettings.tempNumber,
      value: 4
    },
    blankOutput: true
  });

  test.is(mockSettings.tempNumber.value, 4, 'set to 4');

  helpers.exec(options, {
    typed: 'pref reset tempNumber',
    args: {
      setting: mockSettings.tempNumber
    },
    blankOutput: true
  });

  test.is(mockSettings.tempNumber.value, 42, 'reset to 42');

  pref.allowSet.value = initialAllowSet;

  helpers.exec(options, {
    typed: 'pref list tempNum',
    args: {
      search: 'tempNum'
    },
    outputMatch: /Filter/
  });
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/mockSettings', ['require', 'exports', 'module' , 'gcli/settings'], function(require, exports, module) {


var settings = require('gcli/settings');


var tempTBoolSpec = {
  name: 'tempTBool',
  type: 'boolean',
  description: 'temporary default true boolean',
  defaultValue: true
};
exports.tempTBool = undefined;

var tempFBoolSpec = {
  name: 'tempFBool',
  type: 'boolean',
  description: 'temporary default false boolean',
  defaultValue: false
};
exports.tempFBool = undefined;

var tempUStringSpec = {
  name: 'tempUString',
  type: 'string',
  description: 'temporary default undefined string'
};
exports.tempUString = undefined;

var tempNStringSpec = {
  name: 'tempNString',
  type: 'string',
  description: 'temporary default undefined string',
  defaultValue: null
};
exports.tempNString = undefined;

var tempQStringSpec = {
  name: 'tempQString',
  type: 'string',
  description: 'temporary default "q" string',
  defaultValue: 'q'
};
exports.tempQString = undefined;

var tempNumberSpec = {
  name: 'tempNumber',
  type: 'number',
  description: 'temporary number',
  defaultValue: 42
};
exports.tempNumber = undefined;

var tempSelectionSpec = {
  name: 'tempSelection',
  type: { name: 'selection', data: [ 'a', 'b', 'c' ] },
  description: 'temporary selection',
  defaultValue: 'a'
};
exports.tempSelection = undefined;

/**
 * Registration and de-registration.
 */
exports.setup = function() {
  exports.tempTBool = settings.addSetting(tempTBoolSpec);
  exports.tempFBool = settings.addSetting(tempFBoolSpec);
  exports.tempUString = settings.addSetting(tempUStringSpec);
  exports.tempNString = settings.addSetting(tempNStringSpec);
  exports.tempQString = settings.addSetting(tempQStringSpec);
  exports.tempNumber = settings.addSetting(tempNumberSpec);
  exports.tempSelection = settings.addSetting(tempSelectionSpec);
};

exports.shutdown = function() {
  settings.removeSetting(tempTBoolSpec);
  settings.removeSetting(tempFBoolSpec);
  settings.removeSetting(tempUStringSpec);
  settings.removeSetting(tempNStringSpec);
  settings.removeSetting(tempQStringSpec);
  settings.removeSetting(tempNumberSpec);
  settings.removeSetting(tempSelectionSpec);

  exports.tempTBool = undefined;
  exports.tempFBool = undefined;
  exports.tempUString = undefined;
  exports.tempNString = undefined;
  exports.tempQString = undefined;
  exports.tempNumber = undefined;
  exports.tempSelection = undefined;
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testRequire', ['require', 'exports', 'module' , 'test/assert', 'gclitest/requirable'], function(require, exports, module) {

var test = require('test/assert');


exports.testWorking = function() {
  // There are lots of requirement tests that we could be doing here
  // The fact that we can get anything at all working is a testament to
  // require doing what it should - we don't need to test the
  var requireable = require('gclitest/requirable');
  test.is('thing1', requireable.thing1);
  test.is(2, requireable.thing2);
  test.ok(requireable.thing3 === undefined);
};

exports.testDomains = function(options) {
  var requireable = require('gclitest/requirable');
  test.ok(requireable.status === undefined);
  requireable.setStatus(null);
  test.is(null, requireable.getStatus());
  test.ok(requireable.status === undefined);
  requireable.setStatus('42');
  test.is('42', requireable.getStatus());
  test.ok(requireable.status === undefined);

  if (options.isUnamdized) {
    test.log('Running unamdized, Reduced tests');
    return;
  }

  if (define.Domain) {
    var domain = new define.Domain();
    var requireable2 = domain.require('gclitest/requirable');
    test.is(undefined, requireable2.status);
    test.is('initial', requireable2.getStatus());
    requireable2.setStatus(999);
    test.is(999, requireable2.getStatus());
    test.is(undefined, requireable2.status);

    test.is('42', requireable.getStatus());
    test.is(undefined, requireable.status);
  }
};

exports.testLeakage = function() {
  var requireable = require('gclitest/requirable');
  test.ok(requireable.setup === undefined);
  test.ok(requireable.shutdown === undefined);
  test.ok(requireable.testWorking === undefined);
};

exports.testMultiImport = function() {
  var r1 = require('gclitest/requirable');
  var r2 = require('gclitest/requirable');
  test.is(r1, r2);
};

exports.testUncompilable = function() {
  // This test is commented out because it breaks the RequireJS module
  // loader and because it causes console output and because testing failure
  // cases such as this is something of a luxury
  // It's not totally clear how a module loader should perform with unusable
  // modules, however at least it should go into a flat spin ...
  // GCLI mini_require reports an error as it should
  /*
  if (define.Domain) {
    try {
      var unrequireable = require('gclitest/unrequirable');
      t.fail();
    }
    catch (ex) {
      console.error(ex);
    }
  }
  */
};

exports.testRecursive = function() {
  // See Bug 658583
  /*
  var recurse = require('gclitest/recurse');
  */
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/requirable', ['require', 'exports', 'module' ], function(require, exports, module) {

  exports.thing1 = 'thing1';
  exports.thing2 = 2;

  var status = 'initial';
  exports.setStatus = function(aStatus) { status = aStatus; };
  exports.getStatus = function() { return status; };

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testResource', ['require', 'exports', 'module' , 'gcli/types/resource', 'gcli/types', 'test/assert'], function(require, exports, module) {


var resource = require('gcli/types/resource');
var types = require('gcli/types');
var Status = require('gcli/types').Status;

var test = require('test/assert');

var tempDocument;

exports.setup = function(options) {
  tempDocument = resource.getDocument();
  resource.setDocument(options.window.document);
};

exports.shutdown = function(options) {
  resource.setDocument(tempDocument);
  tempDocument = undefined;
};

exports.testPredictions = function(options) {
  if (options.window.isFake || options.isFirefox) {
    test.log('Skipping resource tests: window.isFake || isFirefox');
    return;
  }

  var resource1 = types.getType('resource');
  var options1 = resource1.getLookup();
  test.ok(options1.length > 1, 'have resources');
  options1.forEach(function(prediction) {
    checkPrediction(resource1, prediction);
  });

  var resource2 = types.getType({ name: 'resource', include: 'text/javascript' });
  var options2 = resource2.getLookup();
  test.ok(options2.length > 1, 'have resources');
  options2.forEach(function(prediction) {
    checkPrediction(resource2, prediction);
  });

  var resource3 = types.getType({ name: 'resource', include: 'text/css' });
  var options3 = resource3.getLookup();
  // jsdom fails to support digging into stylesheets
  if (!options.isNode) {
    test.ok(options3.length >= 1, 'have resources');
  }
  else {
    test.log('Running under Node. ' +
             'Skipping checks due to jsdom document.stylsheets support.');
  }
  options3.forEach(function(prediction) {
    checkPrediction(resource3, prediction);
  });

  var resource4 = types.getType({ name: 'resource' });
  var options4 = resource4.getLookup();

  test.is(options1.length, options4.length, 'type spec');
  test.is(options2.length + options3.length, options4.length, 'split');
};

function checkPrediction(res, prediction) {
  var name = prediction.name;
  var value = prediction.value;

  var conversion = res.parseString(name);
  test.is(conversion.getStatus(), Status.VALID, 'status VALID for ' + name);
  test.is(conversion.value, value, 'value for ' + name);

  var strung = res.stringify(value);
  test.is(strung, name, 'stringify for ' + name);

  test.is(typeof value.loadContents, 'function', 'resource for ' + name);
  test.is(typeof value.element, 'object', 'resource for ' + name);
}

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testScratchpad', ['require', 'exports', 'module' , 'test/assert'], function(require, exports, module) {


var test = require('test/assert');

var origScratchpad;

exports.setup = function(options) {
  if (options.display) {
    origScratchpad = options.display.inputter.scratchpad;
    options.display.inputter.scratchpad = stubScratchpad;
  }
};

exports.shutdown = function(options) {
  if (options.display) {
    options.display.inputter.scratchpad = origScratchpad;
  }
};

var stubScratchpad = {
  shouldActivate: function(ev) {
    return true;
  },
  activatedCount: 0,
  linkText: 'scratchpad.linkText'
};
stubScratchpad.activate = function(value) {
  stubScratchpad.activatedCount++;
  return true;
};


exports.testActivate = function(options) {
  if (!options.display) {
    test.log('No display. Skipping scratchpad tests');
    return;
  }

  var ev = {};
  stubScratchpad.activatedCount = 0;
  options.display.inputter.onKeyUp(ev);
  test.is(1, stubScratchpad.activatedCount, 'scratchpad is activated');
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testSettings', ['require', 'exports', 'module' , 'gclitest/mockSettings', 'test/assert'], function(require, exports, module) {


var mockSettings = require('gclitest/mockSettings');
var test = require('test/assert');


exports.setup = function(options) {
  if (!options.isFirefox) {
    mockSettings.setup();
  }
  else {
    test.log('Skipping testSettings in Firefox.');
  }
};

exports.shutdown = function(options) {
  if (!options.isFirefox) {
    mockSettings.shutdown();
  }
};

exports.testChange = function(options) {
  if (options.isFirefox) {
    test.log('Skipping testPref in Firefox.');
    return;
  }

  mockSettings.tempTBool.setDefault();
  mockSettings.tempFBool.setDefault();
  mockSettings.tempUString.setDefault();
  mockSettings.tempNString.setDefault();
  mockSettings.tempQString.setDefault();
  mockSettings.tempNumber.setDefault();
  mockSettings.tempSelection.setDefault();

  test.is(mockSettings.tempTBool.value, true, 'tempTBool default');
  test.is(mockSettings.tempFBool.value, false, 'tempFBool default');
  test.is(mockSettings.tempUString.value, undefined, 'tempUString default');
  test.is(mockSettings.tempNString.value, null, 'tempNString default');
  test.is(mockSettings.tempQString.value, 'q', 'tempQString default');
  test.is(mockSettings.tempNumber.value, 42, 'tempNumber default');
  test.is(mockSettings.tempSelection.value, 'a', 'tempSelection default');

  function tempTBoolCheck(ev) {
    test.is(ev.setting, mockSettings.tempTBool, 'tempTBool event setting');
    test.is(ev.value, false, 'tempTBool event value');
    test.is(ev.setting.value, false, 'tempTBool event setting value');
  }
  mockSettings.tempTBool.onChange.add(tempTBoolCheck);
  mockSettings.tempTBool.value = false;
  test.is(mockSettings.tempTBool.value, false, 'tempTBool change');

  function tempFBoolCheck(ev) {
    test.is(ev.setting, mockSettings.tempFBool, 'tempFBool event setting');
    test.is(ev.value, true, 'tempFBool event value');
    test.is(ev.setting.value, true, 'tempFBool event setting value');
  }
  mockSettings.tempFBool.onChange.add(tempFBoolCheck);
  mockSettings.tempFBool.value = true;
  test.is(mockSettings.tempFBool.value, true, 'tempFBool change');

  function tempUStringCheck(ev) {
    test.is(ev.setting, mockSettings.tempUString, 'tempUString event setting');
    test.is(ev.value, 'x', 'tempUString event value');
    test.is(ev.setting.value, 'x', 'tempUString event setting value');
  }
  mockSettings.tempUString.onChange.add(tempUStringCheck);
  mockSettings.tempUString.value = 'x';
  test.is(mockSettings.tempUString.value, 'x', 'tempUString change');

  function tempNStringCheck(ev) {
    test.is(ev.setting, mockSettings.tempNString, 'tempNString event setting');
    test.is(ev.value, 'y', 'tempNString event value');
    test.is(ev.setting.value, 'y', 'tempNString event setting value');
  }
  mockSettings.tempNString.onChange.add(tempNStringCheck);
  mockSettings.tempNString.value = 'y';
  test.is(mockSettings.tempNString.value, 'y', 'tempNString change');

  function tempQStringCheck(ev) {
    test.is(ev.setting, mockSettings.tempQString, 'tempQString event setting');
    test.is(ev.value, 'qq', 'tempQString event value');
    test.is(ev.setting.value, 'qq', 'tempQString event setting value');
  }
  mockSettings.tempQString.onChange.add(tempQStringCheck);
  mockSettings.tempQString.value = 'qq';
  test.is(mockSettings.tempQString.value, 'qq', 'tempQString change');

  function tempNumberCheck(ev) {
    test.is(ev.setting, mockSettings.tempNumber, 'tempNumber event setting');
    test.is(ev.value, -1, 'tempNumber event value');
    test.is(ev.setting.value, -1, 'tempNumber event setting value');
  }
  mockSettings.tempNumber.onChange.add(tempNumberCheck);
  mockSettings.tempNumber.value = -1;
  test.is(mockSettings.tempNumber.value, -1, 'tempNumber change');

  function tempSelectionCheck(ev) {
    test.is(ev.setting, mockSettings.tempSelection, 'tempSelection event setting');
    test.is(ev.value, 'b', 'tempSelection event value');
    test.is(ev.setting.value, 'b', 'tempSelection event setting value');
  }
  mockSettings.tempSelection.onChange.add(tempSelectionCheck);
  mockSettings.tempSelection.value = 'b';
  test.is(mockSettings.tempSelection.value, 'b', 'tempSelection change');

  mockSettings.tempTBool.onChange.remove(tempTBoolCheck);
  mockSettings.tempFBool.onChange.remove(tempFBoolCheck);
  mockSettings.tempUString.onChange.remove(tempUStringCheck);
  mockSettings.tempNString.onChange.remove(tempNStringCheck);
  mockSettings.tempQString.onChange.remove(tempQStringCheck);
  mockSettings.tempNumber.onChange.remove(tempNumberCheck);
  mockSettings.tempSelection.onChange.remove(tempSelectionCheck);

  function tempNStringReCheck(ev) {
    test.is(ev.setting, mockSettings.tempNString, 'tempNString event reset');
    test.is(ev.value, null, 'tempNString event revalue');
    test.is(ev.setting.value, null, 'tempNString event setting revalue');
  }
  mockSettings.tempNString.onChange.add(tempNStringReCheck);

  mockSettings.tempTBool.setDefault();
  mockSettings.tempFBool.setDefault();
  mockSettings.tempUString.setDefault();
  mockSettings.tempNString.setDefault();
  mockSettings.tempQString.setDefault();
  mockSettings.tempNumber.setDefault();
  mockSettings.tempSelection.setDefault();

  mockSettings.tempNString.onChange.remove(tempNStringReCheck);

  test.is(mockSettings.tempTBool.value, true, 'tempTBool reset');
  test.is(mockSettings.tempFBool.value, false, 'tempFBool reset');
  test.is(mockSettings.tempUString.value, undefined, 'tempUString reset');
  test.is(mockSettings.tempNString.value, null, 'tempNString reset');
  test.is(mockSettings.tempQString.value, 'q', 'tempQString reset');
  test.is(mockSettings.tempNumber.value, 42, 'tempNumber reset');
  test.is(mockSettings.tempSelection.value, 'a', 'tempSelection reset');
};


});
/*
 * Copyright (c) 2009 Panagiotis Astithas
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

define('gclitest/testSpell', ['require', 'exports', 'module' , 'test/assert', 'gcli/types/spell'], function(require, exports, module) {

var test = require('test/assert');
var Speller = require('gcli/types/spell').Speller;

exports.setup = function() {
};

exports.shutdown = function() {
};

exports.testSpellerSimple = function(options) {
  if (options.isFirefox) {
    test.log('Skipping testPref in Firefox.');
    return;
  }

  var speller = new Speller();
  speller.train(Object.keys(options.window));

  test.is(speller.correct('document'), 'document');
  test.is(speller.correct('documen'), 'document');
  test.is(speller.correct('ocument'), 'document');
  test.is(speller.correct('odcument'), 'document');

  test.is(speller.correct('========='), null);
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testSplit', ['require', 'exports', 'module' , 'test/assert', 'gclitest/mockCommands', 'gcli/cli', 'gcli/canon'], function(require, exports, module) {

var test = require('test/assert');

var mockCommands = require('gclitest/mockCommands');
var Requisition = require('gcli/cli').Requisition;
var canon = require('gcli/canon');

exports.setup = function() {
  mockCommands.setup();
};

exports.shutdown = function() {
  mockCommands.shutdown();
};

exports.testSplitSimple = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('s');
  requ._split(args);
  test.is(0, args.length);
  test.is('s', requ.commandAssignment.arg.text);
};

exports.testFlatCommand = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('tsv');
  requ._split(args);
  test.is(0, args.length);
  test.is('tsv', requ.commandAssignment.value.name);

  args = requ._tokenize('tsv a b');
  requ._split(args);
  test.is('tsv', requ.commandAssignment.value.name);
  test.is(2, args.length);
  test.is('a', args[0].text);
  test.is('b', args[1].text);
};

exports.testJavascript = function() {
  if (!canon.getCommand('{')) {
    test.log('Skipping testJavascript because { is not registered');
    return;
  }

  var args;
  var requ = new Requisition();

  args = requ._tokenize('{');
  requ._split(args);
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('', requ.commandAssignment.arg.text);
  test.is('{', requ.commandAssignment.value.name);
};

// BUG 663081 - add tests for sub commands

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testTokenize', ['require', 'exports', 'module' , 'test/assert', 'gcli/cli'], function(require, exports, module) {


var test = require('test/assert');
var Requisition = require('gcli/cli').Requisition;

exports.testBlanks = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);

  args = requ._tokenize(' ');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is(' ', args[0].prefix);
  test.is('', args[0].suffix);
};

exports.testTokSimple = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('s');
  test.is(1, args.length);
  test.is('s', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('Argument', args[0].type);

  args = requ._tokenize('s s');
  test.is(2, args.length);
  test.is('s', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('Argument', args[0].type);
  test.is('s', args[1].text);
  test.is(' ', args[1].prefix);
  test.is('', args[1].suffix);
  test.is('Argument', args[1].type);
};

exports.testJavascript = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{x}');
  test.is(1, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{ x }');
  test.is(1, args.length);
  test.is('x', args[0].text);
  test.is('{ ', args[0].prefix);
  test.is(' }', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{x} {y}');
  test.is(2, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);
  test.is('y', args[1].text);
  test.is(' {', args[1].prefix);
  test.is('}', args[1].suffix);
  test.is('ScriptArgument', args[1].type);

  args = requ._tokenize('{x}{y}');
  test.is(2, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);
  test.is('y', args[1].text);
  test.is('{', args[1].prefix);
  test.is('}', args[1].suffix);
  test.is('ScriptArgument', args[1].type);

  args = requ._tokenize('{');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('{', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{ ');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('{ ', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{x');
  test.is(1, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('ScriptArgument', args[0].type);
};

exports.testRegularNesting = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{"x"}');
  test.is(1, args.length);
  test.is('"x"', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{\'x\'}');
  test.is(1, args.length);
  test.is('\'x\'', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('"{x}"');
  test.is(1, args.length);
  test.is('{x}', args[0].text);
  test.is('"', args[0].prefix);
  test.is('"', args[0].suffix);
  test.is('Argument', args[0].type);

  args = requ._tokenize('\'{x}\'');
  test.is(1, args.length);
  test.is('{x}', args[0].text);
  test.is('\'', args[0].prefix);
  test.is('\'', args[0].suffix);
  test.is('Argument', args[0].type);
};

exports.testDeepNesting = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{{}}');
  test.is(1, args.length);
  test.is('{}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{{x} {y}}');
  test.is(1, args.length);
  test.is('{x} {y}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{{w} {{{x}}}} {y} {{{z}}}');

  test.is(3, args.length);

  test.is('{w} {{{x}}}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  test.is('y', args[1].text);
  test.is(' {', args[1].prefix);
  test.is('}', args[1].suffix);
  test.is('ScriptArgument', args[1].type);

  test.is('{{z}}', args[2].text);
  test.is(' {', args[2].prefix);
  test.is('}', args[2].suffix);
  test.is('ScriptArgument', args[2].type);

  args = requ._tokenize('{{w} {{{x}}} {y} {{{z}}}');

  test.is(1, args.length);

  test.is('{w} {{{x}}} {y} {{{z}}}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('ScriptArgument', args[0].type);
};

exports.testStrangeNesting = function() {
  var args;
  var requ = new Requisition();

  // Note: When we get real JS parsing this should break
  args = requ._tokenize('{"x}"}');

  test.is(2, args.length);

  test.is('"x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  test.is('}', args[1].text);
  test.is('"', args[1].prefix);
  test.is('', args[1].suffix);
  test.is('Argument', args[1].type);
};

exports.testComplex = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize(' 1234  \'12 34\'');

  test.is(2, args.length);

  test.is('1234', args[0].text);
  test.is(' ', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('Argument', args[0].type);

  test.is('12 34', args[1].text);
  test.is('  \'', args[1].prefix);
  test.is('\'', args[1].suffix);
  test.is('Argument', args[1].type);

  args = requ._tokenize('12\'34 "12 34" \\'); // 12'34 "12 34" \

  test.is(3, args.length);

  test.is('12\'34', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('Argument', args[0].type);

  test.is('12 34', args[1].text);
  test.is(' "', args[1].prefix);
  test.is('"', args[1].suffix);
  test.is('Argument', args[1].type);

  test.is('\\', args[2].text);
  test.is(' ', args[2].prefix);
  test.is('', args[2].suffix);
  test.is('Argument', args[2].type);
};

exports.testPathological = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('a\\ b \\t\\n\\r \\\'x\\\" \'d'); // a_b \t\n\r \'x\" 'd

  test.is(4, args.length);

  test.is('a b', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('Argument', args[0].type);

  test.is('\t\n\r', args[1].text);
  test.is(' ', args[1].prefix);
  test.is('', args[1].suffix);
  test.is('Argument', args[1].type);

  test.is('\'x"', args[2].text);
  test.is(' ', args[2].prefix);
  test.is('', args[2].suffix);
  test.is('Argument', args[2].type);

  test.is('d', args[3].text);
  test.is(' \'', args[3].prefix);
  test.is('', args[3].suffix);
  test.is('Argument', args[3].type);
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testTooltip', ['require', 'exports', 'module' , 'test/assert', 'gclitest/mockCommands'], function(require, exports, module) {


var test = require('test/assert');
var mockCommands = require('gclitest/mockCommands');


exports.setup = function() {
  mockCommands.setup();
};

exports.shutdown = function() {
  mockCommands.shutdown();
};


function type(typed, tests, options) {
  var inputter = options.display.inputter;
  var tooltip = options.display.tooltip;

  inputter.setInput(typed);
  if (tests.cursor) {
    inputter.setCursor({ start: tests.cursor, end: tests.cursor });
  }

  if (!options.isNode) {
    if (tests.important) {
      test.ok(tooltip.field.isImportant, 'Important for ' + typed);
    }
    else {
      test.ok(!tooltip.field.isImportant, 'Not important for ' + typed);
    }

    if (tests.options) {
      var names = tooltip.field.menu.items.map(function(item) {
        return item.name.textContent ? item.name.textContent : item.name;
      });
      test.is(tests.options.join('|'), names.join('|'), 'Options for ' + typed);
    }

    if (tests.error) {
      test.is(tests.error, tooltip.errorEle.textContent, 'Error for ' + typed);
    }
    else {
      test.is('', tooltip.errorEle.textContent, 'No error for ' + typed);
    }
  }
}

exports.testActivate = function(options) {
  if (!options.display) {
    test.log('No display. Skipping activate tests');
    return;
  }

  if (options.isNode) {
    test.log('Running under Node. Reduced checks due to JSDom.textContent');
  }

  type(' ', { }, options);

  type('tsb ', {
    important: true,
    options: [ 'false', 'true' ]
  }, options);

  type('tsb t', {
    important: true,
    options: [ 'true' ]
  }, options);

  type('tsb tt', {
    important: true,
    options: [ ],
    error: 'Can\'t use \'tt\'.'
  }, options);


  type('asdf', {
    important: false,
    options: [ ],
    error: 'Can\'t use \'asdf\'.'
  }, options);

  type('', { }, options);
};


});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testTypes', ['require', 'exports', 'module' , 'test/assert', 'gcli/types'], function(require, exports, module) {

var test = require('test/assert');
var types = require('gcli/types');

exports.setup = function() {
};

exports.shutdown = function() {
};

function forEachType(options, callback) {
  types.getTypeNames().forEach(function(name) {
    options.name = name;

    // Provide some basic defaults to help selection/deferred/array work
    if (name === 'selection') {
      options.data = [ 'a', 'b' ];
    }
    else if (name === 'deferred') {
      options.defer = function() {
        return types.getType('string');
      };
    }
    else if (name === 'array') {
      options.subtype = 'string';
    }

    var type = types.getType(options);
    callback(type);
  });
}

exports.testDefault = function(options) {
  if (options.isNode) {
    test.log('Running under Node. ' +
             'Skipping tests due to issues with resource type.');
    return;
  }

  forEachType({}, function(type) {
    var blank = type.getBlank().value;

    // boolean and array types are exempt from needing undefined blank values
    if (type.name === 'boolean') {
      test.is(blank, false, 'blank boolean is false');
    }
    else if (type.name === 'array') {
      test.ok(Array.isArray(blank), 'blank array is array');
      test.is(blank.length, 0, 'blank array is empty');
    }
    else if (type.name === 'nodelist') {
      test.ok(typeof blank.item, 'function', 'blank.item is function');
      test.is(blank.length, 0, 'blank nodelist is empty');
    }
    else {
      test.is(blank, undefined, 'default defined for ' + type.name);
    }
  });
};

exports.testNullDefault = function(options) {
  forEachType({ defaultValue: null }, function(type) {
    test.is(type.stringify(null), '', 'stringify(null) for ' + type.name);
  });
};

});
/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define('gclitest/testUtil', ['require', 'exports', 'module' , 'gcli/util', 'test/assert'], function(require, exports, module) {

var util = require('gcli/util');
var test = require('test/assert');

exports.testFindCssSelector = function(options) {
  if (options.window.isFake) {
    test.log('Skipping dom.findCssSelector tests due to window.isFake');
    return;
  }

  var nodes = options.window.document.querySelectorAll('*');
  for (var i = 0; i < nodes.length; i++) {
    var selector = util.findCssSelector(nodes[i]);
    var matches = options.window.document.querySelectorAll(selector);

    test.is(matches.length, 1, 'multiple matches for ' + selector);
    test.is(matches[0], nodes[i], 'non-matching selector: ' + selector);
  }
};


});
define("text!/gcli/commands/pref_list_edit.png", [], "data:image/png;base64,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");

define("text!/gcli/ui/images/closer.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAj9JREFUeNp0ks+LUlEUx7/vV1o8Z8wUx3IEHcQmiBiQlomjRNCiZpEuEqF/oEUwq/6EhvoHggmRcJUQBM1CRJAW0aLIaGQimZJxJsWxyV/P9/R1zzWlFl04vPvOPZ9z7rnnK5imidmKRCIq+zxgdoPZ1T/ut8xeM3tcKpW6s1hhBkaj0Qj7bDebTX+324WmadxvsVigqipcLleN/d4rFoulORiLxTZY8ItOp8MBCpYkiYPj8Xjus9vtlORWoVB4KcTjcQc732dLpSRXvCZaAws6Q4WDdqsO52kNH+oCRFGEz+f7ydwBKRgMPmTXi49GI1x2D/DsznesB06ws2eDbI7w9HYN6bVjvGss4KAjwDAMq81mM2SW5Wa/3weBbz42UL9uYnVpiO2Nr9ANHSGXib2Wgm9tCYIggGKJEVkvlwgi5/FQRmTLxO6hgJVzI1x0T/fJrBtHJxPeL6tI/fsZLA6ot8lkQi8HRVbw94gkWYI5MaHrOjcCGSNRxZosy9y5cErDzn0Dqx7gcwO8WtBp4PndI35GMYqiUMUvBL5yOBz8yRfFNpbPmqgcCFh/IuHa1nR/YXGM8+oUpFhihEQiwcdRLpfVRqOBtWXWq34Gra6AXq8Hp2piZcmKT4cKnE4nwuHwdByVSmWQz+d32WCTlHG/qaHHREN9kgi0sYQfv0R4PB4EAgESQDKXy72fSy6VSnHJVatVf71eR7vd5n66mtfrRSgU4pLLZrOlf7RKK51Ok8g3/yPyR5lMZi7y3wIMAME4EigHWgKnAAAAAElFTkSuQmCC");

define("text!/gcli/ui/images/dot_clear.gif", [], "data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAEBMgA7");

define("text!/gcli/ui/images/minus.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAAZiS0dEANIA0gDS7KbF4AAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kFGw4xMrIJw5EAAAHcSURBVCjPhZIxSxtxGMZ/976XhJA/RA5EAyJcFksnp64hjUPBoXRyCYLQTyD0UxScu0nFwalCQSgFCVk7dXAwUAiBDA2RO4W7yN1x9+9gcyhU+pteHt4H3pfncay1LOl0OgY4BN4Ar/7KP4BvwNFwOIyWu87S2O12O8DxfD73oygiSRIAarUaxhhWV1fHwMFgMBiWxl6v9y6Koi+3t7ckSUKtVkNVAcjzvNRWVlYwxry9vLz86uzs7HjAZDKZGGstjUaDfxHHMSLC5ubmHdB2VfVwNpuZ5clxHPMcRVFwc3PTXFtbO3RFZHexWJCmabnweAaoVqvlv4vFAhHZdVX1ZZqmOI5DURR8fz/lxbp9Yrz+7bD72SfPcwBU1XdF5N5aWy2KgqIoeBzPEnWVLMseYnAcRERdVR27rrsdxzGqyutP6898+GBsNBqo6i9XVS88z9sOggAR4X94noeqXoiIHPm+H9XrdYIgIAxDwjAkTVPCMESzBy3LMprNJr7v34nIkV5dXd2fn59fG2P2siwjSRIqlQrWWlSVJFcqlQqtVot2u40xZu/s7OxnWbl+v98BjkejkT+dTgmCoDxtY2ODra2tMXBweno6fNJVgP39fQN8eKbkH09OTsqS/wHFRdHPfTSfjwAAAABJRU5ErkJggg==");

define("text!/gcli/ui/images/pinaction.png", [], "data:image/png;base64,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");

define("text!/gcli/ui/images/pinin.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC7mlDQ1BJQ0MgUHJvZmlsZQAAeAGFVM9rE0EU/jZuqdAiCFprDrJ4kCJJWatoRdQ2/RFiawzbH7ZFkGQzSdZuNuvuJrWliOTi0SreRe2hB/+AHnrwZC9KhVpFKN6rKGKhFy3xzW5MtqXqwM5+8943731vdt8ADXLSNPWABOQNx1KiEWlsfEJq/IgAjqIJQTQlVdvsTiQGQYNz+Xvn2HoPgVtWw3v7d7J3rZrStpoHhP1A4Eea2Sqw7xdxClkSAog836Epx3QI3+PY8uyPOU55eMG1Dys9xFkifEA1Lc5/TbhTzSXTQINIOJT1cVI+nNeLlNcdB2luZsbIEL1PkKa7zO6rYqGcTvYOkL2d9H5Os94+wiHCCxmtP0a4jZ71jNU/4mHhpObEhj0cGDX0+GAVtxqp+DXCFF8QTSeiVHHZLg3xmK79VvJKgnCQOMpkYYBzWkhP10xu+LqHBX0m1xOv4ndWUeF5jxNn3tTd70XaAq8wDh0MGgyaDUhQEEUEYZiwUECGPBoxNLJyPyOrBhuTezJ1JGq7dGJEsUF7Ntw9t1Gk3Tz+KCJxlEO1CJL8Qf4qr8lP5Xn5y1yw2Fb3lK2bmrry4DvF5Zm5Gh7X08jjc01efJXUdpNXR5aseXq8muwaP+xXlzHmgjWPxHOw+/EtX5XMlymMFMXjVfPqS4R1WjE3359sfzs94i7PLrXWc62JizdWm5dn/WpI++6qvJPmVflPXvXx/GfNxGPiKTEmdornIYmXxS7xkthLqwviYG3HCJ2VhinSbZH6JNVgYJq89S9dP1t4vUZ/DPVRlBnM0lSJ93/CKmQ0nbkOb/qP28f8F+T3iuefKAIvbODImbptU3HvEKFlpW5zrgIXv9F98LZua6N+OPwEWDyrFq1SNZ8gvAEcdod6HugpmNOWls05Uocsn5O66cpiUsxQ20NSUtcl12VLFrOZVWLpdtiZ0x1uHKE5QvfEp0plk/qv8RGw/bBS+fmsUtl+ThrWgZf6b8C8/UXAeIuJAAAACXBIWXMAAAsTAAALEwEAmpwYAAABZ0lEQVQ4Ea2TPUsDQRCGZ89Eo4FACkULEQs1CH4Uamfjn7GxEYJFIFXgChFsbPwzNnZioREkaiHBQtEiEEiMRm/dZ8OEGAxR4sBxx877Pju7M2estTJIxLrNuVwuMxQEx0ZkzcFHyRtjXt02559RtB2GYanTYzoryOfz+6l4Nbszf2niwffKmpGRo9sVW22mDgqFwp5C2gDMm+P32a3JB1N+n5JifUGeP9JeNxGryPLYjcwMP8rJ07Q9fZltQzyAstOJ2vVu5sKc1ZZkRBrOcKeb+HexPidvkpCN5JUcllZtpZFc5DgBWc5M2eysZuMuofMBSA4NWjx4PUCsXefMlI0QY3ewRg4NWi4ZTQsgrjYXema+e4VqtEMK6KXvu+4B9Bklt90vVKMeD2BI6DOt4rZ/Gk7WyKFBi4fNPIAJY0joM61SCCZ9tI1o0OIB8D+DBIkYaJRbCBH9mZgNt+bb++ufSSF/eX8BYcDeAzuQJVUAAAAASUVORK5CYII=");

define("text!/gcli/ui/images/pinout.png", [], "data:image/png;base64,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");

define("text!/gcli/ui/images/pins.png", [], "data:image/png;base64,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");

define("text!/gcli/ui/images/plus.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAAZiS0dEANIA0gDS7KbF4AAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kFGw4yFTwuJTkAAAH7SURBVCjPdZKxa1NRFMZ/956XZMgFyyMlCZRA4hBx6lBcQ00GoYi4tEstFPwLAs7iLDi7FWuHThaUggihBDI5OWRoQAmBQFISQgvvpbwX3rsOaR4K+o2H8zvfOZxPWWtZqVarGaAJPAEe3ZW/A1+Bd+1221v1qhW4vb1dA44mk0nZ8zyCIAAgk8lgjGF9fb0PHF5cXLQTsF6vP/c879P19TVBEJDJZBARAKIoSmpra2sYY561Wq3PqtFouMBgMBgYay3ZbJZ/yfd9tNaUSqUboOKISPPq6sqsVvZ9H4AvL34B8PTj/QSO45jpdHovn883Ha31znw+JwzDpCEMQx4UloM8zyOdTif3zudztNY7jog8DMMQpRRxHPPt5TCBAEZvxlyOFTsfykRRBICIlB2t9a21Nh3HMXEc8+d7VhJHWCwWyzcohdZaHBHpO46z6fs+IsLj94XECaD4unCHL8FsNouI/HRE5Nx13c3ZbIbWOnG5HKtl+53TSq7rIiLnand31wUGnU7HjEYjlFLJZN/3yRnL1FMYY8jlcmxtbd0AFel2u7dnZ2eXxpi9xWJBEASkUimstYgIQSSkUimKxSKVSgVjzN7p6emPJHL7+/s14KjX65WHwyGz2SxZbWNjg2q12gcOT05O2n9lFeDg4MAAr/4T8rfHx8dJyH8DvvbYGzKvWukAAAAASUVORK5CYII=");

define("text!/gcli/ui/images/throbber.gif", [], "data:image/gif;base64,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");

