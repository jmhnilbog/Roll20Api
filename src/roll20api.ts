/**
 * A string that is parseable as JSON.
 */
type JSONString = string;

type Index = keyof Indexed;
type Indexed<T = any> = {
  [k: string]: T;
  [k: number]: T;
};

type Scope = Indexed;

/**
 * Union type of values of an indexable type.
 */
type Values<T extends Indexed> = T[keyof T];

/**
 * Union type of keys of an indexable type.
 */
type Keys<T extends Indexed> = keyof T;

/**
 * Permutations of union types X and Y as strings, using
 * separator Z.
 */
type Permuted<
  X extends Index,
  Y extends Index,
  Z extends string = "-"
> = Values<
  {
    [V in X]: Values<
      {
        [H in Y]: Values<
          {
            [K in V | H]: `${V}${Z}${H}`;
          }
        >;
      }
    >;
  }
>;

/**
 * The basiliskasterisk libraries require this library to be installed.
 *
 * No functions are exported on the basiliskasterisk object itself; it's
 * just a 'namespace' object. Functions required by all related libraries
 * are found at basiliskasterisk.util.
 */
const basiliskasterisk = {
  /**
   * The basiliskasterisk.util library registration function. It is immediately
   * executed. To increment the version, see the arguments presented to
   * it, below.
   *
   * @param cfg - The registration config object.
   * @param cfg.name - Library name.
   * @param cfg.version - A version string.
   * @param cfg.defaultConfiguration - Default configuration to use when
   * instances of the library are created.
   */
  util: ((cfg) => {
    const { name, version, defaultConfiguration } = cfg;

    /**
     * This function is called to return instances of the library, configured
     * using the registered defaultConfiguration and any provided
     * overrriding configuration.
     * @param [config] - Default configuration overrrides.
     */
    const library = (config?: Partial<typeof defaultConfiguration>) => {
      const cfg = {
        ...defaultConfiguration,
        ...(config || {}),
      };

      /**
       * Supported log levels.
       */
      const LOG_LEVELS = {
        TRACE: 1,
        INFO: 10,
        WARN: 25,
        ERROR: 50,
        FATAL: 100,
      } as const;

      type LOG_LEVEL_IDENTIFIER = keyof typeof LOG_LEVELS | number;

      // @ts-ignore
      var global = global;
      // @ts-ignore
      var window = window;

      /**
       * Provides a simple logger object.
       *
       * @param [obj.logLevel] - Logs lower than this will be suppressed.
       * @param [obj.name] - A name to tag messages from this log.
       * @param [obj.emissionFn] - The function that actually emits the log.
       */
      const getLogger = ({
        logLevel = LOG_LEVELS.INFO,
        name = "LOG",
        // @ts-ignore
        emissionFn = (global && global.log) ||
          // @ts-ignore
          (window && window.log) ||
          // @ts-ignore
          (this && this.log) ||
          // @ts-ignore
          (console && console.log),
      }: {
        logLevel?: LOG_LEVEL_IDENTIFIER;
        name?: string;
        emissionFn?: (str: any, ...rest: any[]) => void;
      } = {}) => {
        const logLevelValue =
          typeof logLevel === "number" ? logLevel : LOG_LEVELS[logLevel];

        const _emit = (level: keyof typeof LOG_LEVELS) => {
          return (str: any, ...rest: any[]) => {
            if (logLevelValue <= LOG_LEVELS[level]) {
              return emissionFn(`${name} [${level}]: ${str}`, ...rest);
            }
          };
        };

        // logging methods.

        const trace = _emit("TRACE");
        const info = _emit("INFO");
        const warn = _emit("WARN");
        const error = _emit("ERROR");
        const fatal = _emit("FATAL");

        const log = info;

        /**
         * Creates a 'child' logger, inheriting from the parent.
         *
         * @param childName
         */
        const child = (childName: string) => {
          return getLogger({
            logLevel,
            name: `${name}.${childName}`,
          });
        };

        return {
          trace,
          info,
          warn,
          error,
          fatal,
          child,
          log,
        };
      };

      const defaultLogger = getLogger();
      const logger = defaultLogger;

      /**
       * Gets a scope. Without arguments, this is the top-level scope for the
       * environment. This may be global, window, the globalThis, an
       * encapsulating 'this', or even a bare object should all that fail.
       *
       * @param nameOrNames - an 'ID' for the scope. Parsing may be influenced
       * via the scopeDelimiter configuration parameter.
       * @param origin - The scope in which to search.
       */
      const getScope = (
        nameOrNames: string | string[] = "",
        // @ts-ignore
        origin = global || window || this || {}
      ): Scope => {
        const names = Array.isArray(nameOrNames)
          ? nameOrNames
          : nameOrNames.split(cfg.scopeDelimiter);

        logger.trace(`getScope()`, nameOrNames, origin);

        if (names.length === 0) {
          return origin;
        }

        const name = names.shift() as string;

        if (typeof origin[name] === "undefined") {
          origin[name] = {};
        }

        return getScope(names, origin[name]);
      };

      /**
       * Returns a not-very-well-constructed uuid.
       */
      const uuid = () => `x-${Math.random().toString(36).padStart(5, "-")}`;

      // The actual configured library instance.
      return {
        getScope,
        getLogger,
        uuid,
        defaultLogger,
        LOG_LEVELS,
      } as const;
    };

    let _instance = library();

    /**
     * Creates additional instances of the library.
     *
     * @param config
     */
    const create = (config?: Partial<typeof defaultConfiguration>) =>
      library({ ...defaultConfiguration, ...(config || {}) });

    /**
     * Accessor/generator of the singleton basiliskasterisk.util library.
     *
     * @param config
     */
    const getInstance = (config?: Partial<typeof defaultConfiguration>) => {
      _instance = _instance || create(config);
      return _instance;
    };

    const registeredLibrary = {
      _meta: {
        ...cfg,
      },
      _instance,
      library,
      getInstance,
      create,
    } as const;

    // copy installed library to scope;
    const scope = _instance.getScope(name) as typeof registeredLibrary;
    Object.keys(registeredLibrary).forEach((key) => {
      const k = key as keyof typeof registeredLibrary;
      // @ts-ignore
      scope[k] = registeredLibrary[k];
    });

    return registeredLibrary;
  })({
    name: "basiliskasterisk.util",
    version: "0.0.1",
    defaultConfiguration: {
      scopeDelimiter: ".",
      logLevel: 10,
    },
  } as const),
};

