import { ReactNode, RefObject } from "react";

// #region misc

// react\packages\react-reconciler\src\ReactTypeOfMode.js
type TypeOfMode = number;
// react\packages\react-reconciler\src\ReactFiberFlags.js
type Flags = number;

// react\packages\shared\ReactElementType.js
type Source = {
  fileName: string;
  lineNumber: number;
};

// react\packages\react-dom\src\client\ReactDOMHostConfig.js
type TimeoutHandle = number;
type NoTimeout = -1;
type SuspenseInstance = Comment & { _reactRetry?: () => void };

// react\packages\react-reconciler\src\ReactRootTags.js
type RootTag = 0 | 1;

// react\packages\react-reconciler\src\ReactFiberLane.old.js
type LaneMap<T> = Array<T>;

// #endregion

// #region react\packages\shared\ReactTypes.js

type ResolveNativeStyle = (stylesheetID: any) => object;

type ReactContext<T> = {
  $$typeof: Symbol | number;
  Consumer: ReactContext<T>;
  Provider: ReactProviderType<T>;
  _currentValue: T;
  _currentValue2: T;
  _threadCount: number;
  // DEV only
  _currentRenderer?: Object | null;
  _currentRenderer2?: Object | null;
  // This value may be added by application code
  // to improve DEV tooling display names
  displayName?: string;
};

// The subset of a Thenable required by things thrown by Suspense.
// This doesn't require a value to be passed to either handler.
interface Wakeable {
  then(onFulfill: () => unknown, onReject: () => unknown): void | Wakeable;
}

// #endregion

// #region react\packages\react-reconciler\src\ReactInternalTypes.js

type HookType =
  | "useState"
  | "useReducer"
  | "useContext"
  | "useRef"
  | "useEffect"
  | "useInsertionEffect"
  | "useLayoutEffect"
  | "useCallback"
  | "useMemo"
  | "useImperativeHandle"
  | "useDebugValue"
  | "useDeferredValue"
  | "useTransition"
  | "useMutableSource"
  | "useSyncExternalStore"
  | "useId"
  | "useCacheRefresh";

type ContextDependency<T> = {
  context: ReactContext<T>;
  next: ContextDependency<unknown> | null;
  memoizedValue: T;
};
type Dependencies = {
  lanes: Lanes;
  firstContext: ContextDependency<unknown> | null;
};

