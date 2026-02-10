declare namespace React {
  type ReactNode = any;
  type Key = string | number;
  type SetStateAction<S> = S | ((prevState: S) => S);
  type Dispatch<A> = (value: A) => void;

  interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  interface FormEvent<T = Element> {
    preventDefault(): void;
    target: T;
  }

  interface ChangeEvent<T = Element> {
    target: T;
  }

  interface FC<P = {}> {
    (props: P): any;
  }

  function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly unknown[]): T;
  function useRef<T>(initialValue: T): { current: T };
  interface Context<T> {
    Provider: any;
    Consumer: any;
    _defaultValue?: T;
  }

  function createContext<T>(defaultValue: T): Context<T>;
  function useContext<T>(context: Context<T>): T;
}

declare module "react" {
  export = React;
  export as namespace React;
}

declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    render(children: any): void;
    unmount(): void;
  };
}

declare module "react/jsx-runtime" {
  export const Fragment: any;
  export function jsx(type: any, props: any, key?: React.Key): any;
  export function jsxs(type: any, props: any, key?: React.Key): any;
}

declare module "react-router-dom" {
  export const HashRouter: React.FC<{ children?: React.ReactNode }>;
  export const BrowserRouter: React.FC<{ children?: React.ReactNode }>;
  export const Navigate: React.FC<any>;
  export const NavLink: React.FC<any>;
  export const Outlet: React.FC<any>;
  export const Route: React.FC<any>;
  export const Routes: React.FC<any>;
  export function useNavigate(): (to: string, options?: any) => void;
  export function useLocation(): { pathname: string };
  export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T;
}

declare module "vitest" {
  export const describe: any;
  export const it: any;
  export const test: any;
  export const expect: any;
  export const beforeEach: any;
  export const afterEach: any;
  export const vi: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

interface ImportMeta {
  readonly env: Record<string, string | undefined>;
}