const util = basiliskasterisk.util.getInstance();

/**
 * The basiliskasterisk.roll20Api library registration function. It
 * is immediately executed. To increment the version, see the arguments
 * presented to it, below.
 *
 * It requires basiliskasterisk.util to be installed.
 *
 * This library 'stubs' into place the roll20Api sandbox environment so
 * api code may be tested in other environments, like node.js.
 *
 * @param cfg - The registration config object.
 * @param cfg.name - Library name.
 * @param cfg.version - A version string.
 * @param cfg.defaultConfiguration - Default configuration to use when
 * instances of the library are created.
 */
const basiliskasterisk__roll20Api = ((cfg) => {
  const { name, version, defaultConfiguration } = cfg;

  // TODO: allow version checks as well as existance
  if (!basiliskasterisk?.util) {
    throw new Error("Required libraries not installed.");
  }

  const util = basiliskasterisk.util.getInstance();

  /**
   * This function is called to return instances of the library, configured
   * using the registered defaultConfiguration and any provided
   * overrriding configuration.
   * @param [config] - Default configuration overrrides.
   */
  const library = (config?: Partial<typeof defaultConfiguration>) => {
    const cfg = {
      ...defaultConfiguration,
      ...(config || {}),
    };

    // TODO: allow configuration of logger.
    const { trace, info, warn, error } = util.getLogger({
      logLevel: cfg.logLevel,
      name: "roll20Api",
    });
    const log = info;

    /**
     * Mimics the roll20Api sandbox event emission. This also allows
     * for manually firing a 'sheetWorkerCompleted' event to call
     * outstanding onSheetWorkerCompleted callbacks.
     *
     * @param eventName
     * @param rest
     */
    const _fireEvent = (eventName: string, ...rest: any) => {
      trace(`_fireEvent('${eventName}').`, ...rest);
      if (eventName === "sheetWorkerCompleted") {
        // Unlike other events, this one clears out each queued
        // handler as it is called.
        const handlers = MOCKS._handlers[eventName] || [];
        handlers.forEach((handler) => handler(...rest));
        MOCKS._handlers[eventName] = [];
        return;
      }
      const subEvents = eventName.split(":");
      while (subEvents.length) {
        const n = subEvents.join(":");
        info(`_fireEvent: Firing event '${n}'.`, ...rest);
        const handlers = MOCKS._handlers[n] || [];
        handlers.forEach((handler) => handler(...rest));
        subEvents.pop();
      }
    };

    /**
     * 'Promotes' the roll20api functions to another scope. By default, this
     * is to global state, overriding the functions within the roll20api
     * sandbox.
     */
    const _promote = (
      keys?: keyof typeof _api | (keyof typeof _api)[],
      nameOrNames: string | string[] = [],
      scope?: Scope
    ) => {
      const s = util.getScope(nameOrNames, scope) as typeof _api;
      let promotionKeys: (keyof typeof _api)[] = Object.keys(
        _api
      ) as (keyof typeof _api)[];
      if (typeof keys !== "undefined") {
        if (typeof keys === "string") {
          promotionKeys = [keys] as (keyof typeof _api)[];
        } else if (Array.isArray(keys)) {
          promotionKeys = keys;
        }
      }

      info(
        `Promoting roll20Api as defined in basiliskasterisk.roll20Api to another scope: ${promotionKeys.join(
          ", "
        )}`,
        nameOrNames,
        scope
      );

      promotionKeys.forEach((key) => {
        const k = key as keyof typeof _api;
        s[k] = _api[k];
      });
      return s;
    };

    let _GM: string | undefined;
    const _setAsGM = (playerId?: string) => {
      _GM = playerId;
    };

    /**
     * Determine if in the roll20 sandbox or not.
     *
     * // TODO: come up with a better way.
     */
    const _inSandbox = () => {
      // @ts-ignore
      if (typeof require === "undefined") {
        return true;
      }
      return false;
    };

    /**
     * Roll20Object types that may be created in client code.
     */
    type CreatableObjectType = typeof Roll20Object.CREATEABLE_TYPES[number];

    /**
     * Roll20Object fields that require callback arguments.
     */
    type AsyncField = typeof Roll20Object.ASYNC_FIELDS[number];

    /**
     * Valid forms of initializers for Roll20Objects.
     */
    type MinimalAttributeInitializer = {
      type: "attribute";
      characterId: string;
    };
    type MinimalPathInitializer = {
      type: "path";
      _path: JSONString;
    };
    type MinimalAsyncInitializer = {
      type: "character" | "handout";
      notes?: never;
      gmnotes?: never;
      bio?: never;
    };
    type OtherTypes = Exclude<
      Values<typeof Roll20Object.TYPES>,
      "attribute" | "path" | "character" | "handout"
    >;
    type MinimalOtherInitializer = {
      type: OtherTypes;
    };

    type Roll20ObjectInitializer = (
      | MinimalOtherInitializer
      | MinimalAsyncInitializer
      | MinimalPathInitializer
      | MinimalAttributeInitializer
    ) & {
      _id?: never;
      [key: string]: any;
    };

    /**
     * An approximation of the Roll20Object class as found in the
     * roll20Api sandbox.
     */
    class Roll20Object {
      /**
       * Every type (_type) of Roll20Object.
       */
      static TYPES = {
        CAMPAIGN: "campaign",
        GRAPHIC: "graphic",
        TEXT: "text",
        PATH: "path",
        CHARACTER: "character",
        ABILITY: "ability",
        ATTRIBUTE: "attribute",
        HANDOUT: "handout",
        ROLLABLE_TABLE: "rollabletable",
        TABLE_ITEM: "tableitem",
        MACRO: "macro",
        PAGE: "page",
        PLAYER: "player",
        DECK: "deck",
        CARD: "card",
        HAND: "hand",
        CUSTOM_FX: "custfx",
        JUKEBOX_TRACK: "jukeboxtrack",
      } as const;

      /**
       * The types of Roll20Object that have asynchronous field access.
       */
      static ASYNC_TYPES = [
        Roll20Object.TYPES.CHARACTER,
        Roll20Object.TYPES.HANDOUT,
      ] as const;

      /**
       * The asynchronous fields within Roll20Objects with them.
       */
      static ASYNC_FIELDS = ["notes", "gmnotes", "bio"] as const;

      /**
       * Types of Roll20Objects that may be directly created by clients.
       */
      static CREATEABLE_TYPES = [
        Roll20Object.TYPES.GRAPHIC,
        Roll20Object.TYPES.TEXT,
        Roll20Object.TYPES.PATH,
        Roll20Object.TYPES.CHARACTER,
        Roll20Object.TYPES.ABILITY,
        Roll20Object.TYPES.ATTRIBUTE,
        Roll20Object.TYPES.HANDOUT,
        Roll20Object.TYPES.ROLLABLE_TABLE,
        Roll20Object.TYPES.TABLE_ITEM,
        Roll20Object.TYPES.MACRO,
      ] as const;

      /**
       * An object pool containing all non-removed() Roll20Object instances.
       */
      static pool: Record<string, Roll20Object> = {};

      private _obj: Record<string, any>;

      constructor(obj: Roll20ObjectInitializer) {
        // TODO: test behavior when trying to set _id in sandbox.
        this._obj = obj;
        this._obj._type = this._obj._type || this._obj.type;
        this._obj._id = this._obj._id || util.uuid();

        Roll20Object.pool[this._obj._id] = this;
      }

      get id() {
        return this._obj._id;
      }

      /**
       * Access to a Roll20Object property. A callback argument is required
       * when accessing an 'async field' on an 'async type'.
       *
       * @param key
       * @param cb
       */
      get(key: string, cb?: (x: any) => any) {
        // TODO: improve types
        if (Roll20Object.ASYNC_TYPES.indexOf(this._obj._type) > -1) {
          if (Roll20Object.ASYNC_FIELDS.indexOf(key as AsyncField) > -1) {
            if (!cb) {
              throw new Error(`Callback required to get key "#{key}".`);
            }
          }
        }

        const value = this._obj[key];

        // TODO: allow a delay before callback is called.
        return cb ? cb(value) : value;
      }

      /**
       * Mutator for a Roll20Object property. The immutability of
       * some keys is enforced.
       */
      set(changes: Record<string, any>): void;
      set(key: ImmutableKey | string, value: any): void;
      set(
        changesOrKey: Record<string, any> | ImmutableKey | string,
        value?: any
      ): void {
        const allChanges =
          typeof changesOrKey === "string"
            ? {
                [changesOrKey]: value,
              }
            : changesOrKey;

        Object.keys(allChanges).forEach((key) => {
          if (IMMUTABLE_KEYS.indexOf(key as ImmutableKey) > -1) {
            error(`You may not set key "${key}".`);
          } else {
            this._obj[key] = allChanges[key];
          }
        });
      }

      /**
       * Makes a set of changes to a Roll20Object via webworker. To receive
       * notice that the change has completed, you must register an
       * @param changes
       */
      setWithWorker(changes: Record<string, any>) {
        if (this._obj._type !== "attribute") {
          throw new Error(`Can't call setWithWorker on non-attribute objects.`);
        }

        Object.keys(changes).forEach((key) => {
          if (IMMUTABLE_KEYS.indexOf(key as ImmutableKey) > -1) {
            error(`You may not set key "${key}".`);
          } else {
            this._obj[key] = changes[key];
          }
        });

        // TODO: force call to worker handler.
        _fireEvent("sheetWorkerCompleted");
      }
      remove() {
        if (Roll20Object.pool[this.id] === this) {
          error(`Can't remove obj; id ${this.id} not found in pool.`);
          return;
        }
        delete Roll20Object.pool[this.id];
        return this;
      }
    }

    /**
     * Roll20Object types that work with setWithWorker().
     */
    const SET_WITH_WORKER_TYPES = [Roll20Object.TYPES.ATTRIBUTE] as const;

    type SetWithWorkerType = typeof SET_WITH_WORKER_TYPES[number];

    const IMMUTABLE_KEYS = ["_id", "id", "_type", "type"] as const;

    type ImmutableKey = typeof IMMUTABLE_KEYS[number];

    type Roll20ObjectType = Values<typeof Roll20Object.TYPES>;

    type Roll20ObjectSearchKey = {
      [key: string]: any;
    };

    type Roll20ObjectMutation = {
      type?: never;
      _type?: never;
      _id?: never;
      id?: never;
      [key: string]: any;
    };

    type Roll20Coord = {
      x: number;
      y: number;
    };

    type Roll20Message = {
      [key: string]: any;
    };

    /**
     * 'Normal' types of fx.
     */
    const SPAWN_FX_TYPES = {
      BOMB: "bomb",
      BUBBLING: "bubbling",
      BURN: "burn",
      BURST: "burst",
      EXPLODE: "explode",
      GLOW: "glow",
      MISSLE: "missle",
      NOVA: "nova",
    } as const;

    type SpawnFXType = Values<typeof SPAWN_FX_TYPES>;

    /**
     * Types of fx that work between points.
     */
    const SPAWN_FX_BETWEEN_TYPES = {
      ...SPAWN_FX_TYPES,
      BEAM: "beam",
      BREATH: "breath",
      SPLATTER: "splatter",
    } as const;

    type SpawnFXBetweenType = Values<typeof SPAWN_FX_BETWEEN_TYPES>;

    /**
     * Colors of fx.
     */
    const SPAWN_FX_COLORS = {
      ACID: "acid",
      BLOOD: "blood",
      CHARM: "charm",
      DEATH: "death",
      FIRE: "fire",
      FROST: "frost",
      HOLY: "holy",
      MAGIC: "magic",
      SLIME: "slime",
      SMOKE: "smoke",
      WATER: "water",
    } as const;

    type SpawnFxColor = Values<typeof SPAWN_FX_COLORS>;

    type FxBetweenNames = Permuted<SpawnFXBetweenType, SpawnFxColor>;
    type FxNames = Permuted<SpawnFXType, SpawnFxColor>;

    const MOCKS = {
      /**
       * The underscore library. Outside of the roll20api sandbox, we
       * attempt to load the actual library, but provide a very basic
       * stand in as a last-ditch effort.
       */
      _: (() => {
        // @ts-ignore
        var require = require;
        if (typeof require === "function") {
          try {
            const underscore = require("underscore");
            return underscore;
          } catch (err) {
            warn(
              "Failed to require underscore library. Will use basic stub as mock if necessary."
            );
          }
        }
        return new Proxy(
          {
            map: <T, U = any>(
              arr: T[],
              cb: (item: T, index: number, array: T[]) => U[]
            ) => arr.map(cb),
            toJSON: () => "",
            toString: () => "",
          },
          {
            get: (obj: any, key) => {
              if (key in obj) {
                return obj[key];
              }
              error(`"${key.toString()}" field of Underscore not mocked!`);
            },
          }
        );
      })(),

      /**
       * Mocked version of the roll20Api sandbox state.
       */
      state: {},

      /**
       * Mocked version of Campaign(), which returns the appropriate Campaign
       * Roll20Object singleton.
       *
       * TODO: check actual object in roll20api sandbox.
       */
      Campaign: () => {
        if (!MOCKS._campaign) {
          // @ts-ignore
          const create = MOCKS.createObj;
          MOCKS._campaign = new Roll20Object({
            type: Roll20Object.TYPES.CAMPAIGN,
          });
        }
        return MOCKS._campaign;
      },

      /**
       * Mocked version of createObj().
       *
       * @param type
       * @param obj
       */
      createObj: (
        type: CreatableObjectType,
        obj: Omit<Roll20ObjectInitializer, "type">
      ) => {
        const initializer = {
          ...obj,
          type,
        } as Roll20ObjectInitializer;
        return new Roll20Object(initializer);
      },
      /**
       * Mocked version of filterObjs().
       */
      filterObjs: (cb: (obj: Roll20ObjectSearchKey) => boolean) => {
        return Object.keys(Roll20Object.pool)
          .map((key) => Roll20Object.pool[key])
          .filter(cb);
      },
      /**
       * Mocked version of findObjs().
       */
      findObjs: (
        obj: Roll20ObjectSearchKey,
        { caseInsensitive = false }: { caseInsensitive: boolean }
      ) => {
        // @ts-ignore
        const filterObjs = filterObjs || MOCKS.filterObjs;
        return filterObjs((testObj: Roll20ObjectSearchKey) => {
          let found = true;
          Object.keys(testObj).forEach((key) => {
            const testValue = testObj[key];
            const objValue = obj[key];

            if (found && caseInsensitive) {
              if (
                typeof objValue === "string" ||
                typeof testValue === "string"
              ) {
                if (
                  testValue.toString().toLowerCase() !=
                  objValue.toString().toLowerCase()
                ) {
                  found = false;
                }
              }
            }
            if (found && testObj[key] != obj[key]) {
              found = false;
            }
          });
          return found;
        });
      },
      /**
       * Mocked version of getAllObjs().
       */
      getAllObjs: () =>
        Object.keys(Roll20Object.pool).map((key) => Roll20Object.pool[key]),
      /**
       * Mocked version of getAttrByName().
       * @param id
       * @param name
       * @param curOrMax
       */
      getAttrByName: (
        id: string,
        name: string,
        curOrMax: "current" | "max" = "current"
      ) => {
        // @ts-ignore
        const findObjs = findObjs || MOCKS.findObjs;
        const char = findObjs({ type: "character", id })[0];
        if (!char) {
          throw new Error(`Can't find character with id "${id}".`);
        }
        return char.get(`${name}_${curOrMax}`);
      },
      /**
       * Mocked version of log(), using a basiliskasterisk.util logger.
       */
      log: log,
      /**
       * Mocked version of on(). Use _fireEvent to mock events.
       * @param eventName
       * @param handler
       */
      on: (eventName: string, handler: Function) => {
        const subEvents = eventName.split(":");
        if (subEvents[0] === "ready") {
          // handler()
        } else if (subEvents[0] === "change") {
          // handler(obj, prev)
          // prev is a regular obj, not a Roll20Object.
          // async fields will have ids, not data, in prev
        } else if (subEvents[0] === "add") {
          // handler(obj)
        } else if (subEvents[0] === "destroy") {
          // handler(obj)
        } else if (subEvents[0] === "chat") {
          // handler(msg)
        }
        MOCKS._handlers[eventName] = MOCKS._handlers[eventName] || [];
        MOCKS._handlers[eventName].push(handler);

        log(`on(${eventName}) handler set.`);
      },
      /**
       * Mocked version of onSheetWorkerCompleted(). Use
       * _fireEvent('sheetWorkerCompleted') to mimic a sheet
       * completion.
       * @param cb
       */
      onSheetWorkerCompleted: (cb: () => void) => {
        info(`onSheetWorkerCompleted() called.`);
        MOCKS._handlers["sheetWorkerCompleted"] =
          MOCKS._handlers["sheetWorkerCompleted"] || [];
        MOCKS._handlers["sheetWorkerCompleted"].push(cb);
      },
      /**
       * Mocked version of playerIsGM(). Unlike the real version, you will have
       * to call _setAsGM(playerId) to set a player as is the GM.
       * @param playerId
       */
      playerIsGM: (playerId: string) => _GM === playerId,
      /**
       * Mocked version of playJukeboxPlaylist(). Does nothing.
       */
      playJukeboxPlaylist: () => {},
      /**
       * Mocked, not-as-good version of randomInteger().
       * @param max
       */
      randomInteger: (max: number) => Math.floor(Math.random() * max) + 1,
      /**
       * Mocked version of sendChat().
       *
       * TODO: trigger mocked events related to message.
       */
      sendChat: (
        speakingAs: string,
        message: Roll20Message,
        cb?: (msgs: Roll20Message[]) => void,
        { noarchive = false, use3d = false } = {}
      ) => {
        log(`MOCK sendChat: ${speakingAs}, ${message}`);
        cb && cb([]);
        // TODO: force chat events
      },
      /**
       * Mocked version of sendPing().
       *
       * @param left
       * @param top
       * @param pageId
       * @param playerId
       * @param moveAll
       * @param visibleTo
       */
      sendPing: (
        left: number,
        top: number,
        pageId: string,
        playerId?: string,
        moveAll: boolean = false,
        visibleTo?: string | string[]
      ) => log(`MOCK sendPing: ${left}, ${top}, ${pageId}`),
      /**
       * Mocked version of spawnFx().
       * @param left
       * @param top
       * @param typeColor
       * @param pageId
       */
      spawnFx: (
        left: number,
        top: number,
        typeColor: FxNames,
        pageId: string
      ) => log(`MOCK spawnFx ${left}, ${top}, ${typeColor}`),
      /**
       * Mocked version of spawnFxBetweenPoints().
       * @param start
       * @param end
       * @param typeColor
       * @param pageId
       */
      spawnFxBetweenPoints: (
        start: Roll20Coord,
        end: Roll20Coord,
        typeColor: FxBetweenNames,
        pageId: string
      ) =>
        log(
          `MOCK spawnFxBetweenPoints ${JSON.stringify(start)}, ${JSON.stringify(
            end
          )}, ${typeColor}`
        ),
      /**
       * Mocked version of spawnFxWithDefinition().
       *
       * @param left
       * @param top
       * @param definition
       * @param pageId
       */
      spawnFxWithDefinition: (
        left: string,
        top: string,
        definition: Record<string, any>,
        pageId: string
      ) =>
        log(
          `NOT REALLY SPAWNING FX DEFINITION ${left}, ${top}, ${JSON.stringify(
            definition
          )}`
        ),
      /**
       * Mocked version of stopJukeboxPlaylist(), which does nothing.
       */
      stopJukeboxPlaylist: () => {},
      /**
       * Mocked version of toBack(), which does nothing.
       */
      toBack: (obj: Roll20Object) => log(`MOCK toBack(${obj.id})`),
      /**
       * Mocked version of toFront(), which does nothing.
       */
      toFront: (obj: Roll20Object) => log(`MOCK toFront(${obj.id})`),
      _campaign: (undefined as unknown) as Roll20Object,
      _handlers: {} as Record<string, Function[]>,
      ...cfg.mocks,
    };

    /**
     * Wrapper functions! Functions defined here wrap the Mocked or
     * real versions of the api function. They take the actual function as
     * an argument and return a modified version with the same interface as the
     * original one.
     */
    const WRAPPERS = {
      /**
       * Wrapper for createObj to add additional error checking and logging.
       */
      createObj: (createFn: typeof MOCKS.createObj) => {
        return ((type, obj) => {
          log(`Attempting createObj(${type}, ${JSON.stringify(obj)}).`);
          let newObj;
          try {
            newObj = createFn(type, obj);
          } catch (err) {
            log(`Failed to createObj: ${err.toString()}`);
            throw err;
          }
          log(
            `createObj(${type}, ${JSON.stringify(
              obj
            )}) returned: ${JSON.stringify(newObj)}.`
          );
          return newObj;
        }) as typeof MOCKS.createObj;
      },
      ...cfg.wrappers,
    };

    type API = typeof MOCKS;

    const _api = {} as API;

    Object.keys(MOCKS).forEach((k) => {
      const topLevelScope = util.getScope();
      const key = k as keyof typeof MOCKS;
      type M = typeof MOCKS["Campaign"];
      if (typeof topLevelScope[key] !== "undefined") {
        log(`Found Roll20's "${key}". Copying to Roll20Api.`);
        _api[key] = topLevelScope[key] as typeof MOCKS[typeof key];
      } else {
        log(`Roll20 "${key}" not found. Installing mock.`);
        if (typeof MOCKS[key] === "undefined") {
          log(`No mock found for "${key}"`);
        }
        _api[key] = MOCKS[key];
        log(`Using mocked "${key}": ${_api[key]?.toString()}.`);
      }

      if ((WRAPPERS as Record<string, any>)[key]) {
        log(`Custom wrapper found for "${key}". Applying.`);
        _api[key] = (WRAPPERS as Record<string, any>)[key](
          _api[key]
        ) as typeof MOCKS[typeof key];
      }
    });

    return {
      Roll20Object,
      OBJECT_TYPES: Roll20Object.TYPES,
      SPAWN_FX_TYPES,
      SPAWN_FX_BETWEEN_TYPES,
      SPAWN_FX_COLORS,
      api: _api,
      _promote,
      _fireEvent,
      _setAsGM,
      _inSandbox,
    } as const;
  };

  let _instance = undefined as ReturnType<typeof library> | undefined;

  const create = (config?: Partial<typeof defaultConfiguration>) =>
    library({ ...defaultConfiguration, ...(config || {}) });

  const installedLibrary = {
    _meta: {
      ...cfg,
    },
    library,
    getInstance: (config?: Partial<typeof defaultConfiguration>) => {
      _instance = _instance || create(config);
      return _instance;
    },
    create,
  } as const;

  // copy installed library to scope.
  const scope = util.getScope(name);
  Object.keys(installedLibrary).forEach((key) => {
    scope[key] = installedLibrary[key as keyof typeof installedLibrary];
  });

  return installedLibrary;
})({
  name: "basiliskasterisk.roll20Api",
  version: "0.0.1",
  defaultConfiguration: {
    logLevel: 10,
    mocks: {},
    wrappers: {},
  },
} as const);