// A Fiber is work on a Component that needs to be done or was done. There can
// be more than one per component.
type Fiber = {
  // These first fields are conceptually members of an Instance. This used to
  // be split into a separate type and intersected with the other Fiber fields,
  // but until Flow fixes its intersection bugs, we've merged them into a
  // single type.
  // An Instance is shared between all versions of a component. We can easily
  // break this out into a separate object to avoid copying so much to the
  // alternate versions of the tree. We put this on a single object for now to
  // minimize the number of objects created during the initial render.
  // Tag identifying the type of fiber.
  tag: WorkTag;
  // Unique identifier of this child.
  key: null | string;
  // The value of element.type which is used to preserve the identity during
  // reconciliation of this child.
  elementType: any;
  // The resolved function/class/ associated with this fiber.
  type: any;
  // The local state associated with this fiber.
  stateNode: any;
  // Conceptual aliases
  // parent : Instance -> return The parent happens to be the same as the
  // return fiber since we've merged the fiber and instance.
  // Remaining fields belong to Fiber
  // The Fiber to return to after finishing processing this one.
  // This is effectively the parent, but there can be multiple parents (two)
  // so this is only the parent of the thing we're currently processing.
  // It is conceptually the same as the return address of a stack frame.
  return: Fiber | null;
  // Singly Linked List Tree Structure.
  child: Fiber | null;
  sibling: Fiber | null;
  index: number;
  // The ref last used to attach this node.
  // I'll avoid adding an owner field for prod and model that as functions.
  ref:
    | null
    | (((handle: unknown) => void) & {
        _stringRef: string | null | undefined;
      })
    | RefObject<any>;
  // Input is the data coming into process this fiber. Arguments. Props.
  pendingProps: any;
  // This type will be more specific once we overload the tag.
  memoizedProps: any;
  // The props used to create the output.
  // A queue of state updates and callbacks.
  updateQueue: unknown;
  // The state used to create the output
  memoizedState: any;
  // Dependencies (contexts, events) for this fiber, if it has any
  dependencies: Dependencies | null;
  // Bitfield that describes properties about the fiber and its subtree. E.g.
  // the ConcurrentMode flag indicates whether the subtree should be async-by-
  // default. When a fiber is created, it inherits the mode of its
  // parent. Additional flags can be set at creation time, but after that the
  // value should remain unchanged throughout the fiber's lifetime, particularly
  // before its child fibers are created.
  mode: TypeOfMode;
  // Effect
  flags: Flags;
  subtreeFlags: Flags;
  deletions: Array<Fiber> | null;
  // Singly linked list fast path to the next fiber with side-effects.
  nextEffect: Fiber | null;
  // The first and last fiber with side-effect within this subtree. This allows
  // us to reuse a slice of the linked list when we reuse the work done within
  // this fiber.
  firstEffect: Fiber | null;
  lastEffect: Fiber | null;
  lanes: Lanes;
  childLanes: Lanes;
  // This is a pooled version of a Fiber. Every fiber that gets updated will
  // eventually have a pair. There are cases when we can clean up pairs to save
  // memory if we need to.
  alternate: Fiber | null;
  // Time spent rendering this Fiber and its descendants for the current update.
  // This tells us how well the tree makes use of sCU for memoization.
  // It is reset to 0 each time we render and only updated when we don't bailout.
  // This field is only set when the enableProfilerTimer flag is enabled.
  actualDuration?: number;
  // If the Fiber is currently active in the "render" phase,
  // This marks the time at which the work began.
  // This field is only set when the enableProfilerTimer flag is enabled.
  actualStartTime?: number;
  // Duration of the most recent render time for this Fiber.
  // This value is not updated when we bailout for memoization purposes.
  // This field is only set when the enableProfilerTimer flag is enabled.
  selfBaseDuration?: number;
  // Sum of base times for all descendants of this Fiber.
  // This value bubbles up during the "complete" phase.
  // This field is only set when the enableProfilerTimer flag is enabled.
  treeBaseDuration?: number;
  // Conceptual aliases
  // workInProgress : Fiber ->  alternate The alternate used for reuse happens
  // to be the same as work in progress.
  // __DEV__ only
  _debugSource?: Source | null;
  _debugOwner?: Fiber | null;
  _debugIsCurrentlyTiming?: boolean;
  _debugNeedsRemount?: boolean;
  // Used to verify that the order of hooks does not change between renders.
  _debugHookTypes?: Array<HookType> | null;
};

type BaseFiberRootProperties = {
  // The type of root (legacy, batched, concurrent, etc.)
  tag: RootTag;
  // Any additional information from the host associated with this root.
  containerInfo: any;
  // Used only by persistent updates.
  pendingChildren: any;
  // The currently active root fiber. This is the mutable root of the tree.
  current: Fiber;
  pingCache:
    | WeakMap<Wakeable, Set<unknown>>
    | Map<Wakeable, Set<unknown>>
    | null;
  // A finished work-in-progress HostRoot that's ready to be committed.
  finishedWork: Fiber | null;
  // Timeout handle returned by setTimeout. Used to cancel a pending timeout, if
  // it's superseded by a new one.
  timeoutHandle: TimeoutHandle | NoTimeout;
  // Top context object, used by renderSubtreeIntoContainer
  context: Record<string, any> | null;
  pendingContext: Record<string, any> | null;
  // Determines if we should attempt to hydrate on the initial mount
  readonly isDehydrated: boolean;
  // Used by useMutableSource hook to avoid tearing during hydration.
  mutableSourceEagerHydrationData?: unknown; /// Array<MutableSource<any> | MutableSourceVersion> | null;
  // Node returned by Scheduler.scheduleCallback. Represents the next rendering
  // task that the root will work on.
  callbackNode: any;
  callbackPriority: Lane;
  eventTimes: LaneMap<number>;
  expirationTimes: LaneMap<number>;
  pendingLanes: Lanes;
  suspendedLanes: Lanes;
  pingedLanes: Lanes;
  expiredLanes: Lanes;
  mutableReadLanes: Lanes;
  finishedLanes: Lanes;
  entangledLanes: Lanes;
  entanglements: LaneMap<Lanes>;
  pooledCache: Cache | null;
  pooledCacheLanes: Lanes;
  // TODO: In Fizz, id generation is specific to each server config. Maybe we
  // should do this in Fiber, too? Deferring this decision for now because
  // there's no other place to store the prefix except for an internal field on
  // the public createRoot object, which the fiber tree does not currently have
  // a reference to.
  identifierPrefix: string;
  onRecoverableError: null | ((error: unknown) => void);
};
// The following attributes are only used by DevTools and are only present in DEV builds.
// They enable DevTools Profiler UI to show which Fiber(s) scheduled a given commit.
type UpdaterTrackingOnlyFiberRootProperties = {
  memoizedUpdaters: Set<Fiber>;
  pendingUpdatersLaneMap: LaneMap<Set<Fiber>>;
};
type SuspenseHydrationCallbacks = {
  onHydrated?: (suspenseInstance: SuspenseInstance) => void;
  onDeleted?: (suspenseInstance: SuspenseInstance) => void;
};
// The follow fields are only used by enableSuspenseCallback for hydration.
type SuspenseCallbackOnlyFiberRootProperties = {
  hydrationCallbacks: null | SuspenseHydrationCallbacks;
};
// Exported FiberRoot type includes all properties,
// To avoid requiring potentially error-prone :any casts throughout the project.
// The types are defined separately within this file to ensure they stay in sync.
type FiberRoot = BaseFiberRootProperties &
  SuspenseCallbackOnlyFiberRootProperties &
  UpdaterTrackingOnlyFiberRootProperties;

