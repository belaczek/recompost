// This is an abstract interface for the fluent HoC builder
// It is implemented separately to provide additional abstraction we can test without any
// ties to actual implementation (recompose, recompact, ...)

import * as React from 'react'

/**
 * Simplified React.SFC
 */
export type DecoratedSFC<P> = (
  props: P & { children?: React.ReactNode },
  context?: any,
) => React.ReactElement<any> | null

/**
 * Simplified React.ComponentClass
 */
export interface DecoratedComponentClass<P> {
  new (props: P, context?: any): React.Component<any, any>
}

/**
 * Simplified component (class or stateless)
 * We use this to help generics with the type (the class is technically still a function
 * + they have common properties - like propTypes, defaultProps, etc. -
 *    so Typescript has a hard time distinguish between them)
 * Also it helps us to get less clutter in the error messages.
 */
export type DecoratedComponent<P> = DecoratedSFC<P> | DecoratedComponentClass<P>

export interface LifecycleMethodsThis<TProps> {
  props: TProps
}

export interface LifecycleMethods<TProps> {
  componentWillMount?: (this: LifecycleMethodsThis<TProps>) => void
  componentDidMount?: (this: LifecycleMethodsThis<TProps>) => void
  componentWillReceiveProps?: (
    this: LifecycleMethodsThis<TProps>,
    nextProps: TProps,
  ) => void
  shouldComponentUpdate?: (
    this: LifecycleMethodsThis<TProps>,
    nextProps: TProps,
    nextState: any,
  ) => boolean
  componentWillUpdate?: (
    this: LifecycleMethodsThis<TProps>,
    nextProps: TProps,
    nextState: any,
  ) => void
  componentDidUpdate?: (
    this: LifecycleMethodsThis<TProps>,
    prevProps: TProps,
    prevState: any,
  ) => void
  componentWillUnmount?: (this: LifecycleMethodsThis<TProps>) => void
  componentDidCatch?: (
    this: LifecycleMethodsThis<TProps>,
    error: Error,
    errorInfo: React.ErrorInfo,
  ) => void
}

/**
 * Fluent interface to allow composition of multiple higher-order components into single decorator.
 * This is an Typescript enabled replacement for compose()
 */
export interface ComponentDecoratorBuilder<
  TInitialProps,
  TResultingProps = TInitialProps,
  TOmittedProps extends string = never,
  TStatic extends {} = {}