const api = basiliskasterisk__roll20Api.getInstance();

// API testing.
(({ runTests }) => {
  if (!runTests) {
    return;
  }

  const _util = basiliskasterisk.util.create();
  const { log, info, error } = _util.getLogger({
    logLevel: "TRACE",
    name: "TEST",
  });

  const {
    api,
    Roll20Object,
    _fireEvent,
    _inSandbox,
    _setAsGM,
    _promote,
  } = basiliskasterisk__roll20Api.create();

  const test = (t: boolean, msg: string) => {
    if (t === true) {
      info(`PASSED: (${msg})`);
      return;
    }
    error(`FAILED: (${msg})`);
  };

  // If not in the sandbox, we don't have access to the campaign,
  // players, handouts, etc. We have to create them. createObj
  // excludes creating some of these things, so the mocked Roll20Object
  // constructor is used directly.

  // Build test data, validating it as we go.
  const campaign = api.Campaign();

  // Test the Campaign singleton.
  test(!!campaign.id, "Campaign singleton found.");

  // @ts-ignore
  log(`${require.toString()}`);

  if (!_inSandbox()) {
    // Create players, and assign one as GM.
    const players = ["Abe", "Bernie", "Cookie", "Debbie", "Edith"].map(
      (name) =>
        new Roll20Object({
          type: "player",
          name,
        })
    );
    test(
      !api.playerIsGM(players[0].id),
      `Character "${players[0].id}" is not GM.`
    );
    _setAsGM(players[0].id);
    test(
      api.playerIsGM(players[0].id),
      `Character "${players[0].id}" is now GM.`
    );
  }

  if (!_inSandbox()) {
    // Test usual event handling.
    api.on("chat:message", (msg: any) => {
      test(true, `Heard "${JSON.stringify(msg)}".`);
    });

    _fireEvent("chat:message", { message: "Foo!" });

    // Test web worker event handling.
    api.onSheetWorkerCompleted(() => {
      test(true, `Callback registered with onSheetWorkerCompleted() called.`);
    });

    _fireEvent("sheetWorkerCompleted");
  }
})({
  // @ts-ignore
  runTests: true,
});