// #endregion

// #region react\packages\react-devtools-shared\src\types.js

// Different types of elements displayed in the Elements tree.
// These types may be used to visually distinguish types,
// or to enable/disable certain functionality.
type ElementType = 1 | 2 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

// Hide all elements of types in this Set.
// We hide host components only by default.
type ElementTypeComponentFilter = {
  isEnabled: boolean;
  type: 1;
  value: ElementType;
};
// Hide all elements with displayNames or paths matching one or more of the RegExps in this Set.
// Path filters are only used when elements include debug source location.
type RegExpComponentFilter = {
  isEnabled: boolean;
  isValid: boolean;
  type: 2 | 3;
  value: string;
};
type BooleanComponentFilter = {
  isEnabled: boolean;
  isValid: boolean;
  type: 4;
};
type ComponentFilter =
  | BooleanComponentFilter
  | ElementTypeComponentFilter
  | RegExpComponentFilter;

type StyleXPlugin = {
  sources: Array<string>;
  resolvedStyles: Record<string, any>;
};
type Plugins = {
  stylex: StyleXPlugin | null;
};

// #endregion

// #region react\packages\react-devtools-shared\src\backend\types.js

type BundleType =
  | 0 // PROD
  | 1;
// DEV
type WorkTag = number;
type NativeType = Record<string, any>;
type RendererID = number;
type Dispatcher = any;
type CurrentDispatcherRef = {
  current: null | Dispatcher;
};
type GetDisplayNameForFiberID = (
  id: number,
  findNearestUnfilteredAncestor?: boolean
) => string | null;
type GetFiberIDForNative = (
  component: NativeType,
  findNearestUnfilteredAncestor?: boolean
) => number | null;
type FindNativeNodesForFiberID = (
  id: number
) => Array<NativeType> | null | undefined;
type ReactProviderType<T> = {
  $$typeof: Symbol | number;
  _context: ReactContext<T>;
};
type Lane = number;
type Lanes = number;
type ReactRenderer = {
  findFiberByHostInstance: (
    hostInstance: NativeType
  ) => Fiber | null | undefined;
  version: string;
  rendererPackageName: string;
  bundleType: BundleType;
  // 16.9+
  overrideHookState?:
    | ((
        fiber: Record<string, any>,
        id: number,
        path: Array<string | number>,
        value: any
      ) => void)
    | null
    | undefined;
  // 17+
  overrideHookStateDeletePath?:
    | ((
        fiber: Record<string, any>,
        id: number,
        path: Array<string | number>
      ) => void)
    | null
    | undefined;
  // 17+
  overrideHookStateRenamePath?:
    | ((
        fiber: Record<string, any>,
        id: number,
        oldPath: Array<string | number>,
        newPath: Array<string | number>
      ) => void)
    | null
    | undefined;
  // 16.7+
  overrideProps?:
    | ((
        fiber: Record<string, any>,
        path: Array<string | number>,
        value: any
      ) => void)
    | null
    | undefined;
  // 17+
  overridePropsDeletePath?:
    | ((fiber: Record<string, any>, path: Array<string | number>) => void)
    | null
    | undefined;
  // 17+
  overridePropsRenamePath?:
    | ((
        fiber: Record<string, any>,
        oldPath: Array<string | number>,
        newPath: Array<string | number>
      ) => void)
    | null
    | undefined;
  // 16.9+
  scheduleUpdate?: ((fiber: Record<string, any>) => void) | null | undefined;
  setSuspenseHandler?:
    | ((shouldSuspend: (fiber: Record<string, any>) => boolean) => void)
    | null
    | undefined;
  // Only injected by React v16.8+ in order to support hooks inspection.
  currentDispatcherRef?: CurrentDispatcherRef;
  // Only injected by React v16.9+ in DEV mode.
  // Enables DevTools to append owners-only component stack to error messages.
  getCurrentFiber?: () => Fiber | null;
  // 17.0.2+
  reconcilerVersion?: string;
  // Uniquely identifies React DOM v15.
  ComponentTree?: any;
  // Present for React DOM v12 (possibly earlier) through v15.
  Mount?: any;
  // Only injected by React v17.0.3+ in DEV mode
  setErrorHandler?:
    | ((
        shouldError: (fiber: Record<string, any>) => boolean | null | undefined
      ) => void)
    | null
    | undefined;
  // Intentionally opaque type to avoid coupling DevTools to different Fast Refresh versions.
  scheduleRefresh?: (...args: Array<any>) => any;
  // 18.0+
  injectProfilingHooks?: (profilingHooks: DevToolsProfilingHooks) => void;
  getLaneLabelMap?: () => Map<Lane, string> | null;
};
type ChangeDescription = {
  context: Array<string> | boolean | null;
  didHooksChange: boolean;
  isFirstMount: boolean;
  props: Array<string> | null;
  state: Array<string> | null;
  hooks?: Array<number> | null;
};
type CommitDataBackend = {
  // Tuple of fiber ID and change description
  changeDescriptions: Array<[number, ChangeDescription]> | null;
  duration: number;
  // Only available in certain (newer) React builds,
  effectDuration: number | null;
  // Tuple of fiber ID and actual duration
  fiberActualDurations: Array<[number, number]>;
  // Tuple of fiber ID and computed "self" duration
  fiberSelfDurations: Array<[number, number]>;
  // Only available in certain (newer) React builds,
  passiveEffectDuration: number | null;
  priorityLevel: string | null;
  timestamp: number;
  updaters: Array<SerializedElement> | null;
};
type ProfilingDataForRootBackend = {
  commitData: Array<CommitDataBackend>;
  displayName: string;
  // Tuple of Fiber ID and base duration
  initialTreeBaseDurations: Array<[number, number]>;
  rootID: number;
};
// Profiling data collected by the renderer interface.
// This information will be passed to the frontend and combined with info it collects.
type ProfilingDataBackend = {
  dataForRoots: Array<ProfilingDataForRootBackend>;
  rendererID: number;
  timelineData: unknown; // TimelineDataExport | null;
};
type PathFrame = {
  key: string | null;
  index: number;
  displayName: string | null;
};
type PathMatch = {
  id: number;
  isFullMatch: boolean;
};
type SerializedElement = {
  displayName: string | null;
  id: number;
  key: number | string | null;
  type: ElementType;
};
type InspectedElement = {
  id: number;
  displayName: string | null;
  // Does the current renderer support editable hooks and function props?
  canEditHooks: boolean;
  canEditFunctionProps: boolean;
  // Does the current renderer support advanced editing interface?
  canEditHooksAndDeletePaths: boolean;
  canEditHooksAndRenamePaths: boolean;
  canEditFunctionPropsDeletePaths: boolean;
  canEditFunctionPropsRenamePaths: boolean;
  // Is this Error, and can its value be overridden now?
  canToggleError: boolean;
  isErrored: boolean;
  targetErrorBoundaryID: number | null | undefined;
  // Is this Suspense, and can its value be overridden now?
  canToggleSuspense: boolean;
  // Can view component source location.
  canViewSource: boolean;
  // Does the component have legacy context attached to it.
  hasLegacyContext: boolean;
  // Inspectable properties.
  context: Record<string, any> | null;
  hooks: Record<string, any> | null;
  props: Record<string, any> | null;
  state: Record<string, any> | null;
  key: number | string | null;
  errors: Array<[string, number]>;
  warnings: Array<[string, number]>;
  // List of owners
  owners: Array<SerializedElement> | null;
  // Location of component in source code.
  source: Source | null;
  type: ElementType;
  // Meta information about the root this element belongs to.
  rootType: string | null;
  // Meta information about the renderer that created this element.
  rendererPackageName: string | null;
  rendererVersion: string | null;
  // UI plugins/visualizations for the inspected element.
  plugins: Plugins;
};
const InspectElementErrorType = "error";
const InspectElementFullDataType = "full-data";
const InspectElementNoChangeType = "no-change";
const InspectElementNotFoundType = "not-found";
type InspectElementError = {
  id: number;
  responseID: number;
  type: typeof InspectElementErrorType;
  message: string;
  stack: string;
};
type InspectElementFullData = {
  id: number;
  responseID: number;
  type: typeof InspectElementFullDataType;
  value: InspectedElement;
};
type InspectElementHydratedPath = {
  id: number;
  responseID: number;
  type: "hydrated-path";
  path: Array<string | number>;
  value: any;
};
type InspectElementNoChange = {
  id: number;
  responseID: number;
  type: typeof InspectElementNoChangeType;
};
type InspectElementNotFound = {
  id: number;
  responseID: number;
  type: typeof InspectElementNotFoundType;
};
type InspectedElementPayload =
  | InspectElementError
  | InspectElementFullData
  | InspectElementHydratedPath
  | InspectElementNoChange
  | InspectElementNotFound;
