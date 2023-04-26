import { JSX, FunctionalComponent } from "preact";
import registerCustomElement from "@teamhanko/preact-custom-element";
import AppProvider from "./contexts/AppProvider";
import { Hanko } from "@teamhanko/hanko-frontend-sdk";
import { defaultTranslations, Translations } from "./Translations";

interface AdditionalProps {}

export interface HankoAuthAdditionalProps extends AdditionalProps {
  experimental?: string;
}

export interface HankoProfileAdditionalProps extends AdditionalProps {}

declare interface HankoAuthElementProps
  extends JSX.HTMLAttributes<HTMLElement>,
    HankoAuthAdditionalProps {}

declare interface HankoProfileElementProps
  extends JSX.HTMLAttributes<HTMLElement>,
    HankoProfileAdditionalProps {}

declare global {
  // eslint-disable-next-line no-unused-vars
  namespace JSX {
    // eslint-disable-next-line no-unused-vars
    interface IntrinsicElements {
      "hanko-auth": HankoAuthElementProps;
      "hanko-profile": HankoProfileElementProps;
    }
  }
}

export const HankoAuth = (props: HankoAuthElementProps) => (
  <AppProvider
    componentName={"auth"}
    {...props}
    hanko={hanko}
    translations={translations}
  />
);

export const HankoProfile = (props: HankoProfileElementProps) => (
  <AppProvider
    componentName={"profile"}
    {...props}
    hanko={hanko}
    translations={translations}
  />
);

export interface RegisterOptions {
  api: string;
  shadow?: boolean;
  injectStyles?: boolean;
  translations: Partial<Translations>;
}

interface InternalRegisterOptions extends RegisterOptions {
  tagName: string;
  entryComponent: FunctionalComponent<HankoAuthAdditionalProps>;
  observedAttributes: string[];
}

let hanko: Hanko;
let translations: Translations;

interface ElementsRegisterReturn {
  hanko: Hanko;
}

const _register = async ({
  tagName,
  entryComponent,
  shadow = true,
  injectStyles = true,
  observedAttributes,
}: InternalRegisterOptions) => {
  if (!customElements.get(tagName)) {
    registerCustomElement(entryComponent, tagName, observedAttributes, {
      shadow,
    });
  }

  if (injectStyles) {
    await customElements.whenDefined(tagName);
    const elements = document.getElementsByTagName(tagName);
    const styles = window._hankoStyle;

    Array.from(elements).forEach((element) => {
      if (shadow) {
        const clonedStyles = styles.cloneNode(true);
        element.shadowRoot.appendChild(clonedStyles);
      } else {
        element.appendChild(styles);
      }
    });
  }
};

export const register = async (
  options: RegisterOptions
): Promise<ElementsRegisterReturn> => {
  createHankoClient(options.api);
  console.log("here", createTranslations(options.translations));

  await Promise.all([
    _register({
      ...options,
      tagName: "hanko-auth",
      entryComponent: HankoAuth,
      observedAttributes: ["api", "lang", "experimental"],
    }),
    _register({
      ...options,
      tagName: "hanko-profile",
      entryComponent: HankoProfile,
      observedAttributes: ["api", "lang"],
    }),
  ]);

  return { hanko };
};

export const createHankoClient = (api: string) => {
  if (!hanko || hanko.api !== api) {
    hanko = new Hanko(api);
  }
  return hanko;
};

function deepMerge<T>(obj1: T, obj2: Partial<T>): T {
  const mergedObject = {} as T;

  for (const key in obj1) {
    if (Object.prototype.hasOwnProperty.call(obj1, key)) {
      const value1 = obj1[key];
      const value2 = obj2[key];

      if (
        typeof value1 === "object" &&
        value1 !== null &&
        typeof value2 === "object" &&
        value2 !== null
      ) {
        mergedObject[key] = deepMerge(value1, value2);
      } else {
        mergedObject[key] = value1;
      }
    }
  }

  for (const key in obj2) {
    if (Object.prototype.hasOwnProperty.call(obj2, key)) {
      const value1 = obj1[key];
      const value2 = obj2[key];

      if (typeof value1 === "undefined") {
        mergedObject[key] = value2;
      }
    }
  }

  return mergedObject;
}

const createTranslations = (customTranslations: Partial<Translations>) => {
  return (translations = customTranslations
    ? deepMerge(customTranslations, defaultTranslations)
    : defaultTranslations);
};
