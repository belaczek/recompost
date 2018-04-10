<img src="https://github.com/adam-stanek/recompost/raw/master/docs/logo.svg" width="400" alt="Recompost">

Typed binding for `recompose`/`recompact` functions with
[fluent interface](https://en.wikipedia.org/wiki/Fluent_interface) builder
pattern.

# Why?

React HoCs are quite common in todays projects, but Typescript at it's current
version (2.8) struggles with inferring generics with variadic arguments (the
`compose()` function). You can learn more about this problem in
[issue 5453](https://github.com/Microsoft/TypeScript/issues/5453)).

This library was build as a workaround to cover the gap before TS catches up. It
doesn't provide any additional functionality to `recompose` but offers
alternative way of specifying component composition which allows TS to correctly
infer types and avoid messing your code with `<any>` or unnecessary interfaces.

# How to use it

Lets start with example:

```.ts
import * as React from 'react'
import { createComposer } from 'recompost'

export interface MyComponentProps {
  name: string
}

const enhance = createComposer<MyComponentProps>()
  .withPropsOnChange(['name'], ({ name }) => ({ salutation: `Hey ${name}!` }))
  .withHandler('handleClick', ({ salutation }) => (e: React.MouseEvent<any>) => {
    e.preventDefault()
    console.log(salutation)
  })
  .build()

export const MyComponent = enhance(({
  salutation,
  handleClick
}) => (
  <a href="#" onClick={handleClick}>{salutation}</a>
))
```

As you can see the usage is not much different from the `compose()` function. The usage starts with function `createComposer<TInitialProps>()` which creates object which is called `ComponentDecoratorBuilder`. This object offers API for chaining common decorators (described later on) and finally the `build()` method. Once called, the `build()` method creates composed component decorator which can be used to wrap a stateless component.

The `MyComponentProps` are initial props of the component (sometimes also called outer props). They are basically the props that you can be passed by the USER of the component.

The call of generated `enhance()` method accept an actual stateless component which will receive props which are result of all applied component decorators. They are applied one by one and each can add, remove or override the props. We call it the resulting props but you may also heard the term inner props or decorated props.

## Adding props

```.ts
// .withProps(props: TAdditionalProps)
// .withProps(createProps: (props: TPreviousProps) => TAdditionalProps)
// .withPropsOnChange(propsToWatch: Array<keyof TPreviousProps>, (props: TPreviousProps) => TAdditionalProps)
// .withPropsOnChange(propsToWatch: (next: TPreviousProps, prev: TPreviousProps) => boolean, (props: TPreviousProps) => TAdditionalProps)

// See the introduction example.
```

Decorator `withProps()` allows to pass additional props either by their call-time value or by creating derived values from component props (either own or created as result of previous decorators).

Decorator `withPropsOnChange()` offers performance optimization for derived prop factories. You can use it for example to sort items or perform other operations which you don't want to run on each render.

## Omitting props

```.tsx
// .omitProps(propsToOmit: Array<keyof TPreviousProps>)

const enhance = createComposer<{ type: string, className: string }>()
  .withProps(({ type, className }) => ({ className: [type && `MyComponent--${type}`, className].filter(c => c).join(' ') }))
  .omitProps('type')
  .build()

const MyComponent = enhance((props) => <div {...props} />)
```

Decorator `omitProps()` allows to drop previously defined props before calling the render function. This may be useful in case you are passing props directly to some DOM component using spread operator. This is convenience only method and it is not supported by Recompose originally. It is generally more favorable to use a destructuring pattern instead, if you can. 

## Default props

```.ts
// .withDefaultProps(defaultProps: Partial<TInitialProps>)

const enhance = createComposer<{ type?: string }>()
  .withDefaultProps({ type: 'DEFAULT' })
  .build()
```

Decorator `withDefaultProps()` defines `defaultProps` static property on *resulting* component. Please be advised that because of this it is possible to only define default props for the actual input props not props created by chained decorators.

As a side-effect this function removes `undefined` type from the resulting defaulted props. This means that the component at the example will retrieve props in shape `{ type: string }` instead of usual `{ type?: string | undefined }` which may help a lot while running TS in strict mode.

## Handlers

```.ts
// .withHandlers({ [k: string]: (props: TPreviousProps) => (...args: any[]) => any)
// .withHandlers(createHandlers: (props: TPreviousProps) => ({ [k: string]: (props: TPreviousProps) => (...args: any[]) => any)
// .withHandler<THandler extends () => any)(name: string, (props: TPreviousProps) => (...args: any[]) => any)

// See the introduction example.
```

Decorator `withHandlers()` allows to define event handlers (or common function) as higher-order functions. This allows the handler to access the current props via closure variable, without needing to change its identity. Handlers are passed to the base component as immutable props, whose identities are preserved across renders. This avoids a common pitfall where functional components create handlers inside the body of the render function, which results in a new function being created on each render which breaks downstream shouldComponentUpdate() optimizations that rely on the prop equality.

The optional variant with handler factory allows to create handlers with local scope variables. This can be used as a replacement for instance variables in class components. Here is an example:

```.ts
const enhance = createComposer<{}>()
  .withHandlers(() => {
    let _lastKnownValue: number

    return {
      handleClick: () => (n: number) => {
        console.log(`Current value: ${n}, last known value ${_lastKnownValue}.`)
        _lastKnownValue = n
      }
    }
  })
  .build()
```

## State

```.ts
// .withState(propName: string, setterPropName: string, initialValue: TState)
// .withState(propName: string, setterPropName: string, initialValueMapper: (props: TPreviousProps) => TState)

const enhance = createComposer<{}>()
  .withState('counter', 'setCounter', 0)
  .withHandler('handleIncrementClick', ({ counter, setCounter }) => (e: React.MouseEvent<any>) => {
    e.preventDefault()
    setCounter(counter + 1)
  })
  .build()

const Counter = enhance(({
  counter,
  handleIncrementClick
}) => (
  <div>
    Current value: {counter}
    <a href="#" onClick={handleIncrementClick}>Increment</a>
  </div>
))
```

Creates two additional props to the base component: a state value, and a function to update that state value. The type of the prop is determined from the passed initial value which may be optionally specified using mapper function from component's props.

Note: The initial value is required for type inference to work. If you want the state to be undefined you can explicitly type it. Ie. as `(number) undefined`.

## Context

```.ts
// .withPropFromContext(contextPropName: string, (contextPropValue: any) => TAdditionalProps)

const enhance = createComposer<{ type?: string }>()
  .withPropFromContext('router', (router: Router) => ({ activeRoute: router.activeRoute }))
  .build()
```

Decorator `withPropFromContext()` allows to retrieve properties passed between components by render context. The function automatically takes care of defining necessary contextTypes for you.

The mapper function allows compiler to determine context type and to create possibly derived properties.

This library doesn't provide any means to actually create/pass context property down the render tree. It is expected that you create class component for this.

## Lifecycle

```.ts
// interface LifecycleMethods {
//   componentWillMount?(): void
//   componentDidMount?(): void
//   componentWillReceiveProps?(nextProps: TResultingProps): void
//   componentWillUpdate?(nextProps: TResultingProps, nextState: any): void
//   componentDidUpdate?(prevProps: TResultingProps, nextState: any): void
//   componentWillUnmount?(): void
// }

// .withLifecycle(lifecycleMethods: LifecycleMethods)

const enhance = createComposer<{ foo: string }>()
  .withLifecycle({
    componentDidMount() {
      console.log(`Component mounted with ${this.props.foo}`)
    }
  })
  .build()
```

Decorator `withLifecycle` allows to specify React component lifecycle method. This decorator is provided to maintain compatibility with Recompact. It is recommended to use an actual class component implementation if you are in need of lifecycle methods.

## Component update optimization

```.ts
// .pure()
// .onlyUpdateForProps(props: Array<keyof TResultingProps>)
// .shouldUpdate(callback: (prevProps: TResultingProps, nextProps: TResultingProps) => boolean)
```

Decorator `pure()` enhances component with `shouldComponentUpdate` lifecycle method which only allows updating component when identity of some prop changed.

Decorator `onlyUpdateForProps()` enhances component with `shouldComponentUpdate` lifecycle method which only allows updating component when identity of mentioned prop changed.

Decorator `shouldUpdate()` enhances component with passed `shouldComponentUpdate` lifecycle method.

## Custom decorators and chaining

```.ts
// .append(anotherComposer: ComponentDecoratorBuilder)
// .withDecorator(decorator: ComponentDecorator)
```

The `append()` allows user to chain multiple composers (without the need to call `build()`). This may be useful for libraries which can combine multiple HoC into single one (like recompact).

The `withDecorator()` allows to enhance component by previously built decorator (or by any other decorator not build by recompost).

You can use the template parameter to specify the type of injected properties. Here is an example:

```.ts
import { injectIntl, InjectedIntl } from 'react-intl'

const enhance = createComposer()
  .withDecorator<{ intl: InjectedIntl }>(injectIntl)
  .build()

const MyComponent = ({ intl: { formatMessage }}) => (
  <div>{formatMessage(...)}</div>
)
```

This can be useful for third-party components. However if you need to use some existing decorators not build by recompose it is recommended to cast the decorators into `ComponentDecorator`. It is a special type which is used by recompost to hold information about prop requirements. It takes 3 parameters:

```.ts
ComponentDecorator<TInitialProps, TAdditionalProps, TOmittedProps>
```

Only the first two parameters are required. The `TInitialProps` parameter can be used to describe prop needs of the decorator. The `TAdditionalProps` describes which props has been added or should be replaced. The last optional parameter `TOmittedProps` allows to specify which props has been dropped. This is necessary for safe decorator chaining.

Here is an example:

```.ts
import { createComposer, ComponentDecorator } from 'recompost'

// This is for demonstrating some legacy code, please do not take this as an example
const someLegacyBadlyTypedDecorator = (component: React.Component<any>) => ({ name, ...props }: any) => React.createElement(component, { ...props, salutation: `Hey, ${name}!` })

// We retype that decorator so that it the .withDecorator can infer what it does it do
// Note: The any cast might not be necessary depending on the actual type of the decorator. This just
// to be on the safe side for the demonstration.
const typedDecorator: ComponentDecorator<
  { name: string },       // It requires `name`
  { salutation: string }, // It produces `salutation`
  'name'                  // It removes `name`
> = someLegacyBadlyTypedDecorator as any

// ------

const enhance = createComposer<{ name: string }>
  .withDecorator(typedDecorator)
  .build()
```

# Credits

My thanks to the @belaczek for the logo :)
