declare module "react" {
  export as namespace React;
  export type CSSProperties = Record<string, unknown>;
  export type FormEvent<T = unknown> = { preventDefault: () => void; target: T };
  export type ChangeEvent<T = unknown> = { target: T };
  const React: any;
  export default React;
  export const useState: any;
  export const useEffect: any;
  export const useMemo: any;
  export const useCallback: any;
  export const useRef: any;
  export const useContext: any;
  export const createContext: any;
}

declare module "react-dom/client" {
  export const createRoot: any;
}

declare module "react/jsx-runtime" {
  export const Fragment: any;
  export const jsx: any;
  export const jsxs: any;
}

declare module "react-router-dom" {
  export const BrowserRouter: any;
  export const Navigate: any;
  export const NavLink: any;
  export const Outlet: any;
  export const Route: any;
  export const Routes: any;
  export const useNavigate: any;
  export const useLocation: any;
}

declare module "vitest" {
  export const describe: any;
  export const it: any;
  export const expect: any;
  export const beforeEach: any;
  export const afterEach: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

interface ImportMeta {
  readonly env: Record<string, string | boolean | undefined>;
}