type InstanceAndStyle = {
  instance: Record<string, any> | null;
  style: Record<string, any> | null;
};
type Type = "props" | "hooks" | "state" | "context";
type RendererInterface = {
  cleanup: () => void;
  clearErrorsAndWarnings: () => void;
  clearErrorsForFiberID: (id: number) => void;
  clearWarningsForFiberID: (id: number) => void;
  copyElementPath: (id: number, path: Array<string | number>) => void;
  deletePath: (
    type: Type,
    id: number,
    hookID: number | null | undefined,
    path: Array<string | number>
  ) => void;
  findNativeNodesForFiberID: FindNativeNodesForFiberID;
  flushInitialOperations: () => void;
  getBestMatchForTrackedPath: () => PathMatch | null;
  getFiberIDForNative: GetFiberIDForNative;
  getDisplayNameForFiberID: GetDisplayNameForFiberID;
  getInstanceAndStyle(id: number): InstanceAndStyle;
  getProfilingData(): ProfilingDataBackend;
  getOwnersList: (id: number) => Array<SerializedElement> | null;
  getPathForElement: (id: number) => Array<PathFrame> | null;
  handleCommitFiberRoot: (
    fiber: Record<string, any>,
    commitPriority?: number
  ) => void;
  handleCommitFiberUnmount: (fiber: Record<string, any>) => void;
  handlePostCommitFiberRoot: (fiber: Record<string, any>) => void;
  inspectElement: (
    requestID: number,
    id: number,
    inspectedPaths: Record<string, any>,
    forceFullData: boolean
  ) => InspectedElementPayload;
  logElementToConsole: (id: number) => void;
  overrideError: (id: number, forceError: boolean) => void;
  overrideSuspense: (id: number, forceFallback: boolean) => void;
  overrideValueAtPath: (
    type: Type,
    id: number,
    hook: number | null | undefined,
    path: Array<string | number>,
    value: any
  ) => void;
  patchConsoleForStrictMode: () => void;
  prepareViewAttributeSource: (
    id: number,
    path: Array<string | number>
  ) => void;
  prepareViewElementSource: (id: number) => void;
  renamePath: (
    type: Type,
    id: number,
    hookID: number | null | undefined,
    oldPath: Array<string | number>,
    newPath: Array<string | number>
  ) => void;
  renderer: ReactRenderer | null;
  setTraceUpdatesEnabled: (enabled: boolean) => void;
  setTrackedPath: (path: Array<PathFrame> | null) => void;
  startProfiling: (recordChangeDescriptions: boolean) => void;
  stopProfiling: () => void;
  storeAsGlobal: (
    id: number,
    path: Array<string | number>,
    count: number
  ) => void;
  unpatchConsoleForStrictMode: () => void;
  updateComponentFilters: (componentFilters: Array<ComponentFilter>) => void; // Timeline profiler interface
};
type Handler = (data: any) => void;
// Renderers use these APIs to report profiling data to DevTools at runtime.
// They get passed from the DevTools backend to the reconciler during injection.
type DevToolsProfilingHooks = {
  // Scheduling methods:
  markRenderScheduled: (lane: Lane) => void;
  markStateUpdateScheduled: (fiber: Fiber, lane: Lane) => void;
  markForceUpdateScheduled: (fiber: Fiber, lane: Lane) => void;
  // Work loop level methods:
  markRenderStarted: (lanes: Lanes) => void;
  markRenderYielded: () => void;
  markRenderStopped: () => void;
  markCommitStarted: (lanes: Lanes) => void;
  markCommitStopped: () => void;
  markLayoutEffectsStarted: (lanes: Lanes) => void;
  markLayoutEffectsStopped: () => void;
  markPassiveEffectsStarted: (lanes: Lanes) => void;
  markPassiveEffectsStopped: () => void;
  // Fiber level methods:
  markComponentRenderStarted: (fiber: Fiber) => void;
  markComponentRenderStopped: () => void;
  markComponentErrored: (
    fiber: Fiber,
    thrownValue: unknown,
    lanes: Lanes
  ) => void;
  markComponentSuspended: (
    fiber: Fiber,
    wakeable: Wakeable,
    lanes: Lanes
  ) => void;
  markComponentLayoutEffectMountStarted: (fiber: Fiber) => void;
  markComponentLayoutEffectMountStopped: () => void;
  markComponentLayoutEffectUnmountStarted: (fiber: Fiber) => void;
  markComponentLayoutEffectUnmountStopped: () => void;
  markComponentPassiveEffectMountStarted: (fiber: Fiber) => void;
  markComponentPassiveEffectMountStopped: () => void;
  markComponentPassiveEffectUnmountStarted: (fiber: Fiber) => void;
  markComponentPassiveEffectUnmountStopped: () => void;
};

