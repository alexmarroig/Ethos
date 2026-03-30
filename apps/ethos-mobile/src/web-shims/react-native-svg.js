// Web shim for react-native-svg — implements SVG primitives via native HTML SVG elements.
// lucide-react-native and other icon libraries use these components.
import React from 'react';

const Svg = ({ children, width, height, viewBox, fill, stroke, color, style, ...props }) =>
  React.createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width, height, viewBox, fill, stroke,
    style: { display: 'inline-block', ...style },
    ...props,
  }, children);

const Path = (props) => React.createElement('path', props);
const Circle = (props) => React.createElement('circle', props);
const Ellipse = (props) => React.createElement('ellipse', props);
const Rect = (props) => React.createElement('rect', props);
const Line = (props) => React.createElement('line', props);
const Polyline = (props) => React.createElement('polyline', props);
const Polygon = (props) => React.createElement('polygon', props);
const G = ({ children, ...props }) => React.createElement('g', props, children);
const Defs = ({ children }) => React.createElement('defs', null, children);
const ClipPath = ({ children, id }) => React.createElement('clipPath', { id }, children);
const Mask = ({ children, id, ...props }) => React.createElement('mask', { id, ...props }, children);
const Use = (props) => React.createElement('use', props);
const Text = ({ children, ...props }) => React.createElement('text', props, children);
const TSpan = ({ children, ...props }) => React.createElement('tspan', props, children);
const TextPath = ({ children, ...props }) => React.createElement('textPath', props, children);
const Stop = (props) => React.createElement('stop', props);
const LinearGradient = ({ children, ...props }) => React.createElement('linearGradient', props, children);
const RadialGradient = ({ children, ...props }) => React.createElement('radialGradient', props, children);
const ForeignObject = ({ children, ...props }) => React.createElement('foreignObject', props, children);
const Image = (props) => React.createElement('image', props);
const Symbol = ({ children, ...props }) => React.createElement('symbol', props, children);

export default Svg;
export {
  Svg, Path, Circle, Ellipse, Rect, Line, Polyline, Polygon,
  G, Defs, ClipPath, Mask, Use, Text, TSpan, TextPath,
  Stop, LinearGradient, RadialGradient, ForeignObject, Image, Symbol,
};
