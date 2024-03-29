/*!
 * CanJS - 2.1.0-pre
 * http://canjs.us/
 * Copyright (c) 2014 Bitovi
 * Fri, 11 Apr 2014 19:07:25 GMT
 * Licensed MIT
 * Includes: can/map/lazy
 * Download from: http://canjs.com
 */
(function(undefined) {

    // ## map/lazy/bubble.js
    var __m9 = (function(can) {
        var bubble = can.bubble;

        return can.extend({}, bubble, {
                childrenOf: function(parentMap, eventName) {
                    if (parentMap._nestedReference) {
                        parentMap._nestedReference.each(function(child, ref) {
                            if (child && child.bind) {
                                bubble.toParent(child, parentMap, ref(), eventName);
                            }
                        });
                    } else {
                        bubble._each.apply(this, arguments);
                    }
                }
            });
    })(window.can, undefined);

    // ## map/lazy/nested_reference.js
    var __m17 = (function(can) {

        // iterates through `propPath`
        // and calls `callback` with current object and path part
        var pathIterator = function(root, propPath, callback) {
            var props = propPath.split("."),
                cur = root,
                part;
            while (part = props.shift()) {
                cur = cur[part];
                if (callback) {
                    callback(cur, part);
                }
            }
            return cur;
        };

        // has `array` and `item` props, toString() returns item's index in `array`
        var ArrIndex = function(array) {
            this.array = array;
        };
        ArrIndex.prototype.toString = function() {
            return "" + can.inArray(this.item, this.array);
        };

        // `root` points to actual data
        // `references` keeps path functions to certain nodes within `root`
        var NestedReference = function(root) {
            this.root = root;
            this.references = [];
        };

        NestedReference.ArrIndex = ArrIndex;

        can.extend(NestedReference.prototype, {

                // pushes path func to `references`
                make: function(propPath) {
                    var path = [], // holds path elements
                        arrIndex;

                    if (can.isArray(this.root) || this.root instanceof can.LazyList) {
                        arrIndex = new ArrIndex(this.root);
                    }

                    // iter through `propPath` and keep path elements in `path`
                    pathIterator(this.root, propPath, function(item, prop) {
                        if (arrIndex) {
                            arrIndex.item = item;
                            path.push(arrIndex);
                            arrIndex = undefined;
                        } else {
                            path.push(prop);
                            if (can.isArray(item)) {
                                arrIndex = new ArrIndex(item);
                            }
                        }
                    });

                    // finally push path func to references and return
                    var pathFunc = function() {
                        return path.join(".");
                    };

                    this.references.push(pathFunc);
                    return pathFunc;
                },

                // removes all references that starts with `path`
                // calls `callback` with object on the current path and path itself
                removeChildren: function(path, callback) {
                    var i = 0;
                    while (i < this.references.length) {
                        var reference = this.references[i]();
                        if (reference.indexOf(path) === 0) {
                            callback(this.get(reference), reference);
                            this.references.splice(i, 1);
                        } else {
                            i++;
                        }
                    }
                },

                // returns node on the `path`
                get: function(path) {
                    return pathIterator(this.root, path);
                },

                // iterates through references and calls `callback`
                // with actual object, path func and path
                each: function(callback) {
                    var self = this;
                    can.each(this.references, function(ref) {
                        var path = ref();
                        callback(self.get(path), ref, path);
                    });
                }

            });

        // expose
        can.NestedReference = NestedReference;
    })(window.can);

    // ## map/lazy/lazy.js
    var __m1 = (function(can, bubble) {
        can.LazyMap = can.Map.extend({
                _bubble: bubble
            }, {
                setup: function(obj) {
                    this.constructor.Map = this.constructor;
                    this.constructor.List = can.LazyList;

                    // `_data` is where we keep the properties.
                    this._data = can.extend(can.extend(true, {}, this.constructor.defaults || {}), obj);

                    // The namespace this `object` uses to listen to events.
                    can.cid(this, ".lazyMap");
                    // Sets all `attrs`.
                    this._init = 1;
                    this._setupComputes();
                    var teardownMapping = obj && can.Map.helpers.addToMap(obj, this);

                    // keep references to Observes in `_data`
                    this._nestedReference = new can.NestedReference(this._data);

                    if (teardownMapping) {
                        teardownMapping();
                    }

                    // Make the data directly accessible (if possible)
                    can.each(this._data, can.proxy(function(value, prop) {
                                this.___set(prop, value);
                            }, this));
                    this.bind('change', can.proxy(this._changes, this));

                    delete this._init;
                },

                // todo: function should be renamed
                _addChild: function(path, newChild, setNewChild) {
                    var self = this;

                    // remove 'old' references that are starting with `path` and do rewiring
                    this._nestedReference.removeChildren(path, function(oldChild, oldChildPath) {
                        // unhook every current child on path
                        bubble.remove(self, oldChild);

                        // if `newChild` passed bind it to every child and make references (1st step: rewiring to bottom/children)
                        if (newChild) {
                            var newChildPath = oldChildPath.replace(path + ".", "");

                            // check if we are replacing existing observe or inserting new one
                            if (path === newChildPath) {
                                oldChild._nestedReference.each(function(obj, path) {
                                    newChild._nestedReference.make(path());
                                    if (self._bindings) {
                                        bubble.add(this, newChild, path());
                                    }
                                });
                            } else {
                                var reference = newChild._nestedReference.make(newChildPath);
                                if (self._bindings) {
                                    bubble.add(oldChild, newChild, reference());
                                }
                            }

                        }
                    });

                    // callback
                    if (setNewChild) {
                        setNewChild();
                    }

                    // bind parent on `newChild` and make reference (2st step: rewiring to top/parent)
                    if (newChild) {
                        var reference = this._nestedReference.make(path);
                        if (this._bindings) {
                            bubble.add(this, newChild, reference());
                        }
                    }
                    return newChild;
                },

                removeAttr: function(attr) {
                    var data = this._goto(attr);

                    // if there are more attr parts remaining, it means we
                    // hit an internal observable
                    if (data.parts.length) {
                        // ask that observable to remove the attr
                        return data.value.removeAttr(data.parts.join("."));
                    } else {
                        // otherwise, are we removing a property from an array
                        if (can.isArray(data.parent)) {
                            data.parent.splice(data.prop, 1);
                            this._triggerChange(attr, "remove", undefined, [this.__type(data.value, data.prop)]);
                        } else {
                            // do not trigger if prop does not exists
                            if (data.parent[data.prop]) {
                                delete data.parent[data.prop];
                                can.batch.trigger(this, data.path.length ? data.path.join(".") + ".__keys" : "__keys");
                                this._triggerChange(attr, "remove", undefined, this.__type(data.value, data.prop));
                            }
                        }
                        // unhookup anything that was in here
                        //this._addChild(attr); // --> CHECK THIS ONE! (previous bug was causing this to work even if it shouldn't,)
                        // instead remove all references, do not unbind as _addChild does
                        this._nestedReference.removeChildren();
                        return data.value;
                    }
                },
                // walks to a property on the lazy map
                // if it finds an object, uses [] to follow properties
                // if it finds something else, it uses __get
                _goto: function(attr, keepKey) {
                    var parts = can.Map.helpers.attrParts(attr, keepKey).slice(0),
                        prev,
                        path = [],
                        part;

                    // are we dealing with list or map
                    var cur = this instanceof can.List ? this[parts.shift()] : this.__get();

                    // TODO we might also have to check for dot separated keys in each iteration
                    while (cur && !can.Map.helpers.isObservable(cur) && parts.length) {
                        if (part !== undefined) {
                            path.push(part);
                        }
                        prev = cur;
                        cur = cur[part = parts.shift()];
                    }

                    return {
                        parts: parts,
                        prop: part,
                        value: cur,
                        parent: prev,
                        path: path
                    };
                },
                // Reads a property from the `object`.
                _get: function(attr) {
                    var data = this._goto(attr);

                    // if it's already observe return it
                    if (can.Map.helpers.isObservable(data.value)) {
                        if (data.parts.length) {
                            return data.value._get(data.parts);
                        } else {
                            return data.value;
                        }
                    } else if (data.value && can.Map.helpers.canMakeObserve(data.value)) {
                        // if object create LazyMap/LazyList
                        var converted = this.__type(data.value, data.prop);
                        // ... and replace it
                        this._addChild(attr, converted, function() {
                            data.parent[data.prop] = converted;
                        });
                        return converted;
                    } else if (data.value !== undefined) {
                        // Return if we have a value
                        return data.value;
                    } else {
                        // Otherwise get it directly from this object
                        return this.__get(attr);
                    }
                },
                // Sets `attr` prop as value on this object where.
                // `attr` - Is a string of properties or an array  of property values.
                // `value` - The raw value to set.
                _set: function(attr, value, keepKey) {
                    var data = this._goto(attr, keepKey);
                    if (can.Map.helpers.isObservable(data.value) && data.parts.length) {
                        return data.value._set(data.parts, value);
                    } else if (!data.parts.length) {
                        this.__set(attr, value, data.value, data);
                    } else {
                        throw "can.LazyMap: object does not exist";
                    }
                },
                __set: function(prop, value, current, data, convert) {
                    // Otherwise, we are setting it on this `object`.
                    // are we changing the value.

                    // maybe not needed at all
                    convert = convert || true;

                    if (value !== current) {
                        // Check if we are adding this for the first time --
                        // if we are, we need to create an `add` event.

                        var changeType = data.parent.hasOwnProperty(data.prop) ? "set" : "add";

                        // if it is or should be a Lazy
                        if (convert && can.Map.helpers.canMakeObserve(value)) {
                            // make it a lazy
                            value = this.__type(value, prop);
                            var self = this;
                            // hook up it's bindings
                            this._addChild(prop, value, function() {
                                // set the value
                                self.___set(prop, value, data);
                            });
                        } else {
                            // just set the value
                            this.___set(prop, value, data);
                        }

                        if (changeType === "add") {
                            // If there is no current value, let others know that
                            // the the number of keys have changed

                            can.batch.trigger(this, data.path.length ? data.path.join(".") + ".__keys" : "__keys", undefined);

                        }
                        // `batchTrigger` the change event.
                        this._triggerChange(prop, changeType, value, current);
                    }
                },
                // Directly sets a property on this `object`.
                ___set: function(prop, val, data) {
                    if (this[prop] && this[prop].isComputed && can.isFunction(this.constructor.prototype[prop])) {
                        this[prop](val);
                    } else if (data) {
                        data.parent[data.prop] = val;
                    } else {
                        this._data[prop] = val;
                    }

                    // Add property directly for easy writing.
                    // Check if its on the `prototype` so we don't overwrite methods like `attrs`.
                    if (!(can.isFunction(this.constructor.prototype[prop]))) {
                        this[prop] = val;
                    }
                },

                _attrs: function(props, remove) {
                    if (props === undefined) {
                        return can.Map.helpers.serialize(this, 'attr', {});
                    }

                    props = can.extend({}, props);
                    var self = this,
                        prop,
                        data,
                        newVal;

                    can.batch.start();

                    // Update existing props
                    this.each(function(curVal, prop) {
                        newVal = props[prop];
                        data = self._goto(prop, true);

                        // remove existing prop and return if there is no new prop to merge and `remove` param exists
                        if (newVal === undefined) {
                            if (remove) {
                                self.removeAttr(prop);
                            }
                            return;
                        } else if (!can.Map.helpers.isObservable(curVal) && can.Map.helpers.canMakeObserve(curVal)) {
                            // convert curVal to observe
                            curVal = self.attr(prop);
                        }

                        if (self.__convert) {
                            newVal = self.__convert(prop, newVal);
                        }

                        // if we're dealing with models, want to call _set to let converter run
                        if (newVal instanceof can.Map) {
                            self.__set(prop, newVal, curVal, data);
                            // if its an object, let attr merge
                        } else if (can.Map.helpers.isObservable(curVal) && can.Map.helpers.canMakeObserve(newVal) && curVal.attr) {
                            curVal.attr(newVal, remove);
                            // otherwise just set
                        } else if (curVal !== newVal) {
                            // OK till here
                            self.__set(prop, newVal, curVal, data);
                        }

                        // delete passed prop after setting
                        delete props[prop];
                    });

                    // add remaining props
                    for (prop in props) {
                        newVal = props[prop];
                        this._set(prop, newVal, true);
                    }

                    can.batch.stop();
                    return this;
                }
            });

        can.LazyList = can.List.extend({
                Map: can.LazyMap
            }, {
                setup: function() {
                    can.List.prototype.setup.apply(this, arguments);
                    this._nestedReference = new can.NestedReference(this);
                }
            });

        return can.LazyMap;
    })(window.can, __m9, undefined, undefined, __m17);

})();