type DevToolsHook = {
  listeners: Record<string, Array<Handler>>;
  rendererInterfaces: Map<RendererID, RendererInterface>;
  renderers: Map<RendererID, ReactRenderer>;
  emit: (event: string, data: any) => void;
  getFiberRoots: (rendererID: RendererID) => Set<FiberRoot>;
  inject: (renderer: ReactRenderer) => number | null;
  on: (event: string, handler: Handler) => void;
  off: (event: string, handler: Handler) => void;
  reactDevtoolsAgent?: Record<string, any> | null | undefined;
  sub: (event: string, handler: Handler) => () => void;
  // Used by react-native-web and Flipper/Inspector
  resolveRNStyle?: ResolveNativeStyle;
  nativeStyleEditorValidAttributes?: ReadonlyArray<string>;
  // React uses these methods.
  checkDCE: (fn: (...args: Array<any>) => any) => void;
  onCommitFiberUnmount: (rendererID: RendererID, root: FiberRoot) => void;
  onCommitFiberRoot: (
    rendererID: RendererID,
    root: FiberRoot, // Added in v16.9 to support Profiler priority labels
    commitPriority?: number, // Added in v16.9 to support Fast Refresh
    didError?: boolean
  ) => void;
  // Timeline internal module filtering
  getInternalModuleRanges: () => Array<[string, string]>;
  registerInternalModuleStart: (moduleStartError: Error) => void;
  registerInternalModuleStop: (moduleStopError: Error) => void;
  // Testing
  dangerous_setTargetConsoleForTesting?: (
    fakeConsole: Record<string, any>
  ) => void;

  // This is a legacy flag.
  // React v16 checks the hook for this to ensure DevTools is new enough.
  supportsFiber?: boolean;

  // from react-refresh
  onScheduleFiberRoot?: (
    id: number,
    root: FiberRoot,
    children: ReactNode
  ) => void;
};

// #endregion

export type ReactDevToolsHook = DevToolsHook;
export type ReactFiberRoot = FiberRoot;
export type ReactFiber = Fiber;
