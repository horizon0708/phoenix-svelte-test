
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(component, store, callback) {
        const unsub = store.subscribe(callback);
        component.$$.on_destroy.push(unsub.unsubscribe
            ? () => unsub.unsubscribe()
            : unsub);
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var phoenix = createCommonjsModule(function (module, exports) {
    !function(e,t){module.exports=t();}(commonjsGlobal,function(){return function(e){var t={};function n(i){if(t[i])return t[i].exports;var o=t[i]={i:i,l:!1,exports:{}};return e[i].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,i){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:i});},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0});},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var i=Object.create(null);if(n.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(i,o,function(t){return e[t]}.bind(null,o));return i},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=0)}([function(e,t,n){(function(t){e.exports=t.Phoenix=n(2);}).call(this,n(1));},function(e,t){var n;n=function(){return this}();try{n=n||Function("return this")()||(0,eval)("this");}catch(e){"object"==typeof window&&(n=window);}e.exports=n;},function(e,t,n){function i(e){return function(e){if(Array.isArray(e)){for(var t=0,n=new Array(e.length);t<e.length;t++)n[t]=e[t];return n}}(e)||function(e){if(Symbol.iterator in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e))return Array.from(e)}(e)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}()}function o(e){return (o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function r(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var n=[],i=!0,o=!1,r=void 0;try{for(var s,a=e[Symbol.iterator]();!(i=(s=a.next()).done)&&(n.push(s.value),!t||n.length!==t);i=!0);}catch(e){o=!0,r=e;}finally{try{i||null==a.return||a.return();}finally{if(o)throw r}}return n}(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}function s(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function a(e,t){for(var n=0;n<t.length;n++){var i=t[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i);}}function c(e,t,n){return t&&a(e.prototype,t),n&&a(e,n),e}n.r(t),n.d(t,"Channel",function(){return b}),n.d(t,"Serializer",function(){return j}),n.d(t,"Socket",function(){return R}),n.d(t,"LongPoll",function(){return C}),n.d(t,"Ajax",function(){return T}),n.d(t,"Presence",function(){return w});var u="undefined"!=typeof self?self:null,h="undefined"!=typeof window?window:null,l=u||h||void 0,f={connecting:0,open:1,closing:2,closed:3},d=1e4,p={closed:"closed",errored:"errored",joined:"joined",joining:"joining",leaving:"leaving"},v={close:"phx_close",error:"phx_error",join:"phx_join",reply:"phx_reply",leave:"phx_leave"},y=[v.close,v.error,v.join,v.reply,v.leave],m={longpoll:"longpoll",websocket:"websocket"},g=function(e){if("function"==typeof e)return e;return function(){return e}},k=function(){function e(t,n,i,o){s(this,e),this.channel=t,this.event=n,this.payload=i||function(){return {}},this.receivedResp=null,this.timeout=o,this.timeoutTimer=null,this.recHooks=[],this.sent=!1;}return c(e,[{key:"resend",value:function(e){this.timeout=e,this.reset(),this.send();}},{key:"send",value:function(){this.hasReceived("timeout")||(this.startTimeout(),this.sent=!0,this.channel.socket.push({topic:this.channel.topic,event:this.event,payload:this.payload(),ref:this.ref,join_ref:this.channel.joinRef()}));}},{key:"receive",value:function(e,t){return this.hasReceived(e)&&t(this.receivedResp.response),this.recHooks.push({status:e,callback:t}),this}},{key:"reset",value:function(){this.cancelRefEvent(),this.ref=null,this.refEvent=null,this.receivedResp=null,this.sent=!1;}},{key:"matchReceive",value:function(e){var t=e.status,n=e.response;e.ref;this.recHooks.filter(function(e){return e.status===t}).forEach(function(e){return e.callback(n)});}},{key:"cancelRefEvent",value:function(){this.refEvent&&this.channel.off(this.refEvent);}},{key:"cancelTimeout",value:function(){clearTimeout(this.timeoutTimer),this.timeoutTimer=null;}},{key:"startTimeout",value:function(){var e=this;this.timeoutTimer&&this.cancelTimeout(),this.ref=this.channel.socket.makeRef(),this.refEvent=this.channel.replyEventName(this.ref),this.channel.on(this.refEvent,function(t){e.cancelRefEvent(),e.cancelTimeout(),e.receivedResp=t,e.matchReceive(t);}),this.timeoutTimer=setTimeout(function(){e.trigger("timeout",{});},this.timeout);}},{key:"hasReceived",value:function(e){return this.receivedResp&&this.receivedResp.status===e}},{key:"trigger",value:function(e,t){this.channel.trigger(this.refEvent,{status:e,response:t});}}]),e}(),b=function(){function e(t,n,i){var o=this;s(this,e),this.state=p.closed,this.topic=t,this.params=g(n||{}),this.socket=i,this.bindings=[],this.bindingRef=0,this.timeout=this.socket.timeout,this.joinedOnce=!1,this.joinPush=new k(this,v.join,this.params,this.timeout),this.pushBuffer=[],this.rejoinTimer=new E(function(){o.socket.isConnected()&&o.rejoin();},this.socket.rejoinAfterMs),this.socket.onError(function(){return o.rejoinTimer.reset()}),this.socket.onOpen(function(){o.rejoinTimer.reset(),o.isErrored()&&o.rejoin();}),this.joinPush.receive("ok",function(){o.state=p.joined,o.rejoinTimer.reset(),o.pushBuffer.forEach(function(e){return e.send()}),o.pushBuffer=[];}),this.joinPush.receive("error",function(){o.state=p.errored,o.socket.isConnected()&&o.rejoinTimer.scheduleTimeout();}),this.onClose(function(){o.rejoinTimer.reset(),o.socket.hasLogger()&&o.socket.log("channel","close ".concat(o.topic," ").concat(o.joinRef())),o.state=p.closed,o.socket.remove(o);}),this.onError(function(e){o.socket.hasLogger()&&o.socket.log("channel","error ".concat(o.topic),e),o.isJoining()&&o.joinPush.reset(),o.state=p.errored,o.socket.isConnected()&&o.rejoinTimer.scheduleTimeout();}),this.joinPush.receive("timeout",function(){o.socket.hasLogger()&&o.socket.log("channel","timeout ".concat(o.topic," (").concat(o.joinRef(),")"),o.joinPush.timeout),new k(o,v.leave,g({}),o.timeout).send(),o.state=p.errored,o.joinPush.reset(),o.socket.isConnected()&&o.rejoinTimer.scheduleTimeout();}),this.on(v.reply,function(e,t){o.trigger(o.replyEventName(t),e);});}return c(e,[{key:"join",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.timeout;if(this.joinedOnce)throw new Error("tried to join multiple times. 'join' can only be called a single time per channel instance");return this.timeout=e,this.joinedOnce=!0,this.rejoin(),this.joinPush}},{key:"onClose",value:function(e){this.on(v.close,e);}},{key:"onError",value:function(e){return this.on(v.error,function(t){return e(t)})}},{key:"on",value:function(e,t){var n=this.bindingRef++;return this.bindings.push({event:e,ref:n,callback:t}),n}},{key:"off",value:function(e,t){this.bindings=this.bindings.filter(function(n){return !(n.event===e&&(void 0===t||t===n.ref))});}},{key:"canPush",value:function(){return this.socket.isConnected()&&this.isJoined()}},{key:"push",value:function(e,t){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:this.timeout;if(!this.joinedOnce)throw new Error("tried to push '".concat(e,"' to '").concat(this.topic,"' before joining. Use channel.join() before pushing events"));var i=new k(this,e,function(){return t},n);return this.canPush()?i.send():(i.startTimeout(),this.pushBuffer.push(i)),i}},{key:"leave",value:function(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.timeout;this.rejoinTimer.reset(),this.joinPush.cancelTimeout(),this.state=p.leaving;var n=function(){e.socket.hasLogger()&&e.socket.log("channel","leave ".concat(e.topic)),e.trigger(v.close,"leave");},i=new k(this,v.leave,g({}),t);return i.receive("ok",function(){return n()}).receive("timeout",function(){return n()}),i.send(),this.canPush()||i.trigger("ok",{}),i}},{key:"onMessage",value:function(e,t,n){return t}},{key:"isLifecycleEvent",value:function(e){return y.indexOf(e)>=0}},{key:"isMember",value:function(e,t,n,i){return this.topic===e&&(!i||i===this.joinRef()||!this.isLifecycleEvent(t)||(this.socket.hasLogger()&&this.socket.log("channel","dropping outdated message",{topic:e,event:t,payload:n,joinRef:i}),!1))}},{key:"joinRef",value:function(){return this.joinPush.ref}},{key:"sendJoin",value:function(e){this.state=p.joining,this.joinPush.resend(e);}},{key:"rejoin",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.timeout;this.isLeaving()||this.sendJoin(e);}},{key:"trigger",value:function(e,t,n,i){var o=this.onMessage(e,t,n,i);if(t&&!o)throw new Error("channel onMessage callbacks must return the payload, modified or unmodified");for(var r=0;r<this.bindings.length;r++){var s=this.bindings[r];s.event===e&&s.callback(o,n,i||this.joinRef());}}},{key:"replyEventName",value:function(e){return "chan_reply_".concat(e)}},{key:"isClosed",value:function(){return this.state===p.closed}},{key:"isErrored",value:function(){return this.state===p.errored}},{key:"isJoined",value:function(){return this.state===p.joined}},{key:"isJoining",value:function(){return this.state===p.joining}},{key:"isLeaving",value:function(){return this.state===p.leaving}}]),e}(),j={encode:function(e,t){var n=[e.join_ref,e.ref,e.topic,e.event,e.payload];return t(JSON.stringify(n))},decode:function(e,t){var n=r(JSON.parse(e),5);return t({join_ref:n[0],ref:n[1],topic:n[2],event:n[3],payload:n[4]})}},R=function(){function e(t){var n=this,i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};s(this,e),this.stateChangeCallbacks={open:[],close:[],error:[],message:[]},this.channels=[],this.sendBuffer=[],this.ref=0,this.timeout=i.timeout||d,this.transport=i.transport||l.WebSocket||C,this.defaultEncoder=j.encode,this.defaultDecoder=j.decode,this.closeWasClean=!1,this.unloaded=!1,this.binaryType=i.binaryType||"arraybuffer",this.transport!==C?(this.encode=i.encode||this.defaultEncoder,this.decode=i.decode||this.defaultDecoder):(this.encode=this.defaultEncoder,this.decode=this.defaultDecoder),h&&h.addEventListener&&h.addEventListener("beforeunload",function(e){n.conn&&(n.unloaded=!0,n.abnormalClose("unloaded"));}),this.heartbeatIntervalMs=i.heartbeatIntervalMs||3e4,this.rejoinAfterMs=function(e){return i.rejoinAfterMs?i.rejoinAfterMs(e):[1e3,2e3,5e3][e-1]||1e4},this.reconnectAfterMs=function(e){return n.unloaded?100:i.reconnectAfterMs?i.reconnectAfterMs(e):[10,50,100,150,200,250,500,1e3,2e3][e-1]||5e3},this.logger=i.logger||null,this.longpollerTimeout=i.longpollerTimeout||2e4,this.params=g(i.params||{}),this.endPoint="".concat(t,"/").concat(m.websocket),this.heartbeatTimer=null,this.pendingHeartbeatRef=null,this.reconnectTimer=new E(function(){n.teardown(function(){return n.connect()});},this.reconnectAfterMs);}return c(e,[{key:"protocol",value:function(){return location.protocol.match(/^https/)?"wss":"ws"}},{key:"endPointURL",value:function(){var e=T.appendParams(T.appendParams(this.endPoint,this.params()),{vsn:"2.0.0"});return "/"!==e.charAt(0)?e:"/"===e.charAt(1)?"".concat(this.protocol(),":").concat(e):"".concat(this.protocol(),"://").concat(location.host).concat(e)}},{key:"disconnect",value:function(e,t,n){this.closeWasClean=!0,this.reconnectTimer.reset(),this.teardown(e,t,n);}},{key:"connect",value:function(e){var t=this;e&&(console&&console.log("passing params to connect is deprecated. Instead pass :params to the Socket constructor"),this.params=g(e)),this.conn||(this.closeWasClean=!1,this.conn=new this.transport(this.endPointURL()),this.conn.binaryType=this.binaryType,this.conn.timeout=this.longpollerTimeout,this.conn.onopen=function(){return t.onConnOpen()},this.conn.onerror=function(e){return t.onConnError(e)},this.conn.onmessage=function(e){return t.onConnMessage(e)},this.conn.onclose=function(e){return t.onConnClose(e)});}},{key:"log",value:function(e,t,n){this.logger(e,t,n);}},{key:"hasLogger",value:function(){return null!==this.logger}},{key:"onOpen",value:function(e){this.stateChangeCallbacks.open.push(e);}},{key:"onClose",value:function(e){this.stateChangeCallbacks.close.push(e);}},{key:"onError",value:function(e){this.stateChangeCallbacks.error.push(e);}},{key:"onMessage",value:function(e){this.stateChangeCallbacks.message.push(e);}},{key:"onConnOpen",value:function(){this.hasLogger()&&this.log("transport","connected to ".concat(this.endPointURL())),this.unloaded=!1,this.closeWasClean=!1,this.flushSendBuffer(),this.reconnectTimer.reset(),this.resetHeartbeat(),this.stateChangeCallbacks.open.forEach(function(e){return e()});}},{key:"resetHeartbeat",value:function(){var e=this;this.conn&&this.conn.skipHeartbeat||(this.pendingHeartbeatRef=null,clearInterval(this.heartbeatTimer),this.heartbeatTimer=setInterval(function(){return e.sendHeartbeat()},this.heartbeatIntervalMs));}},{key:"teardown",value:function(e,t,n){this.conn&&(this.conn.onclose=function(){},t?this.conn.close(t,n||""):this.conn.close(),this.conn=null),e&&e();}},{key:"onConnClose",value:function(e){this.hasLogger()&&this.log("transport","close",e),this.triggerChanError(),clearInterval(this.heartbeatTimer),this.closeWasClean||this.reconnectTimer.scheduleTimeout(),this.stateChangeCallbacks.close.forEach(function(t){return t(e)});}},{key:"onConnError",value:function(e){this.hasLogger()&&this.log("transport",e),this.triggerChanError(),this.stateChangeCallbacks.error.forEach(function(t){return t(e)});}},{key:"triggerChanError",value:function(){this.channels.forEach(function(e){e.isErrored()||e.isLeaving()||e.isClosed()||e.trigger(v.error);});}},{key:"connectionState",value:function(){switch(this.conn&&this.conn.readyState){case f.connecting:return "connecting";case f.open:return "open";case f.closing:return "closing";default:return "closed"}}},{key:"isConnected",value:function(){return "open"===this.connectionState()}},{key:"remove",value:function(e){this.channels=this.channels.filter(function(t){return t.joinRef()!==e.joinRef()});}},{key:"channel",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},n=new b(e,t,this);return this.channels.push(n),n}},{key:"push",value:function(e){var t=this;if(this.hasLogger()){var n=e.topic,i=e.event,o=e.payload,r=e.ref,s=e.join_ref;this.log("push","".concat(n," ").concat(i," (").concat(s,", ").concat(r,")"),o);}this.isConnected()?this.encode(e,function(e){return t.conn.send(e)}):this.sendBuffer.push(function(){return t.encode(e,function(e){return t.conn.send(e)})});}},{key:"makeRef",value:function(){var e=this.ref+1;return e===this.ref?this.ref=0:this.ref=e,this.ref.toString()}},{key:"sendHeartbeat",value:function(){if(this.isConnected()){if(this.pendingHeartbeatRef)return this.pendingHeartbeatRef=null,this.hasLogger()&&this.log("transport","heartbeat timeout. Attempting to re-establish connection"),void this.abnormalClose("heartbeat timeout");this.pendingHeartbeatRef=this.makeRef(),this.push({topic:"phoenix",event:"heartbeat",payload:{},ref:this.pendingHeartbeatRef});}}},{key:"abnormalClose",value:function(e){this.closeWasClean=!1,this.conn.close(1e3,e);}},{key:"flushSendBuffer",value:function(){this.isConnected()&&this.sendBuffer.length>0&&(this.sendBuffer.forEach(function(e){return e()}),this.sendBuffer=[]);}},{key:"onConnMessage",value:function(e){var t=this;this.decode(e.data,function(e){var n=e.topic,i=e.event,o=e.payload,r=e.ref,s=e.join_ref;r&&r===t.pendingHeartbeatRef&&(t.pendingHeartbeatRef=null),t.hasLogger()&&t.log("receive","".concat(o.status||""," ").concat(n," ").concat(i," ").concat(r&&"("+r+")"||""),o);for(var a=0;a<t.channels.length;a++){var c=t.channels[a];c.isMember(n,i,o,s)&&c.trigger(i,o,r,s);}for(var u=0;u<t.stateChangeCallbacks.message.length;u++)t.stateChangeCallbacks.message[u](e);});}}]),e}(),C=function(){function e(t){s(this,e),this.endPoint=null,this.token=null,this.skipHeartbeat=!0,this.onopen=function(){},this.onerror=function(){},this.onmessage=function(){},this.onclose=function(){},this.pollEndpoint=this.normalizeEndpoint(t),this.readyState=f.connecting,this.poll();}return c(e,[{key:"normalizeEndpoint",value:function(e){return e.replace("ws://","http://").replace("wss://","https://").replace(new RegExp("(.*)/"+m.websocket),"$1/"+m.longpoll)}},{key:"endpointURL",value:function(){return T.appendParams(this.pollEndpoint,{token:this.token})}},{key:"closeAndRetry",value:function(){this.close(),this.readyState=f.connecting;}},{key:"ontimeout",value:function(){this.onerror("timeout"),this.closeAndRetry();}},{key:"poll",value:function(){var e=this;this.readyState!==f.open&&this.readyState!==f.connecting||T.request("GET",this.endpointURL(),"application/json",null,this.timeout,this.ontimeout.bind(this),function(t){if(t){var n=t.status,i=t.token,o=t.messages;e.token=i;}else n=0;switch(n){case 200:o.forEach(function(t){return e.onmessage({data:t})}),e.poll();break;case 204:e.poll();break;case 410:e.readyState=f.open,e.onopen(),e.poll();break;case 0:case 500:e.onerror(),e.closeAndRetry();break;default:throw new Error("unhandled poll status ".concat(n))}});}},{key:"send",value:function(e){var t=this;T.request("POST",this.endpointURL(),"application/json",e,this.timeout,this.onerror.bind(this,"timeout"),function(e){e&&200===e.status||(t.onerror(e&&e.status),t.closeAndRetry());});}},{key:"close",value:function(e,t){this.readyState=f.closed,this.onclose();}}]),e}(),T=function(){function e(){s(this,e);}return c(e,null,[{key:"request",value:function(e,t,n,i,o,r,s){if(l.XDomainRequest){var a=new XDomainRequest;this.xdomainRequest(a,e,t,i,o,r,s);}else{var c=l.XMLHttpRequest?new l.XMLHttpRequest:new ActiveXObject("Microsoft.XMLHTTP");this.xhrRequest(c,e,t,n,i,o,r,s);}}},{key:"xdomainRequest",value:function(e,t,n,i,o,r,s){var a=this;e.timeout=o,e.open(t,n),e.onload=function(){var t=a.parseJSON(e.responseText);s&&s(t);},r&&(e.ontimeout=r),e.onprogress=function(){},e.send(i);}},{key:"xhrRequest",value:function(e,t,n,i,o,r,s,a){var c=this;e.open(t,n,!0),e.timeout=r,e.setRequestHeader("Content-Type",i),e.onerror=function(){a&&a(null);},e.onreadystatechange=function(){if(e.readyState===c.states.complete&&a){var t=c.parseJSON(e.responseText);a(t);}},s&&(e.ontimeout=s),e.send(o);}},{key:"parseJSON",value:function(e){if(!e||""===e)return null;try{return JSON.parse(e)}catch(t){return console&&console.log("failed to parse JSON response",e),null}}},{key:"serialize",value:function(e,t){var n=[];for(var i in e)if(e.hasOwnProperty(i)){var r=t?"".concat(t,"[").concat(i,"]"):i,s=e[i];"object"===o(s)?n.push(this.serialize(s,r)):n.push(encodeURIComponent(r)+"="+encodeURIComponent(s));}return n.join("&")}},{key:"appendParams",value:function(e,t){if(0===Object.keys(t).length)return e;var n=e.match(/\?/)?"&":"?";return "".concat(e).concat(n).concat(this.serialize(t))}}]),e}();T.states={complete:4};var w=function(){function e(t){var n=this,i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};s(this,e);var o=i.events||{state:"presence_state",diff:"presence_diff"};this.state={},this.pendingDiffs=[],this.channel=t,this.joinRef=null,this.caller={onJoin:function(){},onLeave:function(){},onSync:function(){}},this.channel.on(o.state,function(t){var i=n.caller,o=i.onJoin,r=i.onLeave,s=i.onSync;n.joinRef=n.channel.joinRef(),n.state=e.syncState(n.state,t,o,r),n.pendingDiffs.forEach(function(t){n.state=e.syncDiff(n.state,t,o,r);}),n.pendingDiffs=[],s();}),this.channel.on(o.diff,function(t){var i=n.caller,o=i.onJoin,r=i.onLeave,s=i.onSync;n.inPendingSyncState()?n.pendingDiffs.push(t):(n.state=e.syncDiff(n.state,t,o,r),s());});}return c(e,[{key:"onJoin",value:function(e){this.caller.onJoin=e;}},{key:"onLeave",value:function(e){this.caller.onLeave=e;}},{key:"onSync",value:function(e){this.caller.onSync=e;}},{key:"list",value:function(t){return e.list(this.state,t)}},{key:"inPendingSyncState",value:function(){return !this.joinRef||this.joinRef!==this.channel.joinRef()}}],[{key:"syncState",value:function(e,t,n,i){var o=this,r=this.clone(e),s={},a={};return this.map(r,function(e,n){t[e]||(a[e]=n);}),this.map(t,function(e,t){var n=r[e];if(n){var i=t.metas.map(function(e){return e.phx_ref}),c=n.metas.map(function(e){return e.phx_ref}),u=t.metas.filter(function(e){return c.indexOf(e.phx_ref)<0}),h=n.metas.filter(function(e){return i.indexOf(e.phx_ref)<0});u.length>0&&(s[e]=t,s[e].metas=u),h.length>0&&(a[e]=o.clone(n),a[e].metas=h);}else s[e]=t;}),this.syncDiff(r,{joins:s,leaves:a},n,i)}},{key:"syncDiff",value:function(e,t,n,o){var r=t.joins,s=t.leaves,a=this.clone(e);return n||(n=function(){}),o||(o=function(){}),this.map(r,function(e,t){var o=a[e];if(a[e]=t,o){var r,s=a[e].metas.map(function(e){return e.phx_ref}),c=o.metas.filter(function(e){return s.indexOf(e.phx_ref)<0});(r=a[e].metas).unshift.apply(r,i(c));}n(e,o,t);}),this.map(s,function(e,t){var n=a[e];if(n){var i=t.metas.map(function(e){return e.phx_ref});n.metas=n.metas.filter(function(e){return i.indexOf(e.phx_ref)<0}),o(e,n,t),0===n.metas.length&&delete a[e];}}),a}},{key:"list",value:function(e,t){return t||(t=function(e,t){return t}),this.map(e,function(e,n){return t(e,n)})}},{key:"map",value:function(e,t){return Object.getOwnPropertyNames(e).map(function(n){return t(n,e[n])})}},{key:"clone",value:function(e){return JSON.parse(JSON.stringify(e))}}]),e}(),E=function(){function e(t,n){s(this,e),this.callback=t,this.timerCalc=n,this.timer=null,this.tries=0;}return c(e,[{key:"reset",value:function(){this.tries=0,clearTimeout(this.timer);}},{key:"scheduleTimeout",value:function(){var e=this;clearTimeout(this.timer),this.timer=setTimeout(function(){e.tries=e.tries+1,e.callback();},this.timerCalc(this.tries+1));}}]),e}();}])});
    });

    var phx = unwrapExports(phoenix);
    var phoenix_1 = phoenix.Phoenix;

    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (!stop) {
                    return; // not ready
                }
                subscribers.forEach((s) => s[1]());
                subscribers.forEach((s) => s[0](value));
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const someObject = {
        a: "a",
        b: {
            a: "a",
            b: {
                a: "a",
                b: "b"
            }
        }
    };

    const storeObj = writable(someObject);

    const changeNestedMutation = () => {
        someObject.b.b.b = "c";
        storeObj.update(x => someObject);
        // works
    };

    const mutateSurreptitiously = () => { 
        someObject.b.b.b = "d";
    };

    const update$1 = () => {
        storeObj.update(x => someObject);
    };

    /* src\App.svelte generated by Svelte v3.6.7 */
    const { console: console_1 } = globals;

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	var h1, t0, t1, t2, t3, t4_value = ctx.$storeObj.b.b.b, t4, t5, button0, t7, button1, t9, button2, dispose;

    	return {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text("hmma ");
    			t1 = text(ctx.name);
    			t2 = text("!");
    			t3 = text("\nhm b is ");
    			t4 = text(t4_value);
    			t5 = space();
    			button0 = element("button");
    			button0.textContent = "change is good";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "but not too much";
    			t9 = space();
    			button2 = element("button");
    			button2.textContent = "update with some obj";
    			attr(h1, "class", "svelte-1ucbz36");
    			add_location(h1, file, 31, 0, 674);
    			add_location(button0, file, 34, 0, 723);
    			add_location(button1, file, 35, 0, 789);
    			add_location(button2, file, 36, 0, 858);

    			dispose = [
    				listen(button0, "click", changeNestedMutation),
    				listen(button1, "click", mutateSurreptitiously),
    				listen(button2, "click", update$1)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, h1, anchor);
    			append(h1, t0);
    			append(h1, t1);
    			append(h1, t2);
    			insert(target, t3, anchor);
    			insert(target, t4, anchor);
    			insert(target, t5, anchor);
    			insert(target, button0, anchor);
    			insert(target, t7, anchor);
    			insert(target, button1, anchor);
    			insert(target, t9, anchor);
    			insert(target, button2, anchor);
    		},

    		p: function update_1(changed, ctx) {
    			if (changed.name) {
    				set_data(t1, ctx.name);
    			}

    			if ((changed.$storeObj) && t4_value !== (t4_value = ctx.$storeObj.b.b.b)) {
    				set_data(t4, t4_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h1);
    				detach(t3);
    				detach(t4);
    				detach(t5);
    				detach(button0);
    				detach(t7);
    				detach(button1);
    				detach(t9);
    				detach(button2);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $storeObj;

    	validate_store(storeObj, 'storeObj');
    	subscribe($$self, storeObj, $$value => { $storeObj = $$value; $$invalidate('$storeObj', $storeObj); });

    	
      let { name } = $$props;
      const { Socket } = phx;

      let socket = new Socket("/socket", { params: { userToken: "123" } });
      socket.connect();
      let channel = socket.channel("room:lobby", {});

      onMount(async () => {
    	  console.log(channel);
        channel
          .join()
          .receive("ok", resp => {
            console.log("Joined successfully", resp);
          })
          .receive("error", resp => {
            console.log("Unable to join", resp);
          });
      });

    	const writable_props = ['name'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    	};

    	return { name, $storeObj };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["name"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console_1.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
