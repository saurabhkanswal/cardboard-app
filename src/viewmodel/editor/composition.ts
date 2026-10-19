/**
 * `<code>` layers: a kit template (e.g. Simple UGC's `captions.jsx`) compiled by the bridge
 * into `(h, Fragment, props) => Graphic`, where `Graphic({time, width, height})` returns a
 * JSX tree. Here `h` builds plain data nodes; the compositor lays them out and draws them.
 */

export interface GraphicNode {
  type: string;
  props: Record<string, unknown>;
  children: GraphicChild[];
}

export type GraphicChild =
  | GraphicNode
  | string
  | number
  | boolean
  | null
  | undefined
  | GraphicChild[];

export interface GraphicFrame {
  /** Seconds since the element's start. */
  time: number;
  width: number;
  height: number;
}

/** A template with its props bound: what the compositor calls per frame. */
export type Graphic = (frame: GraphicFrame) => GraphicChild;

type Component = (props: Record<string, unknown>) => GraphicChild;
type TemplateFactory = (
  h: typeof createNode,
  fragment: Component,
  props: Record<string, unknown>,
) => (frame: GraphicFrame) => GraphicChild;

const Fragment: Component = props => props.children as GraphicChild;

/** The JSX factory: intrinsic tags become data nodes, function components are called. */
function createNode(
  type: string | Component,
  props: Record<string, unknown> | null,
  ...children: GraphicChild[]
): GraphicChild {
  if (typeof type === 'function') {
    return type({...props, children});
  }
  return {type, props: props ?? {}, children};
}

const factories = new Map<string, TemplateFactory>();

/**
 * Evaluates compiled template source once per distinct source. The bridge compiles the
 * kit's own file; the phone never evaluates anything else. Throws if it doesn't evaluate.
 */
function templateFactory(source: string): TemplateFactory {
  let factory = factories.get(source);
  if (!factory) {
    // eslint-disable-next-line no-new-func
    factory = new Function(`return ${source}`)() as TemplateFactory;
    if (typeof factory !== 'function') {
      throw new Error('template did not compile to a factory');
    }
    factories.set(source, factory);
  }
  return factory;
}

/** Binds a template to one element's props. Throws if the template can't be evaluated. */
export function bindGraphic(source: string, props: Record<string, unknown>): Graphic {
  const graphic = templateFactory(source)(createNode, Fragment, props);
  if (typeof graphic !== 'function') {
    throw new Error('template has no default export function');
  }
  return graphic;
}
