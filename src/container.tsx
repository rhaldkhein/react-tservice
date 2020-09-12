// tslint:disable variable-name
import React, { useState, useEffect, useContext } from "react";
import {
  default as defaultContainer,
  ICollection,
  IContainer,
  IProvider,
  Container
} from "tservice";

// tslint:disable-next-line
const noop = (function () { })

const ContainerContext = React.createContext<{
  container: IContainer
  redraw?: React.Dispatch<any>
}>({
  container: defaultContainer
});

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface IContProps {
  container: IContainer;
  ready: boolean;
}

export interface IServiceProps<S> {
  /**
   * List of service associated with the component
   */
  services: S;
  /**
   * Exposed provider for convenience
   */
  provider: IProvider;
}

export interface IUpdateProps {
  /**
   * Force update the entire app. Use with caution!
   * @param value cause of update
   */
  update: React.Dispatch<string>;
}

/**
 * Using hook to inject services into a component
 * @param serviceBuilder function
 */
export function useProvider():
  IProvider {

  const { container } = useContext(ContainerContext);
  return container.internalProvider;
}

/**
 * Using hook to inject services into a component
 * @param serviceBuilder function
 */
export function useServices<S>(
  serviceBuilder: (provider: IProvider) => S):
  S {

  const { container } = useContext(ContainerContext);
  const [services] = useState(() => serviceBuilder(container.internalProvider));
  return services;
}

/**
 * Using hook to inject global force update function into a component
 * @param serviceBuilder function
 */
export function useGlobalUpdate():
  React.Dispatch<any> {

  return useContext(ContainerContext).redraw || noop;
}

/**
 * Attach services from container to props
 * @param serviceBuilder
 */
export function mapServices<T extends IServiceProps<S>, S = {}>(
  serviceBuilder: (provider: IProvider) => S):
  (childComponent: React.FC<T>) => React.FC<Omit<T, "provider" | "services">> {

  return (ChildComp: React.FC<T>): React.FC<Omit<T, "provider" | "services">> => {

    return (props: any): any => {
      return <ContainerContext.Consumer>
        {({ container }) => {
          return <ChildComp
            {...props}
            services={serviceBuilder(container.internalProvider)}
            provider={container.internalProvider} />;
        }}
      </ContainerContext.Consumer>;
    };

  };
}

/**
 * Attach a DI container to component
 * @param registry
 * @param start
 * @param container explicit container
 */
export function withContainer<T>(
  registry: (collection: ICollection) => void,
  start?: (container: IContainer) => void,
  container?: IContainer):
  (ChildComponent: React.FC<T>) => React.FC<Partial<T>> {

  const _container = container || new Container();
  _container.build(registry);

  return (ChildComponent: React.FC<T>): any => {
    return (props: any): any => {
      const [ready, setReady] = useState(_container.isReady);
      const [, redraw] = useState<string>("");
      const [contextValue] = useState({ container: _container, redraw });
      useEffect(() => {
        if (!ready) {
          if (start) { start(_container); }
          _container.start().then(() => setReady(_container.isReady));
        }
      }, [ready]);
      return <ContainerContext.Provider
        value={contextValue}>
        <ChildComponent
          {...props}
          container={_container}
          ready={ready} />
      </ContainerContext.Provider>;
    };
  };
}

/**
 * Attach a DI container to component and link to parent container in the tree
 * @param registry
 * @param start
 */
export function withSubContainer<T>(
  registry: (collection: ICollection) => void,
  start?: (container: IContainer) => void):
  (ChildComponent: React.FC<T>) => React.FC<Partial<T>> {

  const subContainer = new Container();

  return (ChildComponentX: React.FC<T>): any => {

    const SubChildComponent = withContainer<T>(
      registry, start, subContainer
    )(ChildComponentX);

    return (): any => {
      return <ContainerContext.Consumer>
        {({ container }) => {
          subContainer.parent(container);
          return <SubChildComponent />;
        }}
      </ContainerContext.Consumer>;
    };

  };
}

export function mockContainer<T>(
  services: { [key: string]: any }):
  (ChildComponent: React.FC<T>) => React.FC<Partial<T>> {

  return (ChildComponent: React.FC<T>): any => {
    return withContainer<T>((collection) => {
      for (const key in services) {
        if (services.hasOwnProperty(key)) {
          const element = services[key];
          collection.add(key, undefined, () => element);
        }
      }
    })(ChildComponent);
  };
}
