// src/web-shims/react-native-svg.js

/**
 * Web shim for react-native-svg
 *
 * Permite que bibliotecas como lucide-react-native funcionem no web
 * usando elementos SVG nativos do browser.
 */

import React from 'react';

// ==========================
// BASE SVG
// ==========================
const Svg = ({
  children,
  width = '100%',
  height = '100%',
  viewBox,
  fill = 'none',
  stroke = 'currentColor',
  color,
  style,
  ...props
}) => {
  return React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width,
      height,
      viewBox,
      fill,
      stroke: stroke || color, // fallback importante
      style: {
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      },
      ...props,
    },
    children
  );
};

// ==========================
// PRIMITIVES
// ==========================
const Path = (props) => React.createElement('path', props);
const Circle = (props) => React.createElement('circle', props);
const Ellipse = (props) => React.createElement('ellipse', props);
const Rect = (props) => React.createElement('rect', props);
const Line = (props) => React.createElement('line', props);
const Polyline = (props) => React.createElement('polyline', props);
const Polygon = (props) => React.createElement('polygon', props);

const G = ({ children, ...props }) =>
  React.createElement('g', props, children);

const Defs = ({ children }) =>
  React.createElement('defs', null, children);

const ClipPath = ({ children, id, ...props }) =>
  React.createElement('clipPath', { id, ...props }, children);

const Mask = ({ children, id, ...props }) =>
  React.createElement('mask', { id, ...props }, children);

const Use = (props) =>
  React.createElement('use', props);

// ==========================
// TEXT
// ==========================
const SvgText = ({ children, ...props }) =>
  React.createElement('text', props, children);

const TSpan = ({ children, ...props }) =>
  React.createElement('tspan', props, children);

const TextPath = ({ children, ...props }) =>
  React.createElement('textPath', props, children);

// ==========================
// GRADIENTS
// ==========================
const Stop = (props) => React.createElement('stop', props);

const LinearGradient = ({ children, ...props }) =>
  React.createElement('linearGradient', props, children);

const RadialGradient = ({ children, ...props }) =>
  React.createElement('radialGradient', props, children);

// ==========================
// OTHER
// ==========================
const ForeignObject = ({ children, ...props }) =>
  React.createElement('foreignObject', props, children);

const Image = (props) =>
  React.createElement('image', props);

const Symbol = ({ children, ...props }) =>
  React.createElement('symbol', props, children);

// ==========================
// EXPORTS
// ==========================
export default Svg;

export {
  Svg,
  Path,
  Circle,
  Ellipse,
  Rect,
  Line,
  Polyline,
  Polygon,
  G,
  Defs,
  ClipPath,
  Mask,
  Use,
  SvgText as Text,
  TSpan,
  TextPath,
  Stop,
  LinearGradient,
  RadialGradient,
  ForeignObject,
  Image,
  Symbol,
};