> {
  /**
   * Allows to apply custom decorators.
   */
  withDecorator<
    TDR extends {} = {},
    // TDI extends Partial<TResultingProps> = TResultingProps,
    TDO extends string = never,
    TDS extends {} = {}
  >(
    t:
      | GenericComponentDecorator<TDR, TResultingProps>
      | ComponentDecorator<TResultingProps, TDR, TDO, TDS>,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    Pick<TResultingProps, Exclude<keyof TResultingProps, TDO>> & TDR,
    TOmittedProps | TDO,
    TStatic & TDS
  >

  /**
   * Allows apply decorators from another decorator builder
   */
  append<
    TInitialProps2 extends Partial<TResultingProps>,
    TResultingProps2,
    TOmittedProps2 extends string,
    TStatic2 extends {}
  >(
    decoratorBuilder: ComponentDecoratorBuilder<
      TInitialProps2,
      TResultingProps2,
      TOmittedProps2,
      TStatic2
    >,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    Pick<TResultingProps, Exclude<keyof TResultingProps, TOmittedProps2>> &
      TResultingProps2,
    TOmittedProps | TOmittedProps2,
    TStatic & TStatic2
  >

  /**
   * Allows to pass additional props by calculating them from already passed props.
   *
   * Further info: https://neoziro.github.io/recompact/#withpropspropsmapper
   */
  withProps<T3>(
    createProps: (props: TResultingProps) => T3,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps & T3,
    TOmittedProps,
    TStatic
  >

  /**
   * Allows to pass additional props.
   *
   * Further info: https://neoziro.github.io/recompact/#withpropspropsmapper
   */
  withProps<T3>(
    props: T3,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps & T3,
    TOmittedProps,
    TStatic
  >

  /**
   * Similar to withProps(). Allows to create additional props if any of specified existing props changed.
   *
   * Further info: https://neoziro.github.io/recompact/#withpropsonchangeshouldmaporkeys-createprops
   */
  withPropsOnChange<T3>(
    propNames: Array<keyof TResultingProps>,
    createProps: (props: TResultingProps) => T3,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps & T3,
    TOmittedProps,
    TStatic
  >

  /**
   * Similar to withProps(). Allows to create additional props if given callback decides that it should
   * (based on current and previous props).
   *
   * Further info: https://neoziro.github.io/recompact/#withpropsonchangeshouldmaporkeys-createprops
   */
  withPropsOnChange<T3>(
    shouldCreateProps: (
      prevProps: TResultingProps,
      nextProps: TResultingProps,
    ) => boolean,
    createProps: (props: TResultingProps) => T3,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps & T3,
    TOmittedProps,
    TStatic
  >

  /**
   * Sets defaultProps on the resulting component while updating the type definition to see given props as always defined.
   */
  withDefaultProps<T3 extends Partial<TResultingProps>>(
    defaultProps: T3,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    Pick<TResultingProps, Exclude<keyof TResultingProps, keyof T3>> &
      {
        [k in keyof T3]: k extends keyof TResultingProps
          ? Exclude<TResultingProps[k], undefined>
          : never
      },
    TOmittedProps,
    TStatic
  >

  /**
   * Gets value from context and passes it as a prop.
   */
  withPropFromContext<TMappedProps>(
    propName: string,
    createProps: (propValue: any, props: TResultingProps) => TMappedProps,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps & TMappedProps,
    TOmittedProps
  >

  /**
   * Gets value from context and passes it as a prop.
   */
  withPropFromContext<T, TMappedProps>(
    propName: React.Context<T>,
    createProps: (propValue: T, props: TResultingProps) => TMappedProps,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps & TMappedProps,
    TOmittedProps
  >

  /**
   * Prevents any given previously set properties to be passed to base component.
   *
   * Further info: https://neoziro.github.io/recompact/#omitpropspaths
   */
  omitProps<T3 extends keyof TResultingProps>(
    propName: T3 | T3[],
  ): ComponentDecoratorBuilder<
    TInitialProps,
    Pick<TResultingProps, Exclude<keyof TResultingProps, T3>>,
    TOmittedProps | Extract<keyof T3, string>,
    TStatic
  >

  /**
   * Creates two additional props to the base component: a state value, and a function to update that state value.
   * The initial value is created from props by given callback.
   *
   * Further info: https://neoziro.github.io/recompact/#withstatestatename-stateupdatername-initialstate
   */
  withState<T3 extends string, T4 extends string, T5>(
    propName: T3,
    setterPropName: T4,
    initiaValueFromProps: (props: TResultingProps) => T5,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps & { [k in T3]: T5 } & { [k in T4]: (newState: T5) => T5 },
    TOmittedProps,
    TStatic
  >

  /**
   * Creates two additional props to the base component: a state value, and a function to update that state value.
   *
   * Further info: https://neoziro.github.io/recompact/#withstatestatename-stateupdatername-initialstate
   */
  withState<T3 extends string, T4 extends string, T5>(
    propName: T3,
    setterPropName: T4,
    initialValue: T5,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps & { [k in T3]: T5 } & { [k in T4]: (newState: T5) => T5 },
    TOmittedProps,
    TStatic
  >

  /**
   * Creates handler which is passed to component as a prop. It is defined as a higher-order function.
   * This allows the handler to access the current props via closure, without needing to change its signature.
   * Handlers are passed to the base component as immutable props, whose identities are preserved across renders.
   * This avoids a common pitfall where functional components create handlers inside the body of the function,
   * which results in a new handler on every render and breaks downstream shouldComponentUpdate()
   * optimizations that rely on prop equality.
   *
   * Further info: https://neoziro.github.io/recompact/#withhandlershandlerfactories
   */
  // Until the Typescript 2.8 there was no way of inferring the $ObjMap. This function was added as
  // a workaround for this issue. It required developer to define handlers one by one.
  withHandler<T3 extends string, T4 extends Function>(
    handlerName: T3,
    handler: (props: TResultingProps) => T4,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps & { [k in T3]: T4 },
    TOmittedProps,
    TStatic
  >

  /**
   * Takes an object map of handler creators or a factory function. They are defined as higher-order functions.
   * This allows the handler to access the current props via closure, without needing to change its signature.
   * Handlers are passed to the base component as immutable props, whose identities are preserved across renders.
   * This avoids a common pitfall where functional components create handlers inside the body of the function,
   * which results in a new handler on every render and breaks downstream shouldComponentUpdate()
   * optimizations that rely on prop equality.
   */
  withHandlers<
    THandlers extends { [k: string]: (props: TResultingProps) => any }
  >(
    handlers: THandlers | ((initialProps: TResultingProps) => THandlers),
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps & { [K in keyof THandlers]: ReturnType<THandlers[K]> },
    TOmittedProps,
    TStatic
  >

  /**
   * Prevents the component from updating unless a prop corresponding to one of the given keys
   * has updated. Uses shallowEqual() to test for changes.
   * This is a much better optimization than the popular approach of using PureRenderMixin, shouldPureComponentUpdate(), or pure() helper,
   * because those tools compare every prop, whereas onlyUpdateForKeys() only cares about the props that you specify.
   */
  onlyUpdateForProps(
    propNames: Array<keyof TResultingProps>,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps,
    TOmittedProps,
    TStatic
  >

  /**
   * Higher-order component version of shouldComponentUpdate().
   * The test function accepts both the current props and the next props.
   */
  shouldUpdate(
    shouldUpdate: (
      prevProps: TResultingProps,
      nextProps: TResultingProps,
    ) => boolean,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps,
    TOmittedProps,
    TStatic
  >

  /**
   * Allows to register component lifecycle methods like `componentDidMount` etc.
   */
  withLifecycle(
    lifecycleMethods: LifecycleMethods<TResultingProps>,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps,
    TOmittedProps,
    TStatic
  >

  /**
   * Assigns to the displayName property on the base component.
   */
  withDisplayName(
    displayName: string,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps,
    TOmittedProps,
    TStatic & { displayName: string }
  >

  /**
   * Assigns given static properties to the resulting (top-most) component.
   */
  withStatic<TS extends {}>(
    props: TS,
  ): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps,
    TOmittedProps,
    TStatic & TS
  >

  /**
   * Ensures component won't get rerendered unless identity of some prop changes.
   */
  pure(): ComponentDecoratorBuilder<
    TInitialProps,
    TResultingProps,
    TOmittedProps,
    TStatic
  >

  /** Call this to create component decorator. */
  build(): BuiltComponentDecorator<
    TInitialProps,
    TResultingProps,
    TOmittedProps,
    TStatic
  >
}

// This are INNER props
// (they will be received by the component which is being decorated)
export type DecoratedComponentProps<
  TRequiredInitialProps,
  TResultingProps,
  TOmittedProps extends string
> = Pick<
  TRequiredInitialProps,
  Exclude<keyof TRequiredInitialProps, TOmittedProps | keyof TResultingProps>
> &
  TResultingProps

export type Simplify<T> = Pick<T, keyof T>

export abstract class AbstractComponentDecorator<
  TResultingProps,
  TInitialProps,
  TOmittedProps extends string,
  TStaticProps extends {}
> {
  // These are fake properties which allow us to chain decorators. They have no actual
  // runtime value. We just use them to pass static type info.
  private __initialProps!: TInitialProps
  private __omittedProps!: TOmittedProps
  private __resultingProps!: TResultingProps
  private __staticProps!: TStaticProps
}

export interface ComponentDecorator<
  TInitialProps extends {} = any,
  TResultingProps extends {} = {},
  TOmittedProps extends string = never,
  TStatic extends {} = {}
>
  extends AbstractComponentDecorator<
      TResultingProps,
      TInitialProps,
      TOmittedProps,
      TStatic
    >,
    GenericComponentDecorator<TResultingProps, TInitialProps> {}

export interface GenericComponentDecorator<
  TResultingProps extends {} = {},
  TInitialProps extends {} = {}
> {
  (
    component: DecoratedComponent<Simplify<TResultingProps>>,
  ): DecoratedComponent<TInitialProps>
}

export interface BuiltComponentDecorator<
  TInitialProps extends {} = any,
  TResultingProps extends {} = {},
  TOmittedProps extends string = never,
  TStatic extends {} = {}
>
  extends AbstractComponentDecorator<
      TResultingProps,
      Partial<TInitialProps>,
      TOmittedProps,
      TStatic
    > {
  (component: DecoratedComponent<TResultingProps>): React.ComponentClass<
    TInitialProps
  > &
    TStatic
}
