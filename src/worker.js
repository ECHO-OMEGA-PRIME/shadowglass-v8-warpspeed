var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now2 = Date.now();
  const seconds = Math.trunc(now2 / 1e3);
  const nanos = now2 % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env3) {
    return 1;
  }
  hasColors(count3, env3) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process2 extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process2.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd3) {
    this.#cwd = cwd3;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// C:/Users/bobmc/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// worker.js
import { EventEmitter as EventEmitter2 } from "node:events";
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
// @__NO_SIDE_EFFECTS__
function createNotImplementedError2(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError2, "createNotImplementedError");
__name2(createNotImplementedError2, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented2(name) {
  const fn = /* @__PURE__ */ __name2(() => {
    throw /* @__PURE__ */ createNotImplementedError2(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented2, "notImplemented");
__name2(notImplemented2, "notImplemented");
var _timeOrigin2 = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow2 = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin2;
var nodeTiming2 = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry2 = class {
  static {
    __name(this, "PerformanceEntry");
  }
  static {
    __name2(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow2();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow2() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark3 = class PerformanceMark22 extends PerformanceEntry2 {
  static {
    __name(this, "PerformanceMark2");
  }
  static {
    __name2(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure2 = class extends PerformanceEntry2 {
  static {
    __name(this, "PerformanceMeasure");
  }
  static {
    __name2(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming2 = class extends PerformanceEntry2 {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  static {
    __name2(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList2 = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  static {
    __name2(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance2 = class {
  static {
    __name(this, "Performance");
  }
  static {
    __name2(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin2;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming2;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming2("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin2) {
      return _performanceNow2();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark3(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure2(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw /* @__PURE__ */ createNotImplementedError2("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver2 = class {
  static {
    __name(this, "PerformanceObserver");
  }
  static {
    __name2(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw /* @__PURE__ */ createNotImplementedError2("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw /* @__PURE__ */ createNotImplementedError2("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance2 = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance2();
globalThis.performance = performance2;
globalThis.Performance = Performance2;
globalThis.PerformanceEntry = PerformanceEntry2;
globalThis.PerformanceMark = PerformanceMark3;
globalThis.PerformanceMeasure = PerformanceMeasure2;
globalThis.PerformanceObserver = PerformanceObserver2;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList2;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming2;
var hrtime4 = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function hrtime22(startTime) {
  const now2 = Date.now();
  const seconds = Math.trunc(now2 / 1e3);
  const nanos = now2 % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime2"), "hrtime"), { bigint: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function bigint2() {
  return BigInt(Date.now() * 1e6);
}, "bigint"), "bigint") });
var ReadStream2 = class {
  static {
    __name(this, "ReadStream");
  }
  static {
    __name2(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};
var WriteStream2 = class {
  static {
    __name(this, "WriteStream");
  }
  static {
    __name2(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env22) {
    return 1;
  }
  hasColors(count3, env22) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};
var NODE_VERSION2 = "22.14.0";
var Process2 = class _Process extends EventEmitter2 {
  static {
    __name(this, "_Process");
  }
  static {
    __name2(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter2.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream2(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream2(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream2(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd22) {
    this.#cwd = cwd22;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION2}`;
  }
  get versions() {
    return { node: NODE_VERSION2 };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw /* @__PURE__ */ createNotImplementedError2("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw /* @__PURE__ */ createNotImplementedError2("process.getActiveResourcesInfo");
  }
  exit() {
    throw /* @__PURE__ */ createNotImplementedError2("process.exit");
  }
  reallyExit() {
    throw /* @__PURE__ */ createNotImplementedError2("process.reallyExit");
  }
  kill() {
    throw /* @__PURE__ */ createNotImplementedError2("process.kill");
  }
  abort() {
    throw /* @__PURE__ */ createNotImplementedError2("process.abort");
  }
  dlopen() {
    throw /* @__PURE__ */ createNotImplementedError2("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw /* @__PURE__ */ createNotImplementedError2("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw /* @__PURE__ */ createNotImplementedError2("process.loadEnvFile");
  }
  disconnect() {
    throw /* @__PURE__ */ createNotImplementedError2("process.disconnect");
  }
  cpuUsage() {
    throw /* @__PURE__ */ createNotImplementedError2("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw /* @__PURE__ */ createNotImplementedError2("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw /* @__PURE__ */ createNotImplementedError2("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw /* @__PURE__ */ createNotImplementedError2("process.initgroups");
  }
  openStdin() {
    throw /* @__PURE__ */ createNotImplementedError2("process.openStdin");
  }
  assert() {
    throw /* @__PURE__ */ createNotImplementedError2("process.assert");
  }
  binding() {
    throw /* @__PURE__ */ createNotImplementedError2("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented2("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented2("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented2("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented2("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented2("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented2("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name2(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
var globalProcess2 = globalThis["process"];
var getBuiltinModule2 = globalProcess2.getBuiltinModule;
var workerdProcess2 = getBuiltinModule2("node:process");
var isWorkerdProcessV2 = globalThis.Cloudflare.compatibilityFlags.enable_nodejs_process_v2;
var unenvProcess2 = new Process2({
  env: globalProcess2.env,
  // `hrtime` is only available from workerd process v2
  hrtime: isWorkerdProcessV2 ? workerdProcess2.hrtime : hrtime4,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess2.nextTick
});
var { exit: exit2, features: features2, platform: platform2 } = workerdProcess2;
var {
  // Always implemented by workerd
  env: env2,
  // Only implemented in workerd v2
  hrtime: hrtime32,
  // Always implemented by workerd
  nextTick: nextTick2
} = unenvProcess2;
var {
  _channel: _channel2,
  _disconnect: _disconnect2,
  _events: _events2,
  _eventsCount: _eventsCount2,
  _handleQueue: _handleQueue2,
  _maxListeners: _maxListeners2,
  _pendingMessage: _pendingMessage2,
  _send: _send2,
  assert: assert3,
  disconnect: disconnect2,
  mainModule: mainModule2
} = unenvProcess2;
var {
  // @ts-expect-error `_debugEnd` is missing typings
  _debugEnd: _debugEnd2,
  // @ts-expect-error `_debugProcess` is missing typings
  _debugProcess: _debugProcess2,
  // @ts-expect-error `_exiting` is missing typings
  _exiting: _exiting2,
  // @ts-expect-error `_fatalException` is missing typings
  _fatalException: _fatalException2,
  // @ts-expect-error `_getActiveHandles` is missing typings
  _getActiveHandles: _getActiveHandles2,
  // @ts-expect-error `_getActiveRequests` is missing typings
  _getActiveRequests: _getActiveRequests2,
  // @ts-expect-error `_kill` is missing typings
  _kill: _kill2,
  // @ts-expect-error `_linkedBinding` is missing typings
  _linkedBinding: _linkedBinding2,
  // @ts-expect-error `_preload_modules` is missing typings
  _preload_modules: _preload_modules2,
  // @ts-expect-error `_rawDebug` is missing typings
  _rawDebug: _rawDebug2,
  // @ts-expect-error `_startProfilerIdleNotifier` is missing typings
  _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
  // @ts-expect-error `_stopProfilerIdleNotifier` is missing typings
  _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
  // @ts-expect-error `_tickCallback` is missing typings
  _tickCallback: _tickCallback2,
  abort: abort2,
  addListener: addListener2,
  allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
  arch: arch2,
  argv: argv2,
  argv0: argv02,
  availableMemory: availableMemory2,
  // @ts-expect-error `binding` is missing typings
  binding: binding2,
  channel: channel2,
  chdir: chdir2,
  config: config2,
  connected: connected2,
  constrainedMemory: constrainedMemory2,
  cpuUsage: cpuUsage2,
  cwd: cwd2,
  debugPort: debugPort2,
  dlopen: dlopen2,
  // @ts-expect-error `domain` is missing typings
  domain: domain2,
  emit: emit2,
  emitWarning: emitWarning2,
  eventNames: eventNames2,
  execArgv: execArgv2,
  execPath: execPath2,
  exitCode: exitCode2,
  finalization: finalization2,
  getActiveResourcesInfo: getActiveResourcesInfo2,
  getegid: getegid2,
  geteuid: geteuid2,
  getgid: getgid2,
  getgroups: getgroups2,
  getMaxListeners: getMaxListeners2,
  getuid: getuid2,
  hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
  // @ts-expect-error `initgroups` is missing typings
  initgroups: initgroups2,
  kill: kill2,
  listenerCount: listenerCount2,
  listeners: listeners2,
  loadEnvFile: loadEnvFile2,
  memoryUsage: memoryUsage2,
  // @ts-expect-error `moduleLoadList` is missing typings
  moduleLoadList: moduleLoadList2,
  off: off2,
  on: on2,
  once: once2,
  // @ts-expect-error `openStdin` is missing typings
  openStdin: openStdin2,
  permission: permission2,
  pid: pid2,
  ppid: ppid2,
  prependListener: prependListener2,
  prependOnceListener: prependOnceListener2,
  rawListeners: rawListeners2,
  // @ts-expect-error `reallyExit` is missing typings
  reallyExit: reallyExit2,
  ref: ref2,
  release: release2,
  removeAllListeners: removeAllListeners2,
  removeListener: removeListener2,
  report: report2,
  resourceUsage: resourceUsage2,
  send: send2,
  setegid: setegid2,
  seteuid: seteuid2,
  setgid: setgid2,
  setgroups: setgroups2,
  setMaxListeners: setMaxListeners2,
  setSourceMapsEnabled: setSourceMapsEnabled2,
  setuid: setuid2,
  setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
  sourceMapsEnabled: sourceMapsEnabled2,
  stderr: stderr2,
  stdin: stdin2,
  stdout: stdout2,
  throwDeprecation: throwDeprecation2,
  title: title2,
  traceDeprecation: traceDeprecation2,
  umask: umask2,
  unref: unref2,
  uptime: uptime2,
  version: version2,
  versions: versions2
} = isWorkerdProcessV2 ? workerdProcess2 : unenvProcess2;
var _process2 = {
  abort: abort2,
  addListener: addListener2,
  allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
  hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
  setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
  loadEnvFile: loadEnvFile2,
  sourceMapsEnabled: sourceMapsEnabled2,
  arch: arch2,
  argv: argv2,
  argv0: argv02,
  chdir: chdir2,
  config: config2,
  connected: connected2,
  constrainedMemory: constrainedMemory2,
  availableMemory: availableMemory2,
  cpuUsage: cpuUsage2,
  cwd: cwd2,
  debugPort: debugPort2,
  dlopen: dlopen2,
  disconnect: disconnect2,
  emit: emit2,
  emitWarning: emitWarning2,
  env: env2,
  eventNames: eventNames2,
  execArgv: execArgv2,
  execPath: execPath2,
  exit: exit2,
  finalization: finalization2,
  features: features2,
  getBuiltinModule: getBuiltinModule2,
  getActiveResourcesInfo: getActiveResourcesInfo2,
  getMaxListeners: getMaxListeners2,
  hrtime: hrtime32,
  kill: kill2,
  listeners: listeners2,
  listenerCount: listenerCount2,
  memoryUsage: memoryUsage2,
  nextTick: nextTick2,
  on: on2,
  off: off2,
  once: once2,
  pid: pid2,
  platform: platform2,
  ppid: ppid2,
  prependListener: prependListener2,
  prependOnceListener: prependOnceListener2,
  rawListeners: rawListeners2,
  release: release2,
  removeAllListeners: removeAllListeners2,
  removeListener: removeListener2,
  report: report2,
  resourceUsage: resourceUsage2,
  setMaxListeners: setMaxListeners2,
  setSourceMapsEnabled: setSourceMapsEnabled2,
  stderr: stderr2,
  stdin: stdin2,
  stdout: stdout2,
  title: title2,
  throwDeprecation: throwDeprecation2,
  traceDeprecation: traceDeprecation2,
  umask: umask2,
  uptime: uptime2,
  version: version2,
  versions: versions2,
  // @ts-expect-error old API
  domain: domain2,
  initgroups: initgroups2,
  moduleLoadList: moduleLoadList2,
  reallyExit: reallyExit2,
  openStdin: openStdin2,
  assert: assert3,
  binding: binding2,
  send: send2,
  exitCode: exitCode2,
  channel: channel2,
  getegid: getegid2,
  geteuid: geteuid2,
  getgid: getgid2,
  getgroups: getgroups2,
  getuid: getuid2,
  setegid: setegid2,
  seteuid: seteuid2,
  setgid: setgid2,
  setgroups: setgroups2,
  setuid: setuid2,
  permission: permission2,
  mainModule: mainModule2,
  _events: _events2,
  _eventsCount: _eventsCount2,
  _exiting: _exiting2,
  _maxListeners: _maxListeners2,
  _debugEnd: _debugEnd2,
  _debugProcess: _debugProcess2,
  _fatalException: _fatalException2,
  _getActiveHandles: _getActiveHandles2,
  _getActiveRequests: _getActiveRequests2,
  _kill: _kill2,
  _preload_modules: _preload_modules2,
  _rawDebug: _rawDebug2,
  _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
  _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
  _tickCallback: _tickCallback2,
  _disconnect: _disconnect2,
  _handleQueue: _handleQueue2,
  _pendingMessage: _pendingMessage2,
  _channel: _channel2,
  _send: _send2,
  _linkedBinding: _linkedBinding2
};
var process_default2 = _process2;
globalThis.process = process_default2;
var USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
];
function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
__name(randomUA, "randomUA");
__name2(randomUA, "randomUA");
function extractCookies(response) {
  const cookies = [];
  try {
    const setCookies = response.headers.getSetCookie?.();
    if (setCookies && Array.isArray(setCookies)) {
      for (const sc of setCookies) {
        const nameVal = sc.split(";")[0].trim();
        if (nameVal.includes("=")) {
          cookies.push(nameVal);
        }
      }
      if (cookies.length > 0) return cookies;
    }
  } catch {
  }
  const raw = response.headers.get("set-cookie");
  if (raw) {
    const parts = raw.split(/,(?=\s*\w+=)/);
    for (const part of parts) {
      const nameVal = part.trim().split(";")[0];
      if (nameVal.includes("=")) {
        cookies.push(nameVal);
      }
    }
  }
  return cookies;
}
__name(extractCookies, "extractCookies");
__name2(extractCookies, "extractCookies");
function mergeCookies(existing, newCookies) {
  const map = /* @__PURE__ */ new Map();
  for (const c of [...existing, ...newCookies]) {
    const [name] = c.split("=", 1);
    map.set(name, c);
  }
  return Array.from(map.values());
}
__name(mergeCookies, "mergeCookies");
__name2(mergeCookies, "mergeCookies");
function cookieHeader(cookies) {
  return cookies.join("; ");
}
__name(cookieHeader, "cookieHeader");
__name2(cookieHeader, "cookieHeader");
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&#149;/g, "\u2022").replace(/\s+/g, " ").trim();
}
__name(stripHtml, "stripHtml");
__name2(stripHtml, "stripHtml");
async function setupTylerSession(baseUrl) {
  const ua = randomUA();
  let cookies = [];
  const log3 = [];
  const url = new URL(baseUrl);
  const origin = url.origin;
  const basePath = baseUrl.includes("/recorder/") ? "/recorder/web" : "/web";
  log3.push(`[TYLER] Starting session setup: ${origin}${basePath}`);
  const headers = /* @__PURE__ */ __name2((extra) => ({
    "User-Agent": ua,
    "Cookie": cookieHeader(cookies),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    ...extra
  }), "headers");
  const ajaxHeaders = /* @__PURE__ */ __name2((extra) => ({
    "User-Agent": ua,
    "Cookie": cookieHeader(cookies),
    "ajaxRequest": "true",
    "X-Requested-With": "XMLHttpRequest",
    ...extra
  }), "ajaxHeaders");
  log3.push(`[TYLER] Step 1: GET ${origin}${basePath}/user/disclaimer`);
  const resp1 = await fetch(`${origin}${basePath}/user/disclaimer`, {
    headers: headers(),
    redirect: "follow"
  });
  log3.push(`[TYLER] Step 1 response: ${resp1.status} ${resp1.statusText}`);
  const resp1Cookies = extractCookies(resp1);
  log3.push(`[TYLER] Step 1 cookies: ${JSON.stringify(resp1Cookies)}`);
  cookies = mergeCookies(cookies, resp1Cookies);
  const body1 = await resp1.text();
  log3.push(`[TYLER] Step 1 body length: ${body1.length}`);
  log3.push(`[TYLER] Step 2: POST disclaimer (AJAX)`);
  const resp2 = await fetch(`${origin}${basePath}/user/disclaimer`, {
    method: "POST",
    headers: ajaxHeaders({ "Accept": "application/json" }),
    redirect: "follow"
  });
  log3.push(`[TYLER] Step 2 response: ${resp2.status} ${resp2.statusText}`);
  const resp2Cookies = extractCookies(resp2);
  log3.push(`[TYLER] Step 2 cookies: ${JSON.stringify(resp2Cookies)}`);
  cookies = mergeCookies(cookies, resp2Cookies);
  const body2 = await resp2.text();
  log3.push(`[TYLER] Step 2 body: ${body2.slice(0, 200)}`);
  log3.push(`[TYLER] Step 3: GET home`);
  const resp3 = await fetch(`${origin}${basePath}/`, {
    headers: headers(),
    redirect: "follow"
  });
  log3.push(`[TYLER] Step 3 response: ${resp3.status} ${resp3.statusText}`);
  cookies = mergeCookies(cookies, extractCookies(resp3));
  const body3 = await resp3.text();
  log3.push(`[TYLER] Step 3 body length: ${body3.length}`);
  log3.push(`[TYLER] Step 4: POST homeActions`);
  const resp4 = await fetch(`${origin}${basePath}/homeActions`, {
    method: "POST",
    headers: ajaxHeaders({ "Accept": "text/html, */*; q=0.01" }),
    redirect: "follow"
  });
  log3.push(`[TYLER] Step 4 response: ${resp4.status} ${resp4.statusText}`);
  cookies = mergeCookies(cookies, extractCookies(resp4));
  const menuHtml = await resp4.text();
  log3.push(`[TYLER] Step 4 menu length: ${menuHtml.length}, snippet: ${menuHtml.slice(0, 300)}`);
  const actionMatch = menuHtml.match(/href="([^"]*\/action\/ACTIONGROUP\d+S\d+)"/i);
  if (!actionMatch) {
    const err = `No action group found in Tyler Tech menu. Menu HTML: ${menuHtml.slice(0, 500)}`;
    log3.push(`[TYLER] FAIL: ${err}`);
    console.log(log3.join("\n"));
    throw new Error(err);
  }
  const actionGroupUrl = actionMatch[1];
  log3.push(`[TYLER] Found action group: ${actionGroupUrl}`);
  log3.push(`[TYLER] Step 5: GET ${origin}${actionGroupUrl}`);
  const resp5 = await fetch(`${origin}${actionGroupUrl}`, {
    headers: headers(),
    redirect: "follow"
  });
  log3.push(`[TYLER] Step 5 response: ${resp5.status} ${resp5.statusText}`);
  cookies = mergeCookies(cookies, extractCookies(resp5));
  const actionHtml = await resp5.text();
  log3.push(`[TYLER] Step 5 body length: ${actionHtml.length}`);
  const searchMatch = actionHtml.match(/href="[^"]*\/search\/(DOCSEARCH\d+S\d+)"/i);
  if (!searchMatch) {
    const err = `No DOCSEARCH module found. Action HTML: ${actionHtml.slice(0, 500)}`;
    log3.push(`[TYLER] FAIL: ${err}`);
    console.log(log3.join("\n"));
    throw new Error(err);
  }
  const searchActionId = searchMatch[1];
  log3.push(`[TYLER] Found search module: ${searchActionId}`);
  log3.push(`[TYLER] Step 6: GET search/${searchActionId}`);
  const resp6 = await fetch(`${origin}${basePath}/search/${searchActionId}`, {
    headers: headers(),
    redirect: "follow"
  });
  log3.push(`[TYLER] Step 6 response: ${resp6.status} ${resp6.statusText}`);
  cookies = mergeCookies(cookies, extractCookies(resp6));
  await resp6.text();
  log3.push(`[TYLER] Session setup complete. Cookies: ${cookies.length}, SearchID: ${searchActionId}`);
  console.log(log3.join("\n"));
  return { cookies, searchActionId, basePath, origin, ua };
}
__name(setupTylerSession, "setupTylerSession");
__name2(setupTylerSession, "setupTylerSession");
async function submitSearch(session, docType, dateStart, dateEnd) {
  const searchPostUrl = `${session.origin}${session.basePath}/searchPost/${session.searchActionId}`;
  const searchFormUrl = `${session.origin}${session.basePath}/search/${session.searchActionId}`;
  const params = new URLSearchParams();
  params.set("field_BothNamesID", "");
  params.set("field_GrantorID", "");
  params.set("field_GranteeID", "");
  params.set("field_RecordingDateID_DOT_StartDate", dateStart);
  params.set("field_RecordingDateID_DOT_EndDate", dateEnd);
  params.set("field_DocumentNumberID", "");
  params.set("field_BookPageID_DOT_Book", "");
  params.set("field_BookPageID_DOT_Volume", "");
  params.set("field_BookPageID_DOT_Page", "");
  params.set("field_PlattedLegalID_DOT_Subdivision", "");
  params.set("field_PlattedLegalID_DOT_Lot", "");
  params.set("field_PlattedLegalID_DOT_Block", "");
  params.set("field_PlattedLegalID_DOT_Tract", "");
  params.set("field_PlattedLegalID_DOT_Unit", "");
  params.set("field_selfservice_documentTypes", docType || "");
  const resp = await fetch(searchPostUrl, {
    method: "POST",
    headers: {
      "User-Agent": session.ua,
      "Cookie": cookieHeader(session.cookies),
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Referer": searchFormUrl,
      "Origin": session.origin,
      "ajaxRequest": "true",
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json, text/javascript, */*; q=0.01"
    },
    body: params.toString(),
    redirect: "follow"
  });
  session.cookies = mergeCookies(session.cookies, extractCookies(resp));
  if (!resp.ok) {
    throw new Error(`Tyler Tech searchPost failed: HTTP ${resp.status}`);
  }
  const result = await resp.json();
  return result;
}
__name(submitSearch, "submitSearch");
__name2(submitSearch, "submitSearch");
async function fetchResultsPage(session, page) {
  const resultsUrl = `${session.origin}${session.basePath}/searchResults/${session.searchActionId}?page=${page}`;
  const referer = `${session.origin}${session.basePath}/search/${session.searchActionId}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 2e3 * attempt));
      console.log(`[TYLER] Retry ${attempt} for page ${page}`);
    }
    const resp = await fetch(resultsUrl, {
      headers: {
        "User-Agent": session.ua,
        "Cookie": cookieHeader(session.cookies),
        "ajaxRequest": "true",
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "text/html, */*; q=0.01",
        "Referer": referer
      },
      redirect: "follow"
    });
    session.cookies = mergeCookies(session.cookies, extractCookies(resp));
    if (resp.ok) {
      return resp.text();
    }
    if (resp.status !== 500) {
      throw new Error(`Tyler Tech results page ${page} failed: HTTP ${resp.status}`);
    }
    console.log(`[TYLER] Page ${page} returned 500 (attempt ${attempt + 1}/3)`);
  }
  throw new Error(`Tyler Tech results page ${page} failed: HTTP 500 after 3 attempts`);
}
__name(fetchResultsPage, "fetchResultsPage");
__name2(fetchResultsPage, "fetchResultsPage");
function parseTylerResults(html) {
  const records = [];
  const rowPattern = /<li[^>]*class="[^"]*ss-search-row[^"]*"[^>]*data-documentid="([^"]*)"[^>]*>/gi;
  const matches = [];
  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    matches.push({ docId: match[1], startIdx: match.index });
  }
  for (let i = 0; i < matches.length; i++) {
    const startIdx = matches[i].startIdx;
    const endIdx = i + 1 < matches.length ? matches[i + 1].startIdx : html.length;
    const rowHtml = html.slice(startIdx, endIdx);
    const docId = matches[i].docId;
    const h1Match = rowHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    let instrumentNum = "";
    let docType = "";
    if (h1Match) {
      const h1Text = stripHtml(h1Match[1]);
      const bulletIdx = h1Text.indexOf("\u2022");
      if (bulletIdx > 0) {
        instrumentNum = h1Text.slice(0, bulletIdx).trim();
        docType = h1Text.slice(bulletIdx + 1).trim();
      } else {
        instrumentNum = h1Text.trim();
      }
    }
    const fields = {};
    const columnRegex = /<div[^>]*class="[^"]*searchResultFourColumn[^"]*"[^>]*>([\s\S]*?)<\/div>\s*/gi;
    let colMatch;
    while ((colMatch = columnRegex.exec(rowHtml)) !== null) {
      const colHtml = colMatch[1];
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const lis = [];
      let liMatch;
      while ((liMatch = liRegex.exec(colHtml)) !== null) {
        lis.push(stripHtml(liMatch[1]));
      }
      if (lis.length >= 2) {
        const label = lis[0].toLowerCase().replace(/\s+/g, " ").trim();
        const value = lis[1].trim();
        fields[label] = value;
      }
    }
    const recordingDate = fields["recording date"] || "";
    const grantor = fields["grantor"] || "";
    const grantee = fields["grantee"] || "";
    const legalDesc = fields["legal description"] || fields["legal"] || "";
    const bookVolPage = fields["book/vol/page"] || fields["book vol page"] || "";
    if (!instrumentNum && !grantor && !recordingDate) continue;
    const linkMatch = rowHtml.match(/href="([^"]*\/document\/[^"]*)"/i);
    const pdfUrl = linkMatch ? linkMatch[1] : "";
    records.push({
      id: instrumentNum || docId || `tyler_${i}_${Date.now()}`,
      instrumentType: docType,
      filingDate: recordingDate,
      recordedDate: recordingDate,
      grantor,
      grantee,
      legalDescription: legalDesc,
      bookPage: bookVolPage,
      consideration: "",
      pdfUrl
    });
  }
  return records;
}
__name(parseTylerResults, "parseTylerResults");
__name2(parseTylerResults, "parseTylerResults");
function fmtDate(d) {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}
__name(fmtDate, "fmtDate");
__name2(fmtDate, "fmtDate");
var TYLER_CHUNK_DAYS = 90;
function generateDateChunks(startYear = 2e3) {
  const chunks = [];
  const now2 = /* @__PURE__ */ new Date();
  let chunkEnd = now2;
  while (chunkEnd.getFullYear() >= startYear) {
    const chunkStart = new Date(chunkEnd.getTime() - TYLER_CHUNK_DAYS * 24 * 60 * 60 * 1e3);
    const effectiveStart = chunkStart.getFullYear() < startYear ? new Date(startYear, 0, 1) : chunkStart;
    chunks.push({
      start: fmtDate(effectiveStart),
      end: fmtDate(chunkEnd),
      label: `${fmtDate(effectiveStart)}_${fmtDate(chunkEnd)}`
    });
    chunkEnd = new Date(effectiveStart.getTime() - 24 * 60 * 60 * 1e3);
    if (chunkEnd.getFullYear() < startYear) break;
  }
  return chunks;
}
__name(generateDateChunks, "generateDateChunks");
__name2(generateDateChunks, "generateDateChunks");
async function scrapeTylerBatch(env22, msg) {
  const results = [];
  const pendingUploads = [];
  const chunkIndex = msg.startPage;
  const chunks = generateDateChunks();
  if (chunkIndex >= chunks.length) {
    console.log(`[TYLER BATCH] Chunk index ${chunkIndex} exceeds ${chunks.length} total chunks \u2014 done.`);
    return results;
  }
  const chunk = chunks[chunkIndex];
  console.log(`[TYLER BATCH] county=${msg.county} type=${msg.instrumentType} chunk=${chunkIndex}/${chunks.length} dates=${chunk.start}-${chunk.end}`);
  const session = await setupTylerSession(msg.baseUrl);
  const searchResult = await submitSearch(session, msg.instrumentType, chunk.start, chunk.end);
  const totalPages = searchResult.totalPages;
  console.log(`[TYLER BATCH] Search result: totalPages=${totalPages}`);
  if (totalPages === 0) {
    await updateTylerCheckpoint(env22, msg, 0, 0, chunkIndex);
    return results;
  }
  let totalRecordsScraped = 0;
  let consecutiveEmpty = 0;
  for (let page = 1; page <= Math.min(totalPages, 100); page++) {
    if (consecutiveEmpty >= 3) break;
    console.log(`[TYLER BATCH] Fetching page ${page}/${totalPages}`);
    const html = await fetchResultsPage(session, page);
    const records = parseTylerResults(html);
    console.log(`[TYLER BATCH] Page ${page}: ${records.length} records from ${html.length} bytes`);
    if (records.length === 0) {
      consecutiveEmpty++;
      continue;
    }
    consecutiveEmpty = 0;
    totalRecordsScraped += records.length;
    const globalPage = chunkIndex * 1e3 + page;
    const result = {
      county: msg.county,
      instrumentType: msg.instrumentType,
      page: globalPage,
      records,
      totalFound: records.length,
      domTotal: totalPages * 100,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    results.push(result);
    pendingUploads.push(uploadTylerToR2(env22, result));
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
  }
  await Promise.allSettled(pendingUploads);
  await updateTylerCheckpoint(env22, msg, totalRecordsScraped, totalPages * 100, chunkIndex);
  console.log(`[TYLER BATCH] Chunk ${chunkIndex} complete: ${totalRecordsScraped} records, ${results.length} pages uploaded`);
  return results;
}
__name(scrapeTylerBatch, "scrapeTylerBatch");
__name2(scrapeTylerBatch, "scrapeTylerBatch");
async function discoverTyler(env22, msg) {
  console.log(`[TYLER DISCOVER] county=${msg.county} type=${msg.instrumentType}`);
  const session = await setupTylerSession(msg.baseUrl);
  const endDate = /* @__PURE__ */ new Date();
  const startDate = new Date(endDate.getTime() - TYLER_CHUNK_DAYS * 24 * 60 * 60 * 1e3);
  const dateStart = fmtDate(startDate);
  const dateEnd = fmtDate(endDate);
  console.log(`[TYLER DISCOVER] Probing ${dateStart} to ${dateEnd}`);
  const searchResult = await submitSearch(session, msg.instrumentType, dateStart, dateEnd);
  console.log(`[TYLER DISCOVER] Most recent 90-day chunk: totalPages=${searchResult.totalPages}`);
  if (searchResult.totalPages > 0) {
    const chunks = generateDateChunks();
    console.log(`[TYLER DISCOVER] ${chunks.length} chunks total, ${searchResult.totalPages * 100} records in most recent`);
    return {
      instrumentType: msg.instrumentType,
      totalRecords: chunks.length * 100
      // Each "page" = one 90-day chunk
    };
  }
  return {
    instrumentType: msg.instrumentType,
    totalRecords: 0
  };
}
__name(discoverTyler, "discoverTyler");
__name2(discoverTyler, "discoverTyler");
async function uploadTylerToR2(env22, result) {
  const key = `ENCORE/TYLER/${result.county}/${result.instrumentType.replace(/ /g, "_")}/page_${String(result.page).padStart(6, "0")}.json`;
  const body = JSON.stringify(result);
  await env22.R2_RECORDS.put(key, body, {
    httpMetadata: { contentType: "application/json" },
    customMetadata: {
      county: result.county,
      instrumentType: result.instrumentType,
      platform: "TYLER_TECH",
      page: String(result.page),
      recordCount: String(result.records.length),
      scrapedAt: result.timestamp
    }
  });
  try {
    await env22.DB.prepare(
      `INSERT OR REPLACE INTO r2_uploads (r2_key, county_id, instrument_type_id, page_number, record_count, uploaded_at)
       VALUES (?,
         (SELECT id FROM counties WHERE UPPER(name) = UPPER(?)),
         (SELECT id FROM instrument_types WHERE UPPER(name) = UPPER(?)),
         ?, ?, datetime('now'))`
    ).bind(key, result.county, result.instrumentType, result.page, result.records.length).run();
  } catch {
  }
}
__name(uploadTylerToR2, "uploadTylerToR2");
__name2(uploadTylerToR2, "uploadTylerToR2");
async function testTylerConnection(baseUrl, instrumentType) {
  const steps = [];
  try {
    steps.push(`Testing Tyler Tech: ${baseUrl}`);
    steps.push("Setting up session...");
    const session = await setupTylerSession(baseUrl);
    steps.push(`Session OK: searchActionId=${session.searchActionId}, cookies=${session.cookies.length}`);
    const ranges = [30, 60, 90, 120, 180, 365];
    let bestRange = 0;
    let bestPages = 0;
    let searchResult = null;
    for (const days of ranges) {
      const endDate = /* @__PURE__ */ new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1e3);
      const ds = fmtDate(startDate);
      const de = fmtDate(endDate);
      steps.push(`Testing ${days}-day range: ${ds} to ${de}`);
      const result = await submitSearch(session, instrumentType || "", ds, de);
      steps.push(`  \u2192 totalPages=${result.totalPages}, validation=${JSON.stringify(result.validationMessages)}`);
      if (result.totalPages > 0) {
        bestRange = days;
        bestPages = result.totalPages;
        searchResult = result;
      }
      if (result.totalPages === 0 && bestRange > 0) {
        steps.push(`  \u2192 Date range limit found: ${bestRange} days works, ${days} days fails`);
        break;
      }
    }
    if (!searchResult || bestPages === 0) {
      return {
        ok: true,
        steps,
        session: { searchActionId: session.searchActionId, cookieCount: session.cookies.length },
        search: { totalPages: 0, bestRangeDays: 0 },
        records: 0
      };
    }
    steps.push(`Fetching results page 1 (using ${bestRange}-day range, ${bestPages} pages)...`);
    const html = await fetchResultsPage(session, 1);
    steps.push(`Results HTML: ${html.length} bytes`);
    const records = parseTylerResults(html);
    steps.push(`Parsed ${records.length} records from page 1`);
    return {
      ok: true,
      steps,
      session: { searchActionId: session.searchActionId, cookieCount: session.cookies.length },
      search: { ...searchResult, bestRangeDays: bestRange },
      records: records.length,
      sampleRecord: records.length > 0 ? records[0] : null
    };
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.message}
${err.stack}` : String(err);
    steps.push(`ERROR: ${errMsg}`);
    return { ok: false, steps, error: errMsg };
  }
}
__name(testTylerConnection, "testTylerConnection");
__name2(testTylerConnection, "testTylerConnection");
async function updateTylerCheckpoint(env22, msg, totalScraped, totalResults, lastPage) {
  try {
    const sql = totalResults > 0 ? `UPDATE scrape_jobs
         SET last_page = ?, scraped_records = scraped_records + ?, total_records = ?,
             updated_at = datetime('now'), status = 'running'
         WHERE county_id = ? AND instrument_type_id = ?` : `UPDATE scrape_jobs
         SET last_page = ?, scraped_records = scraped_records + ?,
             updated_at = datetime('now'), status = 'running'
         WHERE county_id = ? AND instrument_type_id = ?`;
    const binds = totalResults > 0 ? [lastPage, totalScraped, totalResults, msg.countyId, msg.instrumentTypeId] : [lastPage, totalScraped, msg.countyId, msg.instrumentTypeId];
    await env22.DB.prepare(sql).bind(...binds).run();
  } catch {
  }
}
__name(updateTylerCheckpoint, "updateTylerCheckpoint");
__name2(updateTylerCheckpoint, "updateTylerCheckpoint");
var RECORDS_PER_PAGE = 50;
async function scrapeBatch(env22, msg) {
  if (msg.platform === "TYLER_TECH") {
    return scrapeTylerBatch(env22, msg);
  }
  const results = [];
  const pendingUploads = [];
  const relayUrl = env22.RELAY_URL;
  if (!relayUrl) {
    throw new Error("RELAY_URL not configured \u2014 tunnel relay required for PublicSearch");
  }
  const searchUrl = buildSearchUrl(msg.baseUrl, msg.instrumentType, msg.startPage);
  const firstPage = await fetchViaRelay(relayUrl, searchUrl);
  if (!firstPage) {
    throw new Error(`Relay returned empty for page ${msg.startPage}: ${searchUrl}`);
  }
  const firstPageHtml = firstPage.html || firstPage.content || "";
  const domTotal = parseDomTotalFromHtml(firstPageHtml);
  let records = extractRecords(firstPage);
  await logDebug(env22, msg, `Page ${msg.startPage}: html=${firstPageHtml.length}b, extracted=${firstPage.extracted?.length ?? "null"}, parsed=${records.length}, domTotal=${domTotal}`);
  if (records.length > 0) {
    const result = {
      county: msg.county,
      instrumentType: msg.instrumentType,
      page: msg.startPage,
      records,
      totalFound: records.length,
      domTotal,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    results.push(result);
    pendingUploads.push(uploadToR2(env22, result));
  }
  const totalPages = domTotal > 0 ? Math.ceil(domTotal / RECORDS_PER_PAGE) : msg.endPage + 1;
  let consecutiveEmpty = 0;
  let batchRecordCount = records.length;
  for (let pg = msg.startPage + 1; pg <= Math.min(msg.endPage, totalPages - 1); pg++) {
    const offset = pg * RECORDS_PER_PAGE;
    if (domTotal > 0 && offset >= domTotal) break;
    if (consecutiveEmpty >= 3) break;
    await microDelay(200 + Math.random() * 300);
    const nextUrl = buildSearchUrl(msg.baseUrl, msg.instrumentType, pg);
    const pageResp = await fetchViaRelay(relayUrl, nextUrl);
    if (!pageResp) {
      consecutiveEmpty++;
      continue;
    }
    const pageRecords = extractRecords(pageResp);
    if (pageRecords.length === 0) {
      consecutiveEmpty++;
      continue;
    }
    consecutiveEmpty = 0;
    batchRecordCount += pageRecords.length;
    const pageResult = {
      county: msg.county,
      instrumentType: msg.instrumentType,
      page: pg,
      records: pageRecords,
      totalFound: pageRecords.length,
      domTotal,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    results.push(pageResult);
    pendingUploads.push(uploadToR2(env22, pageResult));
  }
  await Promise.allSettled(pendingUploads);
  await batchUpdateCheckpoint(
    env22,
    msg,
    batchRecordCount,
    domTotal,
    results.length > 0 ? results[results.length - 1].page : msg.startPage
  );
  return results;
}
__name(scrapeBatch, "scrapeBatch");
__name2(scrapeBatch, "scrapeBatch");
async function discoverCounty(env22, msg) {
  if (msg.platform === "TYLER_TECH") {
    return discoverTyler(env22, msg);
  }
  const relayUrl = env22.RELAY_URL;
  if (!relayUrl) {
    throw new Error("RELAY_URL not configured for PublicSearch discovery");
  }
  const searchUrl = buildSearchUrl(msg.baseUrl, msg.instrumentType, 0);
  const resp = await fetchViaRelay(relayUrl, searchUrl);
  if (!resp) {
    return { instrumentType: msg.instrumentType, totalRecords: 0 };
  }
  const html = resp.html || resp.content || "";
  const total = parseDomTotalFromHtml(html);
  return { instrumentType: msg.instrumentType, totalRecords: total };
}
__name(discoverCounty, "discoverCounty");
__name2(discoverCounty, "discoverCounty");
async function fetchViaRelay(relayUrl, targetUrl) {
  const endpoint = `${relayUrl}/browser`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-ShadowGlass": "v4.1"
    },
    body: JSON.stringify({
      url: targetUrl,
      wait_for: "table tbody tr",
      timeout: 25e3
    }),
    signal: AbortSignal.timeout(6e4)
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "unknown error");
    if (response.status === 503 || response.status === 502) {
      throw new Error(`Relay unavailable (${response.status}): ${errText}`);
    }
    return null;
  }
  const data = await response.json();
  if (data.error) {
    return null;
  }
  return data;
}
__name(fetchViaRelay, "fetchViaRelay");
__name2(fetchViaRelay, "fetchViaRelay");
function extractRecords(resp) {
  if (resp.extracted && resp.extracted.length > 0) {
    return resp.extracted.map((item, idx) => {
      const parts = item.text.split("	");
      return {
        id: parts[4] || `doc_${idx}_${Date.now()}`,
        // Doc Number as ID
        grantor: parts[0] || "",
        grantee: parts[1] || "",
        instrumentType: parts[2] || "",
        recordedDate: parts[3] || "",
        filingDate: parts[3] || "",
        // Same as recorded for this portal
        bookPage: parts[5] || "",
        legalDescription: parts[6] || "",
        consideration: ""
      };
    });
  }
  const html = resp.html || resp.content || "";
  if (!html) return [];
  return parseRecordsFromHtml(html);
}
__name(extractRecords, "extractRecords");
__name2(extractRecords, "extractRecords");
function parseDomTotalFromHtml(html) {
  const match = html.match(/(\d+)\s*-\s*(\d+)\s+of\s+([\d,]+)\s+results/i);
  if (match) {
    return parseInt(match[3].replace(/,/g, ""), 10);
  }
  const totalMatch = html.match(/(?:total|found|showing)[:\s]*([\d,]+)\s*(?:results|records|documents)/i);
  if (totalMatch) {
    return parseInt(totalMatch[1].replace(/,/g, ""), 10);
  }
  return 0;
}
__name(parseDomTotalFromHtml, "parseDomTotalFromHtml");
__name2(parseDomTotalFromHtml, "parseDomTotalFromHtml");
function parseRecordsFromHtml(html) {
  const records = [];
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) {
    return parseRowsFromHtml(html);
  }
  const tbodyHtml = tbodyMatch[1];
  return parseRowsFromHtml(tbodyHtml);
}
__name(parseRecordsFromHtml, "parseRecordsFromHtml");
__name2(parseRecordsFromHtml, "parseRecordsFromHtml");
function parseRowsFromHtml(html) {
  const records = [];
  const rowChunks = html.split(/<tr\b/i).slice(1);
  for (let idx = 0; idx < rowChunks.length; idx++) {
    const rowHtml = rowChunks[idx];
    if (/<th\b/i.test(rowHtml)) continue;
    const cells = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const text = cellMatch[1].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
      cells.push(text);
    }
    if (cells.length < 7) continue;
    const idMatch = rowHtml.match(/data-(?:id|doc-id|document-id)=["']([^"']+)["']/i);
    const grantor = cells[3] || "";
    const grantee = cells[4] || "";
    const docType = cells[5] || "";
    const recordedDate = cells[6] || "";
    const docNumber = cells[7] || "";
    const bookPage = cells[8] || "";
    const legalDesc = cells[9] || "";
    const docId = idMatch ? idMatch[1] : docNumber || `doc_${idx}_${Date.now()}`;
    if (!grantor && !grantee && !docType) continue;
    records.push({
      id: docId,
      instrumentType: docType,
      filingDate: recordedDate,
      recordedDate,
      grantor,
      grantee,
      legalDescription: legalDesc,
      bookPage,
      consideration: ""
    });
  }
  return records;
}
__name(parseRowsFromHtml, "parseRowsFromHtml");
__name2(parseRowsFromHtml, "parseRowsFromHtml");
function buildSearchUrl(baseUrl, instrumentType, page) {
  const offset = page * RECORDS_PER_PAGE;
  return `${baseUrl}/results?department=RP&limit=${RECORDS_PER_PAGE}&offset=${offset}&recordedDateRange=,&searchOcrText=false&searchType=${encodeURIComponent(instrumentType)}`;
}
__name(buildSearchUrl, "buildSearchUrl");
__name2(buildSearchUrl, "buildSearchUrl");
async function uploadToR2(env22, result) {
  const key = `ENCORE/${result.county}/${result.instrumentType.replace(/ /g, "_")}/page_${String(result.page).padStart(6, "0")}.json`;
  const body = JSON.stringify(result);
  await env22.R2_RECORDS.put(key, body, {
    httpMetadata: { contentType: "application/json" },
    customMetadata: {
      county: result.county,
      instrumentType: result.instrumentType,
      page: String(result.page),
      recordCount: String(result.records.length),
      scrapedAt: result.timestamp
    }
  });
  try {
    await env22.DB.prepare(
      `INSERT OR REPLACE INTO r2_uploads (r2_key, county_id, instrument_type_id, page_number, record_count, uploaded_at)
       VALUES (?,
         (SELECT id FROM counties WHERE UPPER(name) = UPPER(?)),
         (SELECT id FROM instrument_types WHERE UPPER(name) = UPPER(?)),
         ?, ?, datetime('now'))`
    ).bind(key, result.county, result.instrumentType, result.page, result.records.length).run();
  } catch {
  }
}
__name(uploadToR2, "uploadToR2");
__name2(uploadToR2, "uploadToR2");
async function batchUpdateCheckpoint(env22, msg, totalRecordsScraped, domTotal, lastPage) {
  try {
    if (domTotal > 0) {
      await env22.DB.prepare(
        `UPDATE scrape_jobs
         SET last_page = ?, scraped_records = scraped_records + ?, total_records = ?,
             updated_at = datetime('now'), status = 'running'
         WHERE county_id = ? AND instrument_type_id = ?`
      ).bind(lastPage, totalRecordsScraped, domTotal, msg.countyId, msg.instrumentTypeId).run();
    } else {
      await env22.DB.prepare(
        `UPDATE scrape_jobs
         SET last_page = ?, scraped_records = scraped_records + ?,
             updated_at = datetime('now'), status = 'running'
         WHERE county_id = ? AND instrument_type_id = ?`
      ).bind(lastPage, totalRecordsScraped, msg.countyId, msg.instrumentTypeId).run();
    }
  } catch {
  }
}
__name(batchUpdateCheckpoint, "batchUpdateCheckpoint");
__name2(batchUpdateCheckpoint, "batchUpdateCheckpoint");
function microDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(microDelay, "microDelay");
__name2(microDelay, "microDelay");
async function logDebug(env22, msg, message) {
  try {
    await env22.DB.prepare(
      `INSERT INTO scrape_logs (job_id, level, message, metadata, created_at)
       VALUES (
         (SELECT id FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?),
         'debug', ?, ?, datetime('now'))`
    ).bind(msg.countyId, msg.instrumentTypeId, message, JSON.stringify({ county: msg.county, type: msg.instrumentType })).run();
  } catch {
  }
}
__name(logDebug, "logDebug");
__name2(logDebug, "logDebug");
var DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ShadowGlass Cloud v4.0 \u2014 PHANTOM IN THE FOG</title>
  <style>
    :root {
      --bg: #0a0e17; --card: #111827; --border: #1e293b;
      --accent: #06b6d4; --green: #10b981; --red: #ef4444;
      --orange: #f59e0b; --text: #e2e8f0; --muted: #64748b;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: var(--bg); color: var(--text); min-height: 100vh;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 1.8rem; color: var(--accent); margin-bottom: 0.5rem; }
    .subtitle { color: var(--muted); margin-bottom: 2rem; font-size: 0.9rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; }
    .card h3 { color: var(--accent); margin-bottom: 1rem; font-size: 1rem; }
    .stat { font-size: 2.5rem; font-weight: bold; color: var(--green); }
    .stat.warn { color: var(--orange); }
    .stat.error { color: var(--red); }
    .stat-label { color: var(--muted); font-size: 0.8rem; margin-top: 0.3rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    th { color: var(--accent); font-weight: 600; }
    .badge { padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge.running { background: #1e3a5f; color: #60a5fa; }
    .badge.completed { background: #064e3b; color: #34d399; }
    .badge.complete { background: #064e3b; color: #34d399; }
    .badge.failed { background: #450a0a; color: #fca5a5; }
    .badge.error { background: #450a0a; color: #fca5a5; }
    .badge.pending { background: #3b3820; color: #fbbf24; }
    .badge.paused { background: #3b2f20; color: #fb923c; }
    .progress-bar { background: var(--border); border-radius: 4px; height: 6px; overflow: hidden; }
    .progress-fill { background: var(--green); height: 100%; transition: width 0.3s; }
    .btn { background: var(--accent); color: var(--bg); border: none; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: bold; font-size: 0.85rem; }
    .btn:hover { opacity: 0.85; }
    .btn.green { background: var(--green); }
    .btn.orange { background: var(--orange); }
    .btn.red { background: var(--red); }
    .btn.sm { padding: 0.3rem 0.6rem; font-size: 0.75rem; }
    .form-row { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center; }
    .form-row input, .form-row select {
      background: var(--bg); border: 1px solid var(--border); color: var(--text);
      padding: 0.5rem 0.75rem; border-radius: 6px; font-family: inherit; font-size: 0.85rem;
    }
    .form-row select { min-width: 160px; }
    #log {
      background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
      padding: 1rem; height: 180px; overflow-y: auto; font-size: 0.8rem;
      color: var(--green); white-space: pre-wrap; line-height: 1.5;
    }
    .tabs { display: flex; gap: 0; margin-bottom: 0; border-bottom: 2px solid var(--border); }
    .tab {
      padding: 0.6rem 1.2rem; cursor: pointer; color: var(--muted);
      font-size: 0.85rem; border-bottom: 2px solid transparent; margin-bottom: -2px;
    }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .search-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .search-row input {
      background: var(--bg); border: 1px solid var(--border); color: var(--text);
      padding: 0.5rem 0.75rem; border-radius: 6px; font-family: inherit; font-size: 0.85rem; flex: 1; min-width: 140px;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .loading { animation: pulse 1.5s infinite; }
  </style>
</head>
<body>
  <div class="container">
    <h1>&#x2B21; SHADOWGLASS CLOUD v4.0</h1>
    <p class="subtitle">PHANTOM IN THE FOG &#8212; Cloudflare Edge Extraction Engine | echo-op.com</p>

    <div class="grid">
      <div class="card">
        <h3>Total Records</h3>
        <div class="stat" id="totalRecords">&#8212;</div>
        <div class="stat-label">Scraped across all counties</div>
      </div>
      <div class="card">
        <h3>R2 Uploads</h3>
        <div class="stat" id="r2Uploads">&#8212;</div>
        <div class="stat-label">Files in cloud storage</div>
      </div>
      <div class="card">
        <h3>Active Counties</h3>
        <div class="stat" id="activeCounties">&#8212;</div>
        <div class="stat-label">Permian Basin + NM</div>
      </div>
      <div class="card">
        <h3>Jobs Running</h3>
        <div class="stat" id="runningJobs">&#8212;</div>
        <div class="stat-label" id="jobSummary">&#8212;</div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab active" onclick="switchTab('scrape')">Launch Scrape</div>
      <div class="tab" onclick="switchTab('jobs')">Job Monitor</div>
      <div class="tab" onclick="switchTab('search')">Search Records</div>
    </div>

    <!-- SCRAPE TAB -->
    <div class="tab-content active" id="tab-scrape">
      <div class="card" style="border-top-left-radius:0; border-top-right-radius:0;">
        <div class="form-row">
          <select id="county"><option value="">Loading counties...</option></select>
          <select id="instrumentType">
            <option value="">All Instruments</option>
            <option value="DEED">DEED</option>
            <option value="WARRANTY DEED">WARRANTY DEED</option>
            <option value="MINERAL DEED">MINERAL DEED</option>
            <option value="OIL AND GAS LEASE">OIL AND GAS LEASE</option>
            <option value="DEED OF TRUST">DEED OF TRUST</option>
            <option value="RELEASE">RELEASE</option>
            <option value="ASSIGNMENT">ASSIGNMENT</option>
            <option value="AMENDMENT">AMENDMENT</option>
            <option value="EASEMENT">EASEMENT</option>
            <option value="RIGHT OF WAY">RIGHT OF WAY</option>
            <option value="LIEN">LIEN</option>
            <option value="ABSTRACT OF JUDGMENT">ABSTRACT OF JUDGMENT</option>
            <option value="POWER OF ATTORNEY">POWER OF ATTORNEY</option>
            <option value="PLAT">PLAT</option>
            <option value="AFFIDAVIT">AFFIDAVIT</option>
            <option value="ROYALTY DEED">ROYALTY DEED</option>
            <option value="CORRECTION DEED">CORRECTION DEED</option>
            <option value="AFFIDAVIT OF HEIRSHIP">AFFIDAVIT OF HEIRSHIP</option>
            <option value="UCC FILING">UCC FILING</option>
            <option value="LIS PENDENS">LIS PENDENS</option>
            <option value="RATIFICATION">RATIFICATION</option>
          </select>
          <button class="btn" onclick="launchScrape()">LAUNCH</button>
          <button class="btn green" onclick="launchAll()">ALL INSTRUMENTS</button>
          <button class="btn orange" onclick="launchMulti()">ALL COUNTIES</button>
          <button class="btn" onclick="launchDiscovery()" style="background:#8b5cf6">DISCOVER</button>
        </div>
        <div id="log">ShadowGlass Cloud v4.0 \u2014 PHANTOM IN THE FOG\\n30 concurrent browsers / 180 API req per min\\nR2 same-datacenter upload: ~1ms latency\\n</div>
      </div>
    </div>

    <!-- JOBS TAB -->
    <div class="tab-content" id="tab-jobs">
      <div class="card" style="border-top-left-radius:0; border-top-right-radius:0;">
        <div class="form-row">
          <button class="btn sm" onclick="loadJobs()">Refresh</button>
          <span style="color:var(--muted);font-size:0.8rem" id="jobRefreshTime">&#8212;</span>
        </div>
        <table>
          <thead><tr><th>County</th><th>Instrument</th><th>Status</th><th>Progress</th><th>Records</th><th>Actions</th></tr></thead>
          <tbody id="jobsTable"></tbody>
        </table>
      </div>
    </div>

    <!-- SEARCH TAB -->
    <div class="tab-content" id="tab-search">
      <div class="card" style="border-top-left-radius:0; border-top-right-radius:0;">
        <div class="search-row">
          <input type="text" id="searchGrantor" placeholder="Grantor name...">
          <input type="text" id="searchGrantee" placeholder="Grantee name...">
          <input type="date" id="searchFrom" placeholder="From date">
          <input type="date" id="searchTo" placeholder="To date">
          <button class="btn" onclick="searchRecords()">Search</button>
        </div>
        <table>
          <thead><tr><th>ID</th><th>Type</th><th>Grantor</th><th>Grantee</th><th>Filing Date</th><th>Legal Desc</th></tr></thead>
          <tbody id="searchResults"></tbody>
        </table>
        <div style="margin-top:1rem;display:flex;gap:0.5rem;">
          <button class="btn sm" id="prevPage" onclick="searchPage(-1)" disabled>Prev</button>
          <span style="color:var(--muted);font-size:0.8rem" id="pageInfo">&#8212;</span>
          <button class="btn sm" id="nextPage" onclick="searchPage(1)">Next</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    let searchOffset = 0;
    const LIMIT = 50;

    // \u2500\u2500\u2500 Tab switching \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function switchTab(name) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-' + name).classList.add('active');
      if (name === 'jobs') loadJobs();
    }

    // \u2500\u2500\u2500 Logging \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    function log(msg) {
      const el = document.getElementById('log');
      el.textContent += new Date().toLocaleTimeString() + ' ' + msg + '\\n';
      el.scrollTop = el.scrollHeight;
    }

    // \u2500\u2500\u2500 Load counties \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    async function loadCounties() {
      try {
        const resp = await fetch('/counties');
        const data = await resp.json();
        const sel = document.getElementById('county');
        sel.innerHTML = (data.data || []).map(c =>
          '<option value="' + c.name + '">' + c.name + ' (' + c.state + ')</option>'
        ).join('');
      } catch (e) { console.error('loadCounties:', e); }
    }

    // \u2500\u2500\u2500 Load stats \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    async function loadStats() {
      try {
        const resp = await fetch('/stats');
        const data = await resp.json();
        const s = data.data || {};
        const j = s.jobs || {};
        document.getElementById('totalRecords').textContent = (j.scrapedRecords || 0).toLocaleString();
        document.getElementById('r2Uploads').textContent = (s.r2Uploads || 0).toLocaleString();
        document.getElementById('activeCounties').textContent = s.activeCounties || 0;
        document.getElementById('runningJobs').textContent = j.runningJobs || 0;
        document.getElementById('jobSummary').textContent =
          (j.completedJobs || 0) + ' done / ' + (j.failedJobs || 0) + ' failed / ' + (j.totalJobs || 0) + ' total';
      } catch (e) { console.error('loadStats:', e); }
    }

    // \u2500\u2500\u2500 Load jobs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    async function loadJobs() {
      try {
        const resp = await fetch('/status');
        const data = await resp.json();
        const jobs = data.data || [];
        const tbody = document.getElementById('jobsTable');
        tbody.innerHTML = jobs.map(j => {
          const pct = j.progress || 0;
          return '<tr>' +
            '<td>' + j.county + '</td>' +
            '<td style="font-size:0.8rem">' + j.instrumentType + '</td>' +
            '<td><span class="badge ' + j.status + '">' + j.status + '</span></td>' +
            '<td style="min-width:120px"><div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div><span style="font-size:0.75rem;color:var(--muted)">' + pct + '%</span></td>' +
            '<td>' + (j.scrapedRecords || 0).toLocaleString() + ' / ' + (j.totalRecords || 0).toLocaleString() + '</td>' +
            '<td>' + (j.status === 'running' ? '<button class="btn sm red" onclick="pauseJob(' + j.id + ')">Pause</button>' : '') +
                     (j.status === 'paused' ? '<button class="btn sm green" onclick="resumeJob(' + j.id + ')">Resume</button>' : '') + '</td>' +
            '</tr>';
        }).join('');
        document.getElementById('jobRefreshTime').textContent = 'Updated: ' + new Date().toLocaleTimeString();
      } catch (e) { console.error('loadJobs:', e); }
    }

    // \u2500\u2500\u2500 Launch scrape \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    async function launchScrape() {
      const county = document.getElementById('county').value;
      const instrumentType = document.getElementById('instrumentType').value;
      if (!county) { log('Select a county first'); return; }
      if (!instrumentType) { log('Select an instrument type (or use ALL INSTRUMENTS)'); return; }
      log('Launching ' + county + ' / ' + instrumentType + '...');
      try {
        const resp = await fetch('/scrape', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ county, instrumentType })
        });
        const result = await resp.json();
        log(result.ok ? 'Queued: ' + (result.data?.message || 'OK') : 'Error: ' + result.error);
      } catch (e) { log('Error: ' + e.message); }
      setTimeout(loadStats, 2000);
    }

    // \u2500\u2500\u2500 Launch all instruments \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    async function launchAll() {
      const county = document.getElementById('county').value;
      if (!county) { log('Select a county first'); return; }
      log('Launching ALL instruments for ' + county + '...');
      try {
        const resp = await fetch('/scrape/all', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ county })
        });
        const result = await resp.json();
        log(result.ok ? 'Queued: ' + (result.data?.message || 'OK') : 'Error: ' + result.error);
      } catch (e) { log('Error: ' + e.message); }
      setTimeout(loadStats, 2000);
    }

    // \u2500\u2500\u2500 Launch multi-county \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    async function launchMulti() {
      log('Launching ALL COUNTIES (top 8 instruments each)...');
      try {
        const countyResp = await fetch('/counties');
        const countyData = await countyResp.json();
        const counties = (countyData.data || []).filter(c => c.is_active).map(c => c.name);
        const resp = await fetch('/scrape/multi', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ counties })
        });
        const result = await resp.json();
        log(result.ok ? 'Multi-county queued: ' + counties.length + ' counties' : 'Error: ' + result.error);
      } catch (e) { log('Error: ' + e.message); }
      setTimeout(loadStats, 3000);
    }

    // \u2500\u2500\u2500 Launch discovery \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    async function launchDiscovery() {
      const county = document.getElementById('county').value;
      if (!county) { log('Select a county first'); return; }
      log('Discovering record counts for ' + county + '...');
      try {
        const resp = await fetch('/discover', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ county })
        });
        const result = await resp.json();
        log(result.ok ? 'Discovery: ' + (result.data?.message || 'OK') : 'Error: ' + result.error);
      } catch (e) { log('Error: ' + e.message); }
    }

    // \u2500\u2500\u2500 Pause / Resume \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    async function pauseJob(id) {
      await fetch('/pause/' + id, { method: 'POST' });
      loadJobs();
    }
    async function resumeJob(id) {
      await fetch('/resume/' + id, { method: 'POST' });
      loadJobs();
    }

    // \u2500\u2500\u2500 Search records \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    async function searchRecords() {
      searchOffset = 0;
      await doSearch();
    }
    async function searchPage(dir) {
      searchOffset = Math.max(0, searchOffset + dir * LIMIT);
      await doSearch();
    }
    async function doSearch() {
      const params = new URLSearchParams();
      const county = document.getElementById('county').value;
      const grantor = document.getElementById('searchGrantor').value;
      const grantee = document.getElementById('searchGrantee').value;
      const from = document.getElementById('searchFrom').value;
      const to = document.getElementById('searchTo').value;
      if (county) params.set('county', county);
      if (grantor) params.set('grantor', grantor);
      if (grantee) params.set('grantee', grantee);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('limit', LIMIT);
      params.set('offset', searchOffset);

      try {
        const resp = await fetch('/search?' + params.toString());
        const data = await resp.json();
        const rows = data.data || [];
        document.getElementById('searchResults').innerHTML = rows.map(r =>
          '<tr><td>' + (r.external_id || r.id) + '</td>' +
          '<td style="font-size:0.8rem">' + (r.instrument_type_id || '') + '</td>' +
          '<td>' + (r.grantor || '') + '</td>' +
          '<td>' + (r.grantee || '') + '</td>' +
          '<td>' + (r.filing_date || '') + '</td>' +
          '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (r.legal_description || '') + '</td></tr>'
        ).join('') || '<tr><td colspan="6" style="color:var(--muted)">No results</td></tr>';
        document.getElementById('pageInfo').textContent = 'Showing ' + (searchOffset + 1) + '-' + (searchOffset + rows.length);
        document.getElementById('prevPage').disabled = searchOffset === 0;
        document.getElementById('nextPage').disabled = rows.length < LIMIT;
      } catch (e) { console.error('search:', e); }
    }

    // \u2500\u2500\u2500 Init \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    loadCounties();
    loadStats();
    setInterval(loadStats, 15000);
  <\/script>
</body>
</html>`;
var VERSION = "5.0.0";
var INSTRUMENT_TYPES = [
  "DEED",
  "WARRANTY DEED",
  "MINERAL DEED",
  "OIL AND GAS LEASE",
  "DEED OF TRUST",
  "RELEASE",
  "ASSIGNMENT",
  "AMENDMENT",
  "EASEMENT",
  "RIGHT OF WAY",
  "LIEN",
  "ABSTRACT OF JUDGMENT",
  "POWER OF ATTORNEY",
  "PLAT",
  "AFFIDAVIT",
  "ROYALTY DEED",
  "CORRECTION DEED",
  "AFFIDAVIT OF HEIRSHIP",
  "UCC FILING",
  "LIS PENDENS",
  "RATIFICATION"
];
var PAGES_PER_BATCH = 1;
var RateLimiter = class {
  static {
    __name(this, "RateLimiter");
  }
  constructor(kv, maxPerMin = 30, maxConcurrent = 30) {
    this.kv = kv;
    this.maxPerMin = maxPerMin;
    this.maxConcurrent = maxConcurrent;
  }
  static {
    __name2(this, "RateLimiter");
  }
  async canProceed() {
    const minute = Math.floor(Date.now() / 6e4);
    const key = `ratelimit:${minute}`;
    const current = parseInt(await this.kv.get(key) || "0");
    if (current >= this.maxPerMin) return false;
    await this.kv.put(key, String(current + 1), { expirationTtl: 120 });
    return true;
  }
  async acquireBrowser() {
    const key = "concurrent:browsers";
    const current = parseInt(await this.kv.get(key) || "0");
    if (current >= this.maxConcurrent) return false;
    await this.kv.put(key, String(current + 1), { expirationTtl: 300 });
    return true;
  }
  async releaseBrowser() {
    const key = "concurrent:browsers";
    const current = parseInt(await this.kv.get(key) || "0");
    await this.kv.put(key, String(Math.max(0, current - 1)), { expirationTtl: 300 });
  }
};
var index_default = {
  // ═══ HTTP Handler ═══════════════════════════════════════════
  async fetch(request, env22) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    try {
      if (method === "GET" && (path === "/" || path === "/dashboard")) {
        return new Response(DASHBOARD_HTML, { headers: { "Content-Type": "text/html", ...cors } });
      }
      if (method === "GET" && path === "/health") {
        return json({ ok: true, data: { version: VERSION, status: "operational", codename: "PHANTOM IN THE FOG", platforms: ["PUBLICSEARCH", "TYLER_TECH", "TEXASFILE"] }, timestamp: now() }, 200, cors);
      }
      if (method === "GET" && path === "/stats") {
        return json(await getStats(env22), 200, cors);
      }
      if (method === "GET" && path === "/counties") {
        const { results } = await env22.DB.prepare("SELECT id, name, state, base_url, platform, is_active FROM counties ORDER BY platform, name").all();
        return json({ ok: true, data: results, timestamp: now() }, 200, cors);
      }
      if (method === "GET" && path === "/search") {
        const params = {
          q: url.searchParams.get("q") || void 0,
          county: url.searchParams.get("county") || void 0,
          instrumentType: url.searchParams.get("type") || void 0,
          grantor: url.searchParams.get("grantor") || void 0,
          grantee: url.searchParams.get("grantee") || void 0,
          section: url.searchParams.get("section") || void 0,
          block: url.searchParams.get("block") || void 0,
          dateFrom: url.searchParams.get("from") || void 0,
          dateTo: url.searchParams.get("to") || void 0,
          limit: parseInt(url.searchParams.get("limit") || "50"),
          offset: parseInt(url.searchParams.get("offset") || "0")
        };
        return json(await searchRecords(env22, params), 200, cors);
      }
      if (method === "GET" && path.startsWith("/record/")) {
        const key = decodeURIComponent(path.slice(8));
        const obj = await env22.R2_RECORDS.get(key);
        if (!obj) return json({ ok: false, error: "Not found", timestamp: now() }, 404, cors);
        return new Response(obj.body, {
          headers: { "Content-Type": obj.httpMetadata?.contentType || "application/json", ...cors }
        });
      }
      if (method === "GET" && path === "/status") {
        return json(await getAllJobStatuses(env22), 200, cors);
      }
      if (method === "GET" && path.startsWith("/status/")) {
        const county = decodeURIComponent(path.split("/status/")[1]);
        return json(await getCountyJobStatuses(env22, county), 200, cors);
      }
      if (method === "POST" && path === "/scrape") {
        const body = await request.json();
        return json(await submitScrapeJob(env22, body.county, body.instrumentType, body.startPage ?? 0), 200, cors);
      }
      if (method === "POST" && path === "/scrape/all") {
        const body = await request.json();
        return json(await submitAllInstruments(env22, body.county), 200, cors);
      }
      if (method === "POST" && path === "/scrape/multi") {
        const body = await request.json();
        return json(await submitMultiCounty(env22, body.counties), 200, cors);
      }
      if (method === "POST" && path === "/discover") {
        const body = await request.json();
        return json(await submitDiscovery(env22, body.county), 200, cors);
      }
      if (method === "POST" && path.startsWith("/pause/")) {
        const jobId = parseInt(path.split("/pause/")[1], 10);
        return json(await pauseJob(env22, jobId), 200, cors);
      }
      if (method === "POST" && path.startsWith("/resume/")) {
        const jobId = parseInt(path.split("/resume/")[1], 10);
        return json(await resumeJob(env22, jobId), 200, cors);
      }
      if (method === "POST" && path === "/scrape/direct") {
        const body = await request.json();
        const county = await env22.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?)").bind(body.county.toUpperCase()).first();
        if (!county) return json({ ok: false, error: `County not found: ${body.county}`, timestamp: now() }, 404, cors);
        const instType = await env22.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(body.instrumentType.toUpperCase()).first();
        if (!instType) return json({ ok: false, error: `Instrument type not found: ${body.instrumentType}`, timestamp: now() }, 404, cors);
        const platform22 = county.platform || "PUBLICSEARCH";
        const maxPages = body.pages || 5;
        const msg = {
          type: "scrape_batch",
          county: body.county.toUpperCase(),
          countyId: county.id,
          baseUrl: county.base_url,
          instrumentType: body.instrumentType.toUpperCase(),
          instrumentTypeId: instType.id,
          startPage: 0,
          endPage: maxPages - 1,
          platform: platform22
        };
        try {
          const results = await scrapeBatch(env22, msg);
          const totalRecords = results.reduce((sum, r) => sum + r.records.length, 0);
          return json({
            ok: true,
            data: {
              message: `Direct scrape: ${totalRecords} records from ${results.length} pages [${platform22}]`,
              platform: platform22,
              pagesScraped: results.length,
              totalRecords,
              sampleRecord: results[0]?.records[0] || null
            },
            timestamp: now()
          }, 200, cors);
        } catch (err) {
          const errMsg = err instanceof Error ? `${err.message}
${err.stack}` : String(err);
          return json({ ok: false, error: errMsg, timestamp: now() }, 500, cors);
        }
      }
      if (method === "GET" && path === "/test/tyler") {
        const county = url.searchParams.get("county") || "ECTOR";
        const itype = url.searchParams.get("type") || "";
        const countyRow = await env22.DB.prepare("SELECT base_url FROM counties WHERE UPPER(name) = UPPER(?) AND platform = 'TYLER_TECH'").bind(county.toUpperCase()).first();
        if (!countyRow) return json({ ok: false, error: `Tyler Tech county "${county}" not found in D1`, timestamp: now() }, 404, cors);
        const result = await testTylerConnection(countyRow.base_url, itype);
        return json({ ok: result.ok, data: result, timestamp: now() }, result.ok ? 200 : 500, cors);
      }
      return json({
        ok: false,
        error: "Not found",
        data: {
          service: `ShadowGlass Cloud v${VERSION} \u2014 PHANTOM IN THE FOG (Multi-Platform)`,
          endpoints: [
            "GET  /              Dashboard",
            "GET  /health        Health check",
            "GET  /stats         Aggregate statistics",
            "GET  /status        All job statuses",
            "GET  /counties      List counties",
            "GET  /search        Search records (?county=&type=&grantor=&grantee=&from=&to=)",
            "GET  /record/{key}  Download from R2",
            "POST /scrape        {county, instrumentType, startPage?}",
            "POST /scrape/all    {county}",
            "POST /scrape/multi  {counties: [...]}",
            "POST /discover      {county}",
            "POST /pause/{id}    Pause job",
            "POST /resume/{id}   Resume job"
          ]
        },
        timestamp: now()
      }, 404, cors);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return json({ ok: false, error: msg, timestamp: now() }, 500, cors);
    }
  },
  // ═══ Queue Consumer ═════════════════════════════════════════
  async queue(batch, env22) {
    console.log(`[QUEUE] Received batch of ${batch.messages.length} messages`);
    let tylerProcessed = false;
    for (const message of batch.messages) {
      const msg = message.body;
      console.log(`[QUEUE] Processing: type=${msg.type} county=${msg.county} itype=${msg.instrumentType} platform=${msg.platform} pages=${msg.startPage}-${msg.endPage}`);
      try {
        if (msg.platform === "TYLER_TECH" && msg.type === "scrape_batch" && tylerProcessed) {
          console.log(`[QUEUE] Tyler Tech serialized \u2014 retrying: ${msg.county}/${msg.instrumentType} chunk=${msg.startPage}`);
          message.retry();
          continue;
        }
        if (msg.platform !== "TYLER_TECH") {
          const rateLimiter = new RateLimiter(env22.DEDUP_KV);
          if (!await rateLimiter.canProceed()) {
            console.log(`[QUEUE] Rate limited, retrying: ${msg.county}/${msg.instrumentType}`);
            message.retry();
            continue;
          }
        }
        if (msg.type === "discovery") {
          const result = await discoverCounty(env22, msg);
          await env22.DB.prepare(
            `INSERT INTO scrape_jobs (county_id, instrument_type_id, status, total_records, updated_at)
             VALUES (?, ?, 'pending', ?, datetime('now'))
             ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET total_records = ?, updated_at = datetime('now')`
          ).bind(msg.countyId, msg.instrumentTypeId, result.totalRecords, result.totalRecords).run();
          if (result.totalRecords > 0) {
            const isTyler = msg.platform === "TYLER_TECH";
            const recordsPerPage = isTyler ? 100 : 50;
            const totalPages = Math.ceil(result.totalRecords / recordsPerPage);
            console.log(`[QUEUE] Discovery complete: ${msg.county}/${msg.instrumentType} [${msg.platform}] \u2014 ${result.totalRecords} records, ${totalPages} pages/chunks`);
            await enqueueBatches(env22, msg, totalPages, 1);
          }
          message.ack();
        } else if (msg.type === "scrape_batch") {
          console.log(`[QUEUE] Scrape batch: ${msg.county}/${msg.instrumentType} pages ${msg.startPage}-${msg.endPage} [${msg.platform}]`);
          const job = await env22.DB.prepare(
            "SELECT status FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?"
          ).bind(msg.countyId, msg.instrumentTypeId).first();
          if (job?.status === "paused") {
            console.log(`[QUEUE] Job paused, skipping: ${msg.county}/${msg.instrumentType}`);
            message.ack();
            continue;
          }
          console.log(`[QUEUE] Calling scrapeBatch for ${msg.county}/${msg.instrumentType}...`);
          if (msg.platform === "TYLER_TECH") tylerProcessed = true;
          const results = await scrapeBatch(env22, msg);
          const totalRecords = results.reduce((sum, r) => sum + r.records.length, 0);
          await env22.DB.prepare(
            `INSERT INTO scrape_logs (job_id, level, message, metadata, created_at)
             VALUES (
               (SELECT id FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?),
               'info', ?, ?, datetime('now'))`
          ).bind(
            msg.countyId,
            msg.instrumentTypeId,
            `Batch pages ${msg.startPage}-${msg.endPage}: ${totalRecords} records`,
            JSON.stringify({ pages: results.length, records: totalRecords })
          ).run();
          const checkpoint = await env22.DB.prepare(
            "SELECT scraped_records, total_records FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?"
          ).bind(msg.countyId, msg.instrumentTypeId).first();
          if (checkpoint && checkpoint.total_records > 0 && checkpoint.scraped_records >= checkpoint.total_records) {
            await env22.DB.prepare(
              `UPDATE scrape_jobs SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
               WHERE county_id = ? AND instrument_type_id = ?`
            ).bind(msg.countyId, msg.instrumentTypeId).run();
            await chainNextJob(env22, msg.countyId);
          }
          message.ack();
        } else {
          message.ack();
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errStack = err instanceof Error ? err.stack : "";
        console.error(`[QUEUE ERROR] ${msg.county}/${msg.instrumentType}: ${errMsg}
${errStack}`);
        try {
          await env22.DB.prepare(
            `INSERT INTO scrape_logs (job_id, level, message, metadata, created_at)
             VALUES ((SELECT id FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?),
                     'error', ?, ?, datetime('now'))`
          ).bind(msg.countyId, msg.instrumentTypeId, errMsg, JSON.stringify({ page: msg.startPage, stack: errStack })).run();
        } catch (logErr) {
          console.error(`[QUEUE] Failed to write error log: ${logErr}`);
        }
        message.retry();
      }
    }
  },
  // ═══ Cron Handler (perpetual restart — catches stalls) ═════
  async scheduled(_event, env22, _ctx) {
    const { results: allCounties } = await env22.DB.prepare(
      "SELECT id, name, base_url, platform FROM counties WHERE is_active = 1"
    ).all();
    if (!allCounties?.length) return;
    for (const county of allCounties) {
      const activeJob = await env22.DB.prepare(
        "SELECT COUNT(*) as cnt FROM scrape_jobs WHERE county_id = ? AND status IN ('running', 'pending')"
      ).bind(county.id).first();
      if (activeJob && activeJob.cnt > 0) continue;
      const platform22 = county.platform || "PUBLICSEARCH";
      for (const instTypeName of INSTRUMENT_TYPES) {
        const instType = await env22.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instTypeName).first();
        if (!instType) continue;
        const recent = await env22.DB.prepare(
          "SELECT completed_at FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ? AND completed_at > datetime('now', '-24 hours')"
        ).bind(county.id, instType.id).first();
        if (recent) continue;
        await env22.SCRAPE_QUEUE.send({
          type: "discovery",
          county: county.name,
          countyId: county.id,
          baseUrl: county.base_url,
          instrumentType: instTypeName,
          instrumentTypeId: instType.id,
          startPage: 0,
          endPage: 0,
          platform: platform22
        });
      }
    }
  }
};
async function submitScrapeJob(env22, countyName, instrumentType, startPage) {
  const county = await env22.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?)").bind(countyName.toUpperCase()).first();
  if (!county) return { ok: false, error: `County "${countyName}" not found`, timestamp: now() };
  const instType = await env22.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instrumentType.toUpperCase()).first();
  if (!instType) return { ok: false, error: `Instrument type "${instrumentType}" not found`, timestamp: now() };
  const platform22 = county.platform || "PUBLICSEARCH";
  await env22.DB.prepare(
    `INSERT INTO scrape_jobs (county_id, instrument_type_id, status, last_page, started_at, updated_at)
     VALUES (?, ?, 'running', ?, datetime('now'), datetime('now'))
     ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET
       status = 'running', last_page = ?, started_at = datetime('now'), updated_at = datetime('now')`
  ).bind(county.id, instType.id, startPage, startPage).run();
  await env22.SCRAPE_QUEUE.send({
    type: "discovery",
    county: countyName.toUpperCase(),
    countyId: county.id,
    baseUrl: county.base_url,
    instrumentType: instrumentType.toUpperCase(),
    instrumentTypeId: instType.id,
    startPage,
    endPage: startPage,
    platform: platform22
  });
  return { ok: true, data: { message: `Scrape job queued for ${countyName} / ${instrumentType} [${platform22}]`, startPage }, timestamp: now() };
}
__name(submitScrapeJob, "submitScrapeJob");
__name2(submitScrapeJob, "submitScrapeJob");
async function submitAllInstruments(env22, countyName) {
  const county = await env22.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?)").bind(countyName.toUpperCase()).first();
  if (!county) return { ok: false, error: `County "${countyName}" not found`, timestamp: now() };
  const platform22 = county.platform || "PUBLICSEARCH";
  let queued = 0;
  for (const instType of INSTRUMENT_TYPES) {
    const inst = await env22.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instType).first();
    if (!inst) continue;
    await env22.DB.prepare(
      `INSERT INTO scrape_jobs (county_id, instrument_type_id, status, started_at, updated_at)
       VALUES (?, ?, 'running', datetime('now'), datetime('now'))
       ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET
         status = 'running', started_at = datetime('now'), updated_at = datetime('now')`
    ).bind(county.id, inst.id).run();
    await env22.SCRAPE_QUEUE.send({
      type: "discovery",
      county: countyName.toUpperCase(),
      countyId: county.id,
      baseUrl: county.base_url,
      instrumentType: instType,
      instrumentTypeId: inst.id,
      startPage: 0,
      endPage: 0,
      platform: platform22
    });
    queued++;
  }
  return { ok: true, data: { message: `${queued} instrument types queued for ${countyName} [${platform22}]` }, timestamp: now() };
}
__name(submitAllInstruments, "submitAllInstruments");
__name2(submitAllInstruments, "submitAllInstruments");
async function submitMultiCounty(env22, counties) {
  const results = {};
  for (const countyName of counties) {
    const county = await env22.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?)").bind(countyName.toUpperCase()).first();
    if (!county) {
      results[countyName] = { error: "Not found" };
      continue;
    }
    const platform22 = county.platform || "PUBLICSEARCH";
    let queued = 0;
    for (const instType of INSTRUMENT_TYPES) {
      const inst = await env22.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instType).first();
      if (!inst) continue;
      await env22.DB.prepare(
        `INSERT INTO scrape_jobs (county_id, instrument_type_id, status, started_at, updated_at)
         VALUES (?, ?, 'running', datetime('now'), datetime('now'))
         ON CONFLICT(county_id, instrument_type_id) DO UPDATE SET
           status = 'running', started_at = datetime('now'), updated_at = datetime('now')`
      ).bind(county.id, inst.id).run();
      await env22.SCRAPE_QUEUE.send({
        type: "discovery",
        county: countyName.toUpperCase(),
        countyId: county.id,
        baseUrl: county.base_url,
        instrumentType: instType,
        instrumentTypeId: inst.id,
        startPage: 0,
        endPage: 0,
        platform: platform22
      });
      queued++;
    }
    results[countyName] = { queued, platform: platform22 };
  }
  return { ok: true, data: { message: `Multi-county scrape queued`, results }, timestamp: now() };
}
__name(submitMultiCounty, "submitMultiCounty");
__name2(submitMultiCounty, "submitMultiCounty");
async function submitDiscovery(env22, countyName) {
  const county = await env22.DB.prepare("SELECT id, base_url, platform FROM counties WHERE UPPER(name) = UPPER(?)").bind(countyName.toUpperCase()).first();
  if (!county) return { ok: false, error: `County "${countyName}" not found`, timestamp: now() };
  const platform22 = county.platform || "PUBLICSEARCH";
  let queued = 0;
  for (const instType of INSTRUMENT_TYPES) {
    const inst = await env22.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instType).first();
    if (!inst) continue;
    await env22.SCRAPE_QUEUE.send({
      type: "discovery",
      county: countyName.toUpperCase(),
      countyId: county.id,
      baseUrl: county.base_url,
      instrumentType: instType,
      instrumentTypeId: inst.id,
      startPage: 0,
      endPage: 0,
      platform: platform22
    });
    queued++;
  }
  return { ok: true, data: { message: `Discovery queued for ${queued} instruments in ${countyName} [${platform22}]` }, timestamp: now() };
}
__name(submitDiscovery, "submitDiscovery");
__name2(submitDiscovery, "submitDiscovery");
async function searchRecords(env22, params) {
  let sql = "SELECT * FROM deed_records WHERE 1=1";
  const binds = [];
  if (params.county) {
    sql += " AND UPPER(county) = UPPER(?)";
    binds.push(params.county);
  }
  if (params.q) {
    sql += " AND (legal_description LIKE ? OR legal_normalized LIKE ? OR grantor LIKE ? OR grantee LIKE ?)";
    const qWild = "%" + params.q + "%";
    binds.push(qWild, qWild, qWild, qWild);
  }
  if (params.section) {
    sql += " AND (section LIKE ? OR legal_description LIKE ? OR legal_description LIKE ?)";
    binds.push("%" + params.section + "%", "%SEC " + params.section + "%", "%SECTION " + params.section + "%");
  }
  if (params.block) {
    sql += " AND (block LIKE ? OR legal_description LIKE ? OR legal_description LIKE ?)";
    binds.push("%" + params.block + "%", "%BLK " + params.block + "%", "%BLOCK " + params.block + "%");
  }
  if (params.instrumentType) {
    sql += " AND UPPER(instrument_type) = UPPER(?)";
    binds.push(params.instrumentType);
  }
  if (params.grantor) {
    sql += " AND grantor LIKE ?";
    binds.push("%" + params.grantor + "%");
  }
  if (params.grantee) {
    sql += " AND grantee LIKE ?";
    binds.push("%" + params.grantee + "%");
  }
  if (params.dateFrom) {
    sql += " AND recorded_date >= ?";
    binds.push(params.dateFrom);
  }
  if (params.dateTo) {
    sql += " AND recorded_date <= ?";
    binds.push(params.dateTo);
  }
  sql += " ORDER BY recorded_date DESC LIMIT ? OFFSET ?";
  binds.push(params.limit || 50, params.offset || 0);
  const { results } = await env22.DB.prepare(sql).bind(...binds).all();
  return { ok: true, data: results, count: results.length, timestamp: now() };
}
__name(searchRecords, "searchRecords");
__name2(searchRecords, "searchRecords");
async function getAllJobStatuses(env22) {
  const { results } = await env22.DB.prepare(
    `SELECT j.id, c.name as county, i.name as instrumentType, j.status,
            j.total_records as totalRecords, j.scraped_records as scrapedRecords, j.last_page as lastPage
     FROM scrape_jobs j JOIN counties c ON j.county_id = c.id JOIN instrument_types i ON j.instrument_type_id = i.id
     ORDER BY j.updated_at DESC LIMIT 200`
  ).all();
  const jobs = (results || []).map((r) => ({
    id: r.id,
    county: r.county,
    instrumentType: r.instrumentType,
    status: r.status,
    totalRecords: r.totalRecords || 0,
    scrapedRecords: r.scrapedRecords || 0,
    lastPage: r.lastPage || 0,
    progress: r.totalRecords > 0 ? Math.round(r.scrapedRecords / r.totalRecords * 100) : 0
  }));
  return { ok: true, data: jobs, timestamp: now() };
}
__name(getAllJobStatuses, "getAllJobStatuses");
__name2(getAllJobStatuses, "getAllJobStatuses");
async function getCountyJobStatuses(env22, county) {
  const { results } = await env22.DB.prepare(
    `SELECT j.id, c.name as county, i.name as instrumentType, j.status,
            j.total_records as totalRecords, j.scraped_records as scrapedRecords, j.last_page as lastPage
     FROM scrape_jobs j JOIN counties c ON j.county_id = c.id JOIN instrument_types i ON j.instrument_type_id = i.id
     WHERE UPPER(c.name) = UPPER(?) ORDER BY j.updated_at DESC`
  ).bind(county).all();
  const jobs = (results || []).map((r) => ({
    id: r.id,
    county: r.county,
    instrumentType: r.instrumentType,
    status: r.status,
    totalRecords: r.totalRecords || 0,
    scrapedRecords: r.scrapedRecords || 0,
    lastPage: r.lastPage || 0,
    progress: r.totalRecords > 0 ? Math.round(r.scrapedRecords / r.totalRecords * 100) : 0
  }));
  return { ok: true, data: jobs, timestamp: now() };
}
__name(getCountyJobStatuses, "getCountyJobStatuses");
__name2(getCountyJobStatuses, "getCountyJobStatuses");
async function getStats(env22) {
  const stats = await env22.DB.prepare(
    `SELECT COUNT(*) as totalJobs,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedJobs,
       SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as runningJobs,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedJobs,
       SUM(total_records) as totalRecords, SUM(scraped_records) as scrapedRecords
     FROM scrape_jobs`
  ).first();
  const r2Count = await env22.DB.prepare("SELECT COUNT(*) as count FROM r2_uploads").first();
  const countyCount = await env22.DB.prepare("SELECT COUNT(*) as count FROM counties WHERE is_active = 1").first();
  return {
    ok: true,
    data: {
      version: VERSION,
      codename: "PHANTOM IN THE FOG",
      jobs: stats,
      r2Uploads: r2Count?.count || 0,
      activeCounties: countyCount?.count || 0,
      limits: { maxConcurrentBrowsers: 30, maxBrowsersPerMinute: 30, restApiPerMinute: 180 }
    },
    timestamp: now()
  };
}
__name(getStats, "getStats");
__name2(getStats, "getStats");
async function pauseJob(env22, jobId) {
  await env22.DB.prepare("UPDATE scrape_jobs SET status = 'paused', updated_at = datetime('now') WHERE id = ?").bind(jobId).run();
  return { ok: true, data: { message: `Job ${jobId} paused` }, timestamp: now() };
}
__name(pauseJob, "pauseJob");
__name2(pauseJob, "pauseJob");
async function resumeJob(env22, jobId) {
  const job = await env22.DB.prepare(
    `SELECT j.*, c.name as county_name, c.base_url, c.platform, i.name as inst_name
     FROM scrape_jobs j JOIN counties c ON j.county_id = c.id JOIN instrument_types i ON j.instrument_type_id = i.id
     WHERE j.id = ?`
  ).bind(jobId).first();
  if (!job) return { ok: false, error: `Job ${jobId} not found`, timestamp: now() };
  await env22.DB.prepare("UPDATE scrape_jobs SET status = 'running', updated_at = datetime('now') WHERE id = ?").bind(jobId).run();
  const platform22 = job.platform || "PUBLICSEARCH";
  const totalPages = Math.ceil(job.total_records / 50);
  await enqueueBatches(env22, {
    type: "scrape_batch",
    county: job.county_name,
    countyId: job.county_id,
    baseUrl: job.base_url,
    instrumentType: job.inst_name,
    instrumentTypeId: job.instrument_type_id,
    startPage: job.last_page,
    endPage: totalPages,
    platform: platform22
  }, totalPages);
  return { ok: true, data: { message: `Job ${jobId} resumed from page ${job.last_page} [${platform22}]` }, timestamp: now() };
}
__name(resumeJob, "resumeJob");
__name2(resumeJob, "resumeJob");
async function chainNextJob(env22, completedCountyId) {
  try {
    const county = await env22.DB.prepare("SELECT id, name, base_url, platform FROM counties WHERE id = ?").bind(completedCountyId).first();
    if (!county) return;
    const platform22 = county.platform || "PUBLICSEARCH";
    for (const instTypeName of INSTRUMENT_TYPES) {
      const instType = await env22.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(instTypeName).first();
      if (!instType) continue;
      const existing = await env22.DB.prepare(
        "SELECT status FROM scrape_jobs WHERE county_id = ? AND instrument_type_id = ?"
      ).bind(county.id, instType.id).first();
      if (existing && (existing.status === "completed" || existing.status === "running")) continue;
      await env22.SCRAPE_QUEUE.send({
        type: "discovery",
        county: county.name,
        countyId: county.id,
        baseUrl: county.base_url,
        instrumentType: instTypeName,
        instrumentTypeId: instType.id,
        startPage: 0,
        endPage: 0,
        platform: platform22
      });
      return;
    }
    const nextCounty = await env22.DB.prepare(
      `SELECT c.id, c.name, c.base_url, c.platform FROM counties c
       WHERE c.is_active = 1 AND c.id > ?
       AND c.id NOT IN (
         SELECT DISTINCT county_id FROM scrape_jobs WHERE status = 'running'
       )
       ORDER BY c.id LIMIT 1`
    ).bind(completedCountyId).first();
    if (!nextCounty) {
      const firstCounty = await env22.DB.prepare(
        "SELECT id, name, base_url, platform FROM counties WHERE is_active = 1 ORDER BY id LIMIT 1"
      ).first();
      if (!firstCounty) return;
      await env22.DB.prepare(
        "UPDATE scrape_jobs SET status = 'pending', scraped_records = 0, last_page = 0 WHERE county_id = ? AND status = 'completed'"
      ).bind(firstCounty.id).run();
      await env22.SCRAPE_QUEUE.send({
        type: "discovery",
        county: firstCounty.name,
        countyId: firstCounty.id,
        baseUrl: firstCounty.base_url,
        instrumentType: INSTRUMENT_TYPES[0],
        instrumentTypeId: 1,
        startPage: 0,
        endPage: 0,
        platform: firstCounty.platform || "PUBLICSEARCH"
      });
      return;
    }
    const firstInst = await env22.DB.prepare("SELECT id FROM instrument_types WHERE name = ?").bind(INSTRUMENT_TYPES[0]).first();
    if (!firstInst) return;
    await env22.SCRAPE_QUEUE.send({
      type: "discovery",
      county: nextCounty.name,
      countyId: nextCounty.id,
      baseUrl: nextCounty.base_url,
      instrumentType: INSTRUMENT_TYPES[0],
      instrumentTypeId: firstInst.id,
      startPage: 0,
      endPage: 0,
      platform: nextCounty.platform || "PUBLICSEARCH"
    });
  } catch {
  }
}
__name(chainNextJob, "chainNextJob");
__name2(chainNextJob, "chainNextJob");
async function enqueueBatches(env22, msg, totalPages, batchSize) {
  const pagesPerBatch = batchSize || PAGES_PER_BATCH;
  const batchMessages = [];
  for (let start = msg.startPage; start < totalPages; start += pagesPerBatch) {
    const end = Math.min(start + pagesPerBatch - 1, totalPages - 1);
    batchMessages.push({
      body: { ...msg, type: "scrape_batch", startPage: start, endPage: end }
    });
  }
  for (let i = 0; i < batchMessages.length; i += 100) {
    await env22.SCRAPE_QUEUE.sendBatch(batchMessages.slice(i, i + 100));
  }
}
__name(enqueueBatches, "enqueueBatches");
__name2(enqueueBatches, "enqueueBatches");
function now() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(now, "now");
__name2(now, "now");
function json(data, status, headers) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}
__name(json, "json");
__name2(json, "json");
export {
  index_default as default
};
//# sourceMappingURL=worker.js